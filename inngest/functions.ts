import { inngest } from "./client";
import { generateCertificateBuffer } from "../utils/pdfEngine";
import { processCertificateRecord } from "../workers/certificateWorker";
import fs from "fs/promises";
import path from "path";

export const generateCertificate = inngest.createFunction(
  { id: "generate-certificate-worker" }, // config
  { event: "certificate/generate" },     // trigger

  async ({ event, step }) => {           // handler
    const { certificateId, participantName, templateId } = event.data;

    // Step 1: Fetch Template Details
    const template = await step.run("fetch-template-details", async () => {
      return {
        url: "template.pdf",
        x: 400,
        y: 600,
      };
    });

    // Step 2: Load Template
    const templateBuffer = await step.run("load-template", async () => {
      const filePath = path.join(
        process.cwd(),
        "public/templates/template.pdf"
      );
      return await fs.readFile(filePath);
    });

    // Step 3: Generate PDF
    const pdfBuffer = await step.run("render-pdf", async () => {
      return await generateCertificateBuffer(
        templateBuffer,
        participantName,
        template.x,
        template.y
      );
    });

    // Step 4: Upload + DB update
    await step.run("upload-and-update-db", async () => {
      await processCertificateRecord(
        certificateId,
        pdfBuffer,
        `${certificateId}-${participantName}`
      );
    });

    return { success: true, certificateId };
  }
);