import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { inngest } from "@/inngest/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { eventId, participants } = body;

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
      participants.map((p: any) => 
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
    const inngestPayloads = createdData.map((record) => ({
      name: "certificate/generate",
      data: {
        certificateId: record.certificate?.id,
        participantName: record.metadata.participantName || "Unknown",
        templateId: eventId
      }
    }));

    // 3. Bulk send to the Inngest Queue
    await inngest.send(inngestPayloads);

    return NextResponse.json({ success: true, queued: inngestPayloads.length });

  } catch (error) {
    console.error("Upload Error:", error);
    return NextResponse.json({ error: "Failed to process upload" }, { status: 500 });
  }
}