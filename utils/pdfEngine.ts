import { PDFDocument, rgb } from 'pdf-lib';
import { promises as fs } from 'fs';
import path from 'path';
import fontkit from '@pdf-lib/fontkit'; // Required for custom fonts

export async function generateCertificateBuffer(
  templateBuffer: Buffer, 
  participantName: string, 
  xCoord: number, 
  yCoord: number
): Promise<Buffer> {
  
  const pdfDoc = await PDFDocument.load(templateBuffer);
  
  // Register fontkit to handle .ttf / .otf files
  pdfDoc.registerFontkit(fontkit);

  // Safely resolve the path to your bundled font
  const fontPath = path.join(process.cwd(), 'public/fonts/Montserrat-Bold.ttf');
  
  // Read the font from the local filesystem instantly
  const fontBytes = await fs.readFile(fontPath);
  
  // Embed the custom font into the document
  const customFont = await pdfDoc.embedFont(fontBytes);

  const pages = pdfDoc.getPages();
  const firstPage = pages[0];

  // Draw the text using the custom font
  firstPage.drawText(participantName, {
    x: xCoord,
    y: yCoord,
    size: 42,
    font: customFont, // Apply the font here
    color: rgb(0, 0, 0),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}