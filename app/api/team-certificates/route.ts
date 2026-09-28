import { NextRequest, NextResponse } from 'next/server';
import { findTeamByLeadEmail } from '@/utils/teamOrganizer';
import fs from 'fs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');
  const download = searchParams.get('download');

  if (!email) {
    return NextResponse.json(
      { error: 'Missing required query parameter: email' },
      { status: 400 }
    );
  }

  const teamData = findTeamByLeadEmail(email);

  if (!teamData) {
    return NextResponse.json(
      {
        error: 'No team found for this email address',
        message: 'Only registered team leads have permission to access and download certificates for their team.',
      },
      { status: 404 }
    );
  }

  // If download=zip requested, stream the pre-bundled ZIP file directly
  if (download === 'zip' && teamData.zipFilePath && fs.existsSync(teamData.zipFilePath)) {
    const zipStream = fs.createReadStream(teamData.zipFilePath);
    const fileName = `${teamData.teamName.replace(/[^a-zA-Z0-9_-]/g, '_')}_Certificates.zip`;

    // Convert Node ReadStream to Web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        zipStream.on('data', (chunk) => controller.enqueue(chunk));
        zipStream.on('end', () => controller.close());
        zipStream.on('error', (err) => controller.error(err));
      },
    });

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  }

  // Return the team metadata and member certificate download links
  return NextResponse.json({
    success: true,
    teamName: teamData.teamName,
    track: teamData.track,
    leadEmail: teamData.leadEmail,
    zipDownloadUrl: `/api/team-certificates?email=${encodeURIComponent(email)}&download=zip`,
    membersCount: teamData.members.length,
    members: teamData.members.map((m) => ({
      name: m.name,
      usn: m.usn,
      track: m.track,
      role: m.role,
      pdfFileName: m.pdfFileName,
    })),
  });
}
