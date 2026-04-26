// inngest/functions.ts
import { inngest } from "./client";
import { generateCertificateBuffer } from "../utils/pdfEngine";
import { processCertificateRecord } from "../workers/certificateWorker";
import { PDFDocument } from 'pdf-lib';

export const generateCertificate = inngest.createFunction(
  { 
    id: "generate-certificate-worker", 
    triggers: [{ event: "certificate/generate" }],
    concurrency: { limit: 50 } // Limits to 50 concurrent PDF generations
  },
  async ({ event, step }) => {
    const { certificateId, participantName } = event.data;

    // Step 1: Fetch Template Details
    const template = await step.run("fetch-template-details", async () => {
      return { url: "...", x: 400, y: 600 };
    });

    // Step 2: Generate PDF & encode as Base64 to safely pass through JSON queue
    const pdfBase64 = await step.run("render-pdf", async () => {
      const tempDoc = await PDFDocument.create();
      tempDoc.addPage([800, 600]); 
      const tempBytes = await tempDoc.save();
      const dummyTemplateBuffer = Buffer.from(tempBytes); 

      const rawBuffer = await generateCertificateBuffer(
        dummyTemplateBuffer,
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

      // Placeholder: Fetching email from DB for the hand-off
      return { email: "student@example.com" }; 
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