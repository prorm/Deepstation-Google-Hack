import { PDFDocument, rgb } from 'pdf-lib';
import { promises as fs } from 'fs';
import path from 'path';
import fontkit from '@pdf-lib/fontkit'; // Required for custom fonts

export async function generateCertificateBuffer(
  templateBuffer: Buffer, 
  participantName: string, 
  xCoord?: number | null, 
  yCoord?: number | null
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
  const { width, height } = firstPage.getSize();

  const fontSize = 42;
  const textWidth = customFont.widthOfTextAtSize(participantName, fontSize);
  const textHeight = customFont.heightAtSize(fontSize);

  // If x/y aren't exactly defined, default to middle of page
  const finalX = (xCoord != null && xCoord !== 0) ? xCoord : (width / 2 - textWidth / 2);
  const finalY = (yCoord != null && yCoord !== 0) ? yCoord : (height / 2 - textHeight / 2);

  // Draw the text using the custom font
  firstPage.drawText(participantName, {
    x: finalX,
    y: finalY,
    size: fontSize,
    font: customFont, // Apply the font here
    color: rgb(1, 1, 1), // 1, 1, 1 represents pure White in pdf-lib
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}