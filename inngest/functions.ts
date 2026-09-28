// inngest/functions.ts
import { inngest } from "./client";
import { generateCertificateBuffer } from "../utils/pdfEngine";
import { processCertificateRecord } from "../workers/certificateWorker";

export const generateCertificate = inngest.createFunction(
  { 
    id: "generate-certificate-worker", 
    triggers: [{ event: "certificate/generate" }],
    concurrency: { limit: 50 } // Limits to 50 concurrent PDF generations
  },
  async ({ event, step }) => {
    const { 
      certificateId, 
      participantName, 
      email, 
      track, 
      usn, 
      teamName 
    } = event.data;

    // Step 1: Generate PDF using track-specific template from Participation_volunteer_certificate
    const pdfBase64 = await step.run("render-pdf", async () => {
      const rawBuffer = await generateCertificateBuffer({
        participantName,
        track,
        usn,
        teamName,
      });
      
      // Encode binary to string for the queue
      return Buffer.from(rawBuffer).toString('base64'); 
    });

    // Step 2: Save Locally (and optionally to Cloud) & Update DB
    const dbRecord = await step.run("upload-and-update-db", async () => {
      // Decode string back to binary
      const finalBuffer = Buffer.from(pdfBase64, 'base64');
      const safeParticipantName = (participantName || "Participant").replace(/[^a-zA-Z0-9_-]/g, "_");
      const fileName = `${certificateId || "cert"}-${safeParticipantName}`;
      
      await processCertificateRecord(
        certificateId,
        finalBuffer, 
        fileName
      );

      return { email, fileName }; 
    });

    return { success: true, certificateId, fileName: dbRecord.fileName };
  }
);