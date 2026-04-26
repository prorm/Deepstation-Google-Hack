// inngest/client.ts
import { Inngest } from "inngest";

// Event 1: From Person A's Frontend
type CertificateGenerateEvent = {
  data: {
    certificateId: string;
    participantName: string;
    templateId: string;
    email: string;
  };
};

// Event 2: From Your PDF Worker to Your Email Worker
type CertificateCompletedEvent = {
  data: {
    email: string; // We need this to send the email!
    participantName: string;
    s3FileName: string;
  };
};

type Events = {
  "certificate/generate": CertificateGenerateEvent;
  "certificate/completed": CertificateCompletedEvent;
};

export const inngest = new Inngest({ id: "certificate-generator", schemas: { events: {} as Events } });