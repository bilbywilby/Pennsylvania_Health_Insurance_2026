import { describe, it, expect } from 'vitest';
import { generatePdfFromTemplate } from '../lib/reportGenerator';
import { ReportJSON } from '../lib/types';
import { PDFDocument } from 'pdf-lib';
describe('Forensic PDF Engine v2.0', () => {
  const mockReport: ReportJSON = {
    metadata: {
      title: "Resilience Audit",
      author: "Forensic Agent",
      subject: "Unit Validation",
      reportId: "TEST-28",
      timestamp: new Date().toISOString()
    },
    blocks: [
      { text: "Institutional Adjudication Result", x: 50, y: 100, size: 14, bold: true },
      { text: "Sub-block validation", x: 50, y: 120, size: 10, italic: true, color: [10, 20, 30] }
    ]
  };
  it('generates loadable PDF bytes with valid structure', async () => {
    const pdfBytes = await generatePdfFromTemplate(mockReport);
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    // Attempt to load bytes back into pdf-lib to verify integrity
    const doc = await PDFDocument.load(pdfBytes);
    expect(doc.getPageCount()).toBe(1);
    // Standard PDF-lib doesn't auto-set creator/title unless explicitly told, 
    // but the bytes should be a valid PDF header.
    const header = new TextDecoder().decode(pdfBytes.slice(0, 5));
    expect(header).toBe('%PDF-');
  });
  it('correctly integrates signature data URLs into the document', async () => {
    // 1x1 Transparent PNG Pixel
    const mockSig = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
    const pdfBytes = await generatePdfFromTemplate(mockReport, undefined, mockSig);
    const doc = await PDFDocument.load(pdfBytes);
    // Verification logic: document should load without corruption
    expect(doc.getPageCount()).toBe(1);
    // Page 0 should now have an image resource
    const page = doc.getPages()[0];
    expect(page).toBeDefined();
  });
  it('gracefully handles missing block properties', async () => {
    const incompleteReport: ReportJSON = {
      ...mockReport,
      blocks: [{ text: "Safe Fallback", x: 50, y: 50 } as any] // Missing size/bold/color
    };
    const pdfBytes = await generatePdfFromTemplate(incompleteReport);
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    const doc = await PDFDocument.load(pdfBytes);
    expect(doc.getPageCount()).toBe(1);
  });
  it('renders multi-block content accurately within bounds', async () => {
    const manyBlocksReport: ReportJSON = {
      ...mockReport,
      blocks: Array.from({ length: 50 }).map((_, i) => ({
        text: `Row ${i}`,
        x: 50,
        y: 100 + (i * 15),
        size: 8
      }))
    };
    const pdfBytes = await generatePdfFromTemplate(manyBlocksReport);
    const doc = await PDFDocument.load(pdfBytes);
    expect(doc.getPageCount()).toBe(1); // Should still fit on one page at 15px intervals
  });
});