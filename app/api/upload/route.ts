import { NextResponse } from "next/server";
import { PrismaClient, type Prisma } from "@prisma/client";
import { inngest } from "@/inngest/client";

const prisma = new PrismaClient();

type UploadParticipant = {
  email?: string;
  metadata: Prisma.InputJsonValue;
};

type UploadBody = {
  eventId: string;
  participants: UploadParticipant[];
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<UploadBody>;
    const eventId = typeof body.eventId === "string" ? body.eventId : "";
    const participants = Array.isArray(body.participants) ? body.participants : [];

    if (!eventId || participants.length === 0) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // FIX: Automatically create the dummy event if it doesn't exist
    await prisma.event.upsert({
      where: { id: eventId },
      update: {},
      create: {
        id: eventId,
        name: "Test Hackathon Event",
        templateUrl: "https://example.com/dummy-template.pdf" // Required by your schema
      }
    });

    // 1. Save to Database using a Transaction
    const createdData = await prisma.$transaction(
      participants.map((p) => 
        prisma.participant.create({
          data: {
            eventId: eventId,
            email: p.email || "no-email@test.com",
            metadata: p.metadata,
            certificate: {
              create: { status: "PENDING" }
            }
          },
          include: { certificate: true }
        })
      )
    );

    // 2. Format the exact payload Swastik requested
    const inngestPayloads = createdData.map((record) => {
      // Metadata is stored as JSON in Prisma, so guard access at runtime.
      const metadata = record.metadata as Record<string, unknown>;
      const participantName =
        typeof metadata.participantName === "string"
          ? metadata.participantName
          : "Unknown";

      return {
        name: "certificate/generate",
        data: {
          certificateId: record.certificate?.id || "",
          participantName,
          templateId: eventId,
          email: record.email,
        },
      };
    });

    // 3. Bulk send to the Inngest Queue
    await inngest.send(inngestPayloads);

    return NextResponse.json({ success: true, queued: inngestPayloads.length });

  } catch (error) {
    console.error("Upload Error:", error);
    return NextResponse.json({ error: "Failed to process upload" }, { status: 500 });
  }
}