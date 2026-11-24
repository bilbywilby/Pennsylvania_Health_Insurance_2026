import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { ReportJSON } from './types';
import { dataUrlToUint8Array } from './pdfUtils';
export interface AuditReportData {
  title: string;
  summary: string;
  riskAssessment: string;
  ratingAreaId: string;
  directives: string[];
  findings?: Array<{ label: string; value: string }>;
}
export async function generatePdfFromTemplate(
  report: ReportJSON,
  templateBytes?: Uint8Array,
  signatureDataUrl?: string
): Promise<Uint8Array> {
  let pdfDoc: PDFDocument;
  try {
    if (templateBytes) {
      pdfDoc = await PDFDocument.load(templateBytes);
    } else {
      pdfDoc = await PDFDocument.create();
    }
  } catch (err) {
    console.error("PDF creation/load failed, starting fresh buffer.", err);
    pdfDoc = await PDFDocument.create();
  }
  pdfDoc.registerFontkit(fontkit);
  // Load fonts with robust fallbacks
  let helveticaFont;
  let helveticaBold;
  let helveticaItalic;
  let helveticaBoldItalic;
  try {
    helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    helveticaItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    helveticaBoldItalic = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
  } catch (err) {
    console.warn("Standard fonts failed to embed, falling back to Times Roman.", err);
    helveticaFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    helveticaBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    helveticaItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
    helveticaBoldItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);
  }
  const page = pdfDoc.getPages()[0] || pdfDoc.addPage([595.28, 841.89]);
  const { height } = page.getSize();
  // Header Title
  page.drawText(report.metadata.title, {
    x: 50,
    y: height - 60,
    size: 20,
    font: helveticaBold,
    color: rgb(0.05, 0.09, 0.2),
  });
  // Render Data Blocks
  for (const block of report.blocks) {
    try {
      if (!block.text) continue;
      let font = helveticaFont;
      if (block.bold && block.italic) font = helveticaBoldItalic;
      else if (block.bold) font = helveticaBold;
      else if (block.italic) font = helveticaItalic;
      const colorArr = block.color ?? [0, 0, 0];
      const color = rgb(
        Math.max(0, Math.min(1, colorArr[0] / 255)),
        Math.max(0, Math.min(1, colorArr[1] / 255)),
        Math.max(0, Math.min(1, colorArr[2] / 255))
      );
      const size = Number(block.size) || 10;
      const lineHeight = Number(block.lineHeight) || size * 1.2;
      page.drawText(block.text, {
        x: Number(block.x) || 50,
        y: height - (Number(block.y) || 100),
        size,
        font,
        color,
        maxWidth: block.maxWidth ? Number(block.maxWidth) : undefined,
        lineHeight
      });
    } catch (e) {
      console.warn(`PDF Block Rendering Exception [Block: ${block.text}]:`, e);
    }
  }
  // Embed Signature if provided
  if (signatureDataUrl) {
    try {
      const sigImageBytes = dataUrlToUint8Array(signatureDataUrl);
      const isPng = signatureDataUrl.toLowerCase().includes('image/png');
      const sigImage = isPng ? await pdfDoc.embedPng(sigImageBytes) : await pdfDoc.embedJpg(sigImageBytes);
      const targetWidth = 120;
      const sigDims = sigImage.scale(targetWidth / sigImage.width);
      page.drawImage(sigImage, {
        x: 50,
        y: 80,
        width: sigDims.width,
        height: sigDims.height,
      });
      page.drawText(`Authorized Forensic Record: ${report.metadata.reportId}`, {
        x: 50,
        y: 65,
        size: 7,
        font: helveticaItalic,
        color: rgb(0.5, 0.5, 0.5),
      });
    } catch (e) {
      console.error("Critical Signature Embedding Failure:", e);
      // We don't throw here to allow the rest of the report to be salvaged, 
      // but in a strict forensic mode we might want to.
    }
  }
  return await pdfDoc.save();
}
export async function generateAuditPDF(data: AuditReportData): Promise<{ blob: Blob, url: string, fileName: string }> {
  const report: ReportJSON = {
    metadata: {
      title: data.title,
      author: "PA Health Audit Platform",
      subject: "Forensic Audit",
      reportId: `AUD-${Math.random().toString(36).substring(7).toUpperCase()}`,
      timestamp: new Date().toISOString()
    },
    blocks: [
      { text: "EXECUTIVE SUMMARY", x: 50, y: 120, size: 12, bold: true },
      { text: data.summary, x: 50, y: 140, size: 10, maxWidth: 500 },
      { text: "RISK ASSESSMENT", x: 50, y: 220, size: 12, bold: true },
      { text: data.riskAssessment, x: 50, y: 240, size: 10, maxWidth: 500 },
      { text: "STRATEGIC DIRECTIVES", x: 50, y: 300, size: 12, bold: true },
      ...data.directives.map((d, i) => ({ text: `• ${d}`, x: 60, y: 320 + (i * 20), size: 10, maxWidth: 480 }))
    ]
  };
  const pdfBytes = await generatePdfFromTemplate(report);
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const fileName = `${data.title.replace(/\s+/g, '-')}.pdf`;
  return { blob, url, fileName };
}