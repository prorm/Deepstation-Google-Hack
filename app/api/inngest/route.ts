// app/api/inngest/route.ts
import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { generateCertificate } from "@/inngest/functions";
import { sendCertificateEmail } from "@/inngest/emailWorker";

// Serve the Inngest API
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    generateCertificate,
    sendCertificateEmail,
  ],
});