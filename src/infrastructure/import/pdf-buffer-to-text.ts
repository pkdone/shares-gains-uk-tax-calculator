import { PDFParse } from 'pdf-parse';

/**
 * Extracts plain text from a PDF buffer (server-side only).
 */
export async function pdfBufferToText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const textResult = await parser.getText();
    return textResult.text;
  } finally {
    await parser.destroy();
  }
}
