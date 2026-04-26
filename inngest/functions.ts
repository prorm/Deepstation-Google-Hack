// inngest/functions.ts
import { inngest } from "./client";
import { generateCertificateBuffer } from "../utils/pdfEngine";
import { processCertificateRecord } from "../workers/certificateWorker";
import { PDFDocument } from 'pdf-lib';
import { promises as fs } from 'fs';
import path from 'path';

export const generateCertificate = inngest.createFunction(
  { 
    id: "generate-certificate-worker", 
    triggers: [{ event: "certificate/generate" }],
    concurrency: { limit: 50 } // Limits to 50 concurrent PDF generations
  },
  async ({ event, step }) => {
    const { certificateId, participantName, email } = event.data;

    // Step 1: Fetch Template Details
    const template = await step.run("fetch-template-details", async () => {
      // By returning null for coordinates, we trigger the default centering behavior
      return { url: "...", x: null, y: null };
    });

    // Step 2: Generate PDF & encode as Base64 to safely pass through JSON queue
    const pdfBase64 = await step.run("render-pdf", async () => {
      let templateBuffer: Buffer;
      try {
        const templatePath = path.join(process.cwd(), 'public/template.pdf');
        templateBuffer = await fs.readFile(templatePath);
      } catch (error) {
        console.warn("Could not find public/template.pdf, falling back to a blank canvas.");
        const tempDoc = await PDFDocument.create();
        tempDoc.addPage([800, 600]); 
        const tempBytes = await tempDoc.save();
        templateBuffer = Buffer.from(tempBytes); 
      }

      const rawBuffer = await generateCertificateBuffer(
        templateBuffer,
        participantName,
        template.x,
        template.y
      );
      
      // Encode binary to string for the queue
      return Buffer.from(rawBuffer).toString('base64'); 
    });

    // Step 3: Upload to S3 & Update DB
    const dbRecord = await step.run("upload-and-update-db", async () => {
      // Decode string back to binary for AWS S3
      const finalBuffer = Buffer.from(pdfBase64, 'base64');
      
      await processCertificateRecord(
        certificateId,
        finalBuffer, 
        `${certificateId}-${participantName}`
      );

      // We already have the email from the initial event
      return { email }; 
    });

    // Step 4: THE HAND-OFF - Trigger the Email Worker
    // This MUST happen here, not in the email worker!
    await step.sendEvent("trigger-email-worker", {
      name: "certificate/completed",
      data: {
        email: dbRecord.email,
        participantName: participantName,
        s3FileName: `${certificateId}-${participantName}`,
      },
    });

    return { success: true, certificateId };
  }
);