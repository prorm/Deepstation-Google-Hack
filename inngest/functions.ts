// inngest/functions.ts
import { inngest } from "./client";
import { generateCertificateBuffer } from "../utils/pdfEngine";
import { processCertificateRecord } from "../workers/certificateWorker";

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
    event: "certificate/generate",

    // 👇 handler is now INSIDE the same object
    async run({ event, step }) {
      const { certificateId, participantName, templateId } = event.data;

      // Step 1: Fetch Template Details
      const template = await step.run("fetch-template-details", async () => {
        return { url: "...", x: 400, y: 600 };
      });

      // Step 2: Generate PDF
      const pdfBuffer = await step.run("render-pdf", async () => {
        const dummyTemplateBuffer = Buffer.from(""); // replace with real template
        return await generateCertificateBuffer(
          dummyTemplateBuffer,
          participantName,
          template.x,
          template.y
        );
      });

      // Step 3: Upload to S3 & Update DB
      await step.run("upload-and-update-db", async () => {
        await processCertificateRecord(
          certificateId,
          pdfBuffer,
          `${certificateId}-${participantName}`
        );
      });

      return { success: true, certificateId };
    },
  }
);