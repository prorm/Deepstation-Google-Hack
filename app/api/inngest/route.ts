// app/api/inngest/route.ts
import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { generateCertificate } from "@/inngest/functions";

// Serve the Inngest API
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    generateCertificate,
    // You will add the email worker function here later
  ],
});