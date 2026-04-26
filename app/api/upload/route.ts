import { NextResponse } from "next/server";
import { type Prisma } from "@prisma/client";
import { inngest } from "@/inngest/client";
import { prisma } from "@/lib/prisma";

type UploadParticipant = {
  email?: string;
  metadata: Prisma.InputJsonValue;
};

type UploadBody = {
  eventId: string;
  eventName?: string;
  templateUrl?: string;
  participants: UploadParticipant[];
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<UploadBody>;
    const eventId = typeof body.eventId === "string" ? body.eventId : "";
    const eventName = typeof body.eventName === "string" ? body.eventName.trim() : "";
    const templateUrl = typeof body.templateUrl === "string" ? body.templateUrl.trim() : "";
    const participants = Array.isArray(body.participants) ? body.participants : [];

    if (!eventId || participants.length === 0) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const resolvedEventName = eventName || eventId;
    const resolvedTemplateUrl = templateUrl || "/template.pdf";

    // Ensure the event exists with production-safe defaults when omitted.
    await prisma.event.upsert({
      where: { id: eventId },
      update: {
        ...(eventName ? { name: resolvedEventName } : {}),
        ...(templateUrl ? { templateUrl: resolvedTemplateUrl } : {}),
      },
      create: {
        id: eventId,
        name: resolvedEventName,
        templateUrl: resolvedTemplateUrl,
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

    // 3. Bulk send to the Inngest Queue. If Inngest is temporarily unavailable,
    // keep the persisted database records and return a deferred success instead.
    try {
      await inngest.send(inngestPayloads);

      return NextResponse.json({
        success: true,
        queued: inngestPayloads.length,
        deferred: false,
      });
    } catch (queueError) {
      console.error("Queue dispatch failed; certificates were saved and marked pending for retry.", queueError);

      return NextResponse.json(
        {
          success: true,
          queued: 0,
          deferred: true,
          message: "Certificates were saved, but the queue is temporarily unavailable. Please retry later to process them.",
        },
        { status: 202 }
      );
    }

  } catch (error) {
    console.error("Upload Error:", error);
    return NextResponse.json({ error: "Failed to process upload" }, { status: 500 });
  }
}