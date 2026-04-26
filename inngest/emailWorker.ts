// inngest/emailWorker.ts
import { inngest } from "./client";
import { Resend } from "resend";
import { getSecureDownloadUrl } from "../utils/s3Presigner";

export const sendCertificateEmail = inngest.createFunction(
  {
    id: "send-certificate-email-worker",
    triggers: [{ event: "certificate/completed" }],
    concurrency: { limit: 10 } // Limits to 10 concurrent emails to avoid spam filters
  },
  async ({ event, step }) => {
    const { email, participantName, s3FileName } = event.data;

    if (!process.env.RESEND_API_KEY) {
      await step.run("skip-email-missing-key", async () => {
        console.warn("RESEND_API_KEY is not set; skipping email send in this environment.");
      });
      return { success: true, skipped: true, reason: "missing_resend_api_key", email };
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    // Step 1: Generate the secure, temporary download link
    const downloadUrl = await step.run("generate-signed-url", async () => {
      return await getSecureDownloadUrl(s3FileName);
    });

    // Step 2: Dispatch the email via Resend
    await step.run("dispatch-email", async () => {
      await resend.emails.send({
        from: "onboarding@resend.dev", // You must verify this domain in Resend later
        to: email,
        subject: "Your Certificate for AI JACK OF AIML TRADES",
        html: `
          <p>Hi ${participantName},</p>
          <p>Congratulations on your participation! You can download your official certificate using the secure link below:</p>
          <p><a href="${downloadUrl}">Download Certificate</a></p>
          <p><em>Note: For security reasons, this download link will expire in 7 days.</em></p>
        `,
      });
    });

    // Return success to mark the job as finished in the queue
    return { success: true, emailSentTo: email };
  }
);