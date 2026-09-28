import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

export interface ParticipantRecord {
  name: string;
  track: string;
  usn?: string;
  teamName?: string;
  email?: string;
  leadEmail?: string;
  role?: string;
  certificatePdfPath?: string;
  certificateUrl?: string;
}

export interface TeamGroup {
  teamName: string;
  track: string;
  leadEmail: string;
  folderPath: string;
  zipFilePath?: string;
  members: Array<{
    name: string;
    usn: string;
    track: string;
    role: string;
    email: string;
    pdfPath: string;
    pdfFileName: string;
  }>;
}

/**
 * Creates a .ZIP archive containing all files in a specific team folder.
 */
export async function createTeamZip(teamFolderPath: string, zipFileName: string): Promise<string> {
  const zipFilePath = path.join(teamFolderPath, zipFileName);

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      resolve(zipFilePath);
    });

    archive.on('error', (err: Error) => {
      reject(err);
    });

    archive.pipe(output);

    // Read all PDF files in team directory and add them to zip
    const files = fs.readdirSync(teamFolderPath);
    for (const file of files) {
      if (file.endsWith('.pdf')) {
        const filePath = path.join(teamFolderPath, file);
        archive.file(filePath, { name: file });
      }
    }

    archive.finalize();
  });
}

/**
 * Saves and updates the master teams index file: generated_certificates/teams_index.json
 */
export function updateTeamsIndex(teams: Record<string, TeamGroup>): void {
  const baseDir = path.join(process.cwd(), 'generated_certificates');
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  const indexPath = path.join(baseDir, 'teams_index.json');
  fs.writeFileSync(indexPath, JSON.stringify(teams, null, 2), 'utf-8');
}

/**
 * Looks up team certificates by Team Lead Email.
 * Used by website builders to instantly serve certificates to team leads.
 */
export function findTeamByLeadEmail(leadEmail: string): TeamGroup | null {
  const baseDir = path.join(process.cwd(), 'generated_certificates');
  const indexPath = path.join(baseDir, 'teams_index.json');

  if (!fs.existsSync(indexPath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(indexPath, 'utf-8');
    const index: Record<string, TeamGroup> = JSON.parse(raw);
    const normalizedEmail = (leadEmail || '').trim().toLowerCase();

    // Direct lookup by lead email
    if (index[normalizedEmail]) {
      return index[normalizedEmail];
    }

    // Secondary scan across teams in case email is registered under team member
    for (const group of Object.values(index)) {
      if (group.leadEmail.toLowerCase() === normalizedEmail) {
        return group;
      }
      const memberMatch = group.members.find((m) => m.email.toLowerCase() === normalizedEmail && m.role.toLowerCase().includes('lead'));
      if (memberMatch) {
        return group;
      }
    }

    return null;
  } catch (err) {
    console.error('Error reading teams_index.json:', err);
    return null;
  }
}
