// inngest/functions.ts
import { inngest } from "./client";
import { generateCertificateBuffer } from "../utils/pdfEngine";
import { processCertificateRecord } from "../workers/certificateWorker";
import { PDFDocument } from 'pdf-lib';

// Optional but recommended typing
type Events = {
  "certificate/generate": {
    data: {
      certificateId: string;
      participantName: string;
      templateId: string;
    };
  };
};

export const generateCertificate = inngest.createFunction(
  { 
    id: "generate-certificate-worker", 
    triggers: [{ event: "certificate/generate" }] 
  },
  async ({ event, step }) => {
    const { certificateId, participantName, templateId } = event.data;

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
    await step.run("upload-and-update-db", async () => {
      // Decode string back to binary for AWS S3
      const finalBuffer = Buffer.from(pdfBase64, 'base64');
      
      await processCertificateRecord(
        certificateId,
        finalBuffer, 
        `${certificateId}-${participantName}`
      );
    });

    return { success: true, certificateId };
  }
);