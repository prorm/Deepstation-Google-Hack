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

    // 2. Format the payload for Inngest queue including track, USN, and teamName
    const inngestPayloads = createdData.map((record) => {
      const metadata = (record.metadata || {}) as Record<string, unknown>;
      
      const participantName =
        typeof metadata.participantName === "string" && metadata.participantName.trim()
          ? metadata.participantName.trim()
          : typeof metadata.name === "string" && metadata.name.trim()
          ? metadata.name.trim()
          : typeof metadata["Full Name"] === "string" && metadata["Full Name"].trim()
          ? metadata["Full Name"].trim()
          : "Participant";

      const track =
        metadata.track != null
          ? String(metadata.track).trim()
          : metadata.Track != null
          ? String(metadata.Track).trim()
          : metadata.category != null
          ? String(metadata.category).trim()
          : metadata.Category != null
          ? String(metadata.Category).trim()
          : "1";

      const usn =
        typeof metadata.usn === "string"
          ? metadata.usn.trim()
          : typeof metadata.USN === "string"
          ? metadata.USN.trim()
          : typeof metadata["Roll No"] === "string"
          ? metadata["Roll No"].trim()
          : null;

      const teamName =
        typeof metadata.teamName === "string"
          ? metadata.teamName.trim()
          : typeof metadata.team === "string"
          ? metadata.team.trim()
          : typeof metadata.Team === "string"
          ? metadata.Team.trim()
          : typeof metadata["Team Name"] === "string"
          ? metadata["Team Name"].trim()
          : null;

      return {
        name: "certificate/generate",
        data: {
          certificateId: record.certificate?.id || "",
          participantName,
          track,
          usn,
          teamName,
          templateId: eventId,
          email: record.email,
        },
      };
    });

    // 3. Bulk send to the Inngest Queue
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