// inngest/client.ts
import { Inngest } from "inngest";

// Define the exact payload Person A will send you
type CertificateGenerateEvent = {
  data: {
    certificateId: string;
    participantName: string;
    templateId: string; // To fetch the right template URL and coordinates
  };
};

type Events = {
  "certificate/generate": CertificateGenerateEvent;
};

// Create the client
export const inngest = new Inngest({ id: "certificate-generator", schemas: { events: {} as Events } });