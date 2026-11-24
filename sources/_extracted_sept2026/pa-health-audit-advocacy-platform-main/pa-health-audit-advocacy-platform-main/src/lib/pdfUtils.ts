/**
 * Utility functions for pdf-lib forensic document operations
 */
export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
export async function fetchTemplateBytes(url?: string): Promise<Uint8Array | null> {
  if (!url) return null;
  try {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  } catch (error) {
    console.error("Failed to fetch PDF template", error);
    return null;
  }
}
export function calculateTextWrap(text: string, maxWidth: number, fontSize: number): string[] {
  // Rough estimation for standard helvetica: character width is approx 0.5 of font size
  const charWidth = fontSize * 0.5;
  const maxCharsPerLine = Math.floor(maxWidth / charWidth);
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = "";
  words.forEach(word => {
    if ((currentLine + word).length > maxCharsPerLine) {
      lines.push(currentLine.trim());
      currentLine = word + " ";
    } else {
      currentLine += word + " ";
    }
  });
  lines.push(currentLine.trim());
  return lines;
}