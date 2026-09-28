import { PDFDocument, rgb, PDFFont } from 'pdf-lib';
import { promises as fs } from 'fs';
import path from 'path';
import fontkit from '@pdf-lib/fontkit';

export interface TemplateConfig {
  file: string;
  name: {
    y: number; // PDF y coordinate from bottom
    centerX: number;
    maxWidth: number;
    fontSize: number;
  };
  usn?: {
    y: number;
    centerX: number;
    maxWidth: number;
    fontSize: number;
  };
  team?: {
    y: number;
    centerX: number;
    maxWidth: number;
    fontSize: number;
  };
}

export const TEMPLATE_CONFIGS: Record<string, TemplateConfig> = {
  // Sovereign AI Track
  'sovereign_ai': {
    file: 'sovereign_ai.png',
    name: { y: 1414 - 637 + 14, centerX: 1046.5, maxWidth: 1050, fontSize: 46 },
    usn: { y: 1414 - 764 + 10, centerX: 766, maxWidth: 330, fontSize: 26 },
    team: { y: 1414 - 770 + 10, centerX: 1475, maxWidth: 410, fontSize: 26 },
  },
  // Wellness and Lifestyle Track
  'wellness_and_lifestyle': {
    file: 'wellness_and_lifestyle.png',
    name: { y: 1414 - 637 + 14, centerX: 1046.5, maxWidth: 1050, fontSize: 46 },
    usn: { y: 1414 - 764 + 10, centerX: 766, maxWidth: 330, fontSize: 26 },
    team: { y: 1414 - 770 + 10, centerX: 1475, maxWidth: 410, fontSize: 26 },
  },
  // Cybersecurity and Defense Track
  'cybersecurity_and_defense': {
    file: 'cybersecurity_and_defense.png',
    name: { y: 1414 - 637 + 14, centerX: 1046.5, maxWidth: 1050, fontSize: 46 },
    usn: { y: 1414 - 764 + 10, centerX: 766, maxWidth: 330, fontSize: 26 },
    team: { y: 1414 - 770 + 10, centerX: 1475, maxWidth: 410, fontSize: 26 },
  },
  // Open Innovation Track
  'open_innovation': {
    file: 'open_innovation.png',
    name: { y: 1414 - 637 + 14, centerX: 1046.5, maxWidth: 1050, fontSize: 46 },
    usn: { y: 1414 - 764 + 10, centerX: 766, maxWidth: 330, fontSize: 26 },
    team: { y: 1414 - 770 + 10, centerX: 1475, maxWidth: 410, fontSize: 26 },
  },
  // Volunteer Certificate
  'volunteer': {
    file: 'volunteer.png',
    name: { y: 1414 - 597 + 14, centerX: 1056, maxWidth: 1050, fontSize: 46 },
    usn: { y: 1414 - 725 + 10, centerX: 804, maxWidth: 330, fontSize: 26 },
    team: { y: 1414 - 731 + 10, centerX: 1452.5, maxWidth: 380, fontSize: 26 },
  },
  // Judge Appreciation Certificate
  'judge': {
    file: 'judge.png',
    name: { y: 1414 - 697 + 14, centerX: 1046.5, maxWidth: 1050, fontSize: 46 },
  },
};

// Aliases for track numbers 1-6
TEMPLATE_CONFIGS['1'] = TEMPLATE_CONFIGS['sovereign_ai'];
TEMPLATE_CONFIGS['2'] = TEMPLATE_CONFIGS['wellness_and_lifestyle'];
TEMPLATE_CONFIGS['3'] = TEMPLATE_CONFIGS['cybersecurity_and_defense'];
TEMPLATE_CONFIGS['4'] = TEMPLATE_CONFIGS['open_innovation'];
TEMPLATE_CONFIGS['5'] = TEMPLATE_CONFIGS['volunteer'];
TEMPLATE_CONFIGS['6'] = TEMPLATE_CONFIGS['judge'];

/**
 * Maps track name, category, or design number to a template configuration.
 */
export function resolveDesignTemplate(trackOrDesign?: string | number | null): TemplateConfig {
  if (!trackOrDesign) {
    return TEMPLATE_CONFIGS['sovereign_ai'];
  }

  const raw = String(trackOrDesign).trim().toLowerCase();

  if (raw === '1' || raw.includes('sovereign')) {
    return TEMPLATE_CONFIGS['sovereign_ai'];
  }
  if (raw === '2' || raw.includes('wellness') || raw.includes('lifestyle')) {
    return TEMPLATE_CONFIGS['wellness_and_lifestyle'];
  }
  if (raw === '3' || raw.includes('cyber') || raw.includes('defense') || raw.includes('defence')) {
    return TEMPLATE_CONFIGS['cybersecurity_and_defense'];
  }
  if (raw === '4' || raw.includes('open') || raw.includes('innovation')) {
    return TEMPLATE_CONFIGS['open_innovation'];
  }
  if (raw === '5' || raw.includes('volunteer') || raw.includes('organizer') || raw.includes('crew')) {
    return TEMPLATE_CONFIGS['volunteer'];
  }
  if (raw === '6' || raw.includes('judge') || raw.includes('appreciation') || raw.includes('jury')) {
    return TEMPLATE_CONFIGS['judge'];
  }

  return TEMPLATE_CONFIGS['sovereign_ai'];
}

/**
 * Finds the image or template file from Participation_volunteer_certificate.
 */
export async function getTemplateBuffer(fileName: string): Promise<Buffer> {
  const possibleFolders = [
    path.join(process.cwd(), 'Participation_volunteer_certificate'),
    path.join(process.cwd(), 'public'),
  ];

  for (const folder of possibleFolders) {
    try {
      const fullPath = path.join(folder, fileName);
      return await fs.readFile(fullPath);
    } catch {
      // try next
    }
  }

  throw new Error(`Template file "${fileName}" not found in Participation_volunteer_certificate.`);
}

function fitText(font: PDFFont, text: string, initialSize: number, maxWidth: number, minSize = 14) {
  let size = initialSize;
  let width = font.widthOfTextAtSize(text, size);
  while (width > maxWidth && size > minSize) {
    size -= 1;
    width = font.widthOfTextAtSize(text, size);
  }
  return { size, width };
}

export interface GenerateCertificateOptions {
  participantName: string;
  track?: string | number | null;
  usn?: string | null;
  teamName?: string | null;
  templateBuffer?: Buffer | null;
  templateFileName?: string | null;
  xCoord?: number | null;
  yCoord?: number | null;
}

export async function generateCertificateBuffer(
  templateOrOptions: Buffer | GenerateCertificateOptions,
  participantNameArg?: string,
  xCoordArg?: number | null,
  yCoordArg?: number | null
): Promise<Buffer> {
  let options: GenerateCertificateOptions;

  if (Buffer.isBuffer(templateOrOptions)) {
    options = {
      templateBuffer: templateOrOptions,
      participantName: participantNameArg || 'Unknown Participant',
      xCoord: xCoordArg,
      yCoord: yCoordArg,
    };
  } else {
    options = templateOrOptions;
  }

  const { participantName, track, usn, teamName } = options;

  // Resolve template design config based on track/design
  const templateConfig = resolveDesignTemplate(options.templateFileName || track);

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  // Load custom font
  const fontPath = path.join(process.cwd(), 'public/fonts/Montserrat-Bold.ttf');
  const fontBytes = await fs.readFile(fontPath);
  const customFont = await pdfDoc.embedFont(fontBytes);

  // Load template image buffer
  let templateBuffer = options.templateBuffer;
  if (!templateBuffer) {
    templateBuffer = await getTemplateBuffer(templateConfig.file);
  }

  const isPng = templateConfig.file.endsWith('.png') ||
    (templateBuffer[0] === 0x89 && templateBuffer[1] === 0x50 && templateBuffer[2] === 0x4e && templateBuffer[3] === 0x47);

  if (isPng) {
    const pngImage = await pdfDoc.embedPng(templateBuffer);
    const page = pdfDoc.addPage([pngImage.width, pngImage.height]);
    page.drawImage(pngImage, {
      x: 0,
      y: 0,
      width: pngImage.width,
      height: pngImage.height,
    });

    const textColor = rgb(0.12, 0.12, 0.15);

    // 1. Draw Participant / Recipient Name
    const cleanName = (participantName || '').trim();
    if (cleanName) {
      const { size: nameSize, width: nameWidth } = fitText(
        customFont,
        cleanName,
        templateConfig.name.fontSize,
        templateConfig.name.maxWidth,
        20
      );
      const nameX = options.xCoord != null && options.xCoord !== 0
        ? options.xCoord
        : templateConfig.name.centerX - (nameWidth / 2);
      const nameY = options.yCoord != null && options.yCoord !== 0
        ? options.yCoord
        : templateConfig.name.y;

      page.drawText(cleanName, {
        x: nameX,
        y: nameY,
        size: nameSize,
        font: customFont,
        color: textColor,
      });
    }

    // 2. Draw USN (if applicable)
    const cleanUsn = (usn || '').trim();
    if (templateConfig.usn && cleanUsn) {
      const { size: usnSize, width: usnWidth } = fitText(
        customFont,
        cleanUsn,
        templateConfig.usn.fontSize,
        templateConfig.usn.maxWidth,
        14
      );
      page.drawText(cleanUsn, {
        x: templateConfig.usn.centerX - (usnWidth / 2),
        y: templateConfig.usn.y,
        size: usnSize,
        font: customFont,
        color: textColor,
      });
    }

    // 3. Draw Team Name / Domain (if applicable)
    const cleanTeam = (teamName || '').trim();
    if (templateConfig.team && cleanTeam) {
      const { size: teamSize, width: teamWidth } = fitText(
        customFont,
        cleanTeam,
        templateConfig.team.fontSize,
        templateConfig.team.maxWidth,
        14
      );
      page.drawText(cleanTeam, {
        x: templateConfig.team.centerX - (teamWidth / 2),
        y: templateConfig.team.y,
        size: teamSize,
        font: customFont,
        color: textColor,
      });
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  // Fallback for existing PDF templates
  const loadedPdf = await PDFDocument.load(templateBuffer);
  loadedPdf.registerFontkit(fontkit);
  const loadedFont = await loadedPdf.embedFont(fontBytes);
  const pages = loadedPdf.getPages();
  const firstPage = pages[0];
  const { width, height } = firstPage.getSize();

  const fontSize = 42;
  const textWidth = loadedFont.widthOfTextAtSize(participantName, fontSize);
  const textHeight = loadedFont.heightAtSize(fontSize);

  const finalX = options.xCoord != null && options.xCoord !== 0 ? options.xCoord : (width / 2 - textWidth / 2);
  const finalY = options.yCoord != null && options.yCoord !== 0 ? options.yCoord : (height / 2 - textHeight / 2);

  firstPage.drawText(participantName, {
    x: finalX,
    y: finalY,
    size: fontSize,
    font: loadedFont,
    color: rgb(0.12, 0.12, 0.15),
  });

  const savedBytes = await loadedPdf.save();
  return Buffer.from(savedBytes);
}