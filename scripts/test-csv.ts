import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { generateCertificateBuffer, resolveDesignTemplate } from '../utils/pdfEngine';
import { processCertificateRecord } from '../workers/certificateWorker';
import { createTeamZip, updateTeamsIndex, TeamGroup, findTeamByLeadEmail } from '../utils/teamOrganizer';

interface CsvRow {
  Name?: string;
  name?: string;
  'Participant Name'?: string;
  'Full Name'?: string;

  Track?: string | number;
  track?: string | number;
  Category?: string;
  category?: string;

  USN?: string;
  usn?: string;
  'Roll No'?: string;

  Team?: string;
  team?: string;
  'Team Name'?: string;

  'Lead Email'?: string;
  'Lead_Email'?: string;
  'lead_email'?: string;
  'Team Lead Email'?: string;

  Role?: string;
  role?: string;

  Email?: string;
  email?: string;
}

async function runCsvTest() {
  const csvFileName = process.argv[2] || 'test_participants.csv';
  const csvPath = path.resolve(process.cwd(), csvFileName);

  console.log(`======================================================================`);
  console.log(`🚀 CERTIFICATE GENERATION & TEAM GROUPING TEST (LOCAL ONLY)`);
  console.log(`📄 CSV Source: ${csvPath}`);
  console.log(`📁 Templates Folder: Participation_volunteer_certificate`);
  console.log(`💾 Output Destination: ./generated_certificates/<Team_Name>/`);
  console.log(`🔒 Zero Cloud Storage: All generation and zip bundling is 100% local`);
  console.log(`======================================================================\n`);

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found at: ${csvPath}`);
    process.exit(1);
  }

  const workbook = XLSX.readFile(csvPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<CsvRow>(sheet);

  console.log(`📊 Loaded ${rows.length} rows from CSV (Mixed Tracks & Multi-Member Teams).\n`);

  // Map to store grouped teams
  const teamsMap: Record<string, TeamGroup> = {};

  // Step 1: Generate individual certificates organized into Team folders
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = (row.Name || row.name || row['Participant Name'] || row['Full Name'] || `Participant_${i + 1}`).trim();
    const track = String(row.Track || row.track || row.Category || row.category || '1').trim();
    const usn = (row.USN || row.usn || row['Roll No'] || '').trim();
    const team = (row.Team || row.team || row['Team Name'] || 'Individual').trim();
    const email = (row.Email || row.email || `participant_${i + 1}@example.com`).trim();
    const leadEmail = (
      row['Lead Email'] ||
      row['Lead_Email'] ||
      row['lead_email'] ||
      row['Team Lead Email'] ||
      email
    ).trim().toLowerCase();
    const role = (row.Role || row.role || 'Member').trim();

    const templateConfig = resolveDesignTemplate(track);
    const sanitizedTeam = team.replace(/[^a-zA-Z0-9_-]/g, '_');
    const sanitizedName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${sanitizedName}_Certificate`;

    console.log(`----------------------------------------------------------------------`);
    console.log(`[${i + 1}/${rows.length}] Generating for: ${name}`);
    console.log(`   - Team: "${team}" | Role: "${role}"`);
    console.log(`   - Track: "${track}" -> Design: ${templateConfig.file}`);
    console.log(`   - Team Lead Email: ${leadEmail}`);

    // Generate the certificate PDF Buffer with exact coordinates
    const pdfBuffer = await generateCertificateBuffer({
      participantName: name,
      track,
      usn,
      teamName: team,
    });

    // Save into team subdirectory in generated_certificates/
    const saveResult = await processCertificateRecord(
      `test-${i + 1}`,
      pdfBuffer,
      fileName,
      sanitizedTeam
    );

    const stat = fs.statSync(saveResult.localFilePath);
    const sizeKb = (stat.size / 1024).toFixed(1) + ' KB';
    console.log(`   ✅ Saved to: ${saveResult.localFilePath} (${sizeKb})`);

    // Track in team grouping
    const teamKey = leadEmail || sanitizedTeam.toLowerCase();
    if (!teamsMap[teamKey]) {
      teamsMap[teamKey] = {
        teamName: team,
        track,
        leadEmail,
        folderPath: path.dirname(saveResult.localFilePath),
        members: [],
      };
    }

    teamsMap[teamKey].members.push({
      name,
      usn,
      track,
      role,
      email,
      pdfPath: saveResult.localFilePath,
      pdfFileName: path.basename(saveResult.localFilePath),
    });
  }

  // Step 2: Bundle each team's certificates into a .ZIP archive & write team manifests
  console.log(`\n======================================================================`);
  console.log(`📦 BUNDLING CERTIFICATES FOR TEAM LEADS (.ZIP per Team)`);
  console.log(`======================================================================\n`);

  for (const [teamKey, team] of Object.entries(teamsMap)) {
    const zipName = `${team.teamName.replace(/[^a-zA-Z0-9_-]/g, '_')}_All_Certificates.zip`;
    console.log(`📦 Bundling Team: "${team.teamName}" (${team.members.length} members)`);
    console.log(`   - Team Lead: ${team.leadEmail}`);

    const zipPath = await createTeamZip(team.folderPath, zipName);
    team.zipFilePath = zipPath;

    const zipStat = fs.statSync(zipPath);
    console.log(`   ✅ Created ZIP: ${zipPath} (${(zipStat.size / 1024).toFixed(1)} KB)`);

    // Save manifest inside team folder
    const manifestPath = path.join(team.folderPath, 'team_manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(team, null, 2), 'utf-8');
  }

  // Step 3: Write Master Index for instant lookup by website builders
  updateTeamsIndex(teamsMap);
  console.log(`\n✅ Saved Master Team Index to: generated_certificates/teams_index.json`);

  // Step 4: Simulate Team Lead Login / Access Check
  console.log(`\n======================================================================`);
  console.log(`🔍 SIMULATING TEAM LEAD LOOKUP (Entering Lead Email)`);
  console.log(`======================================================================\n`);

  const testEmails = [
    'aarav.lead@synapse.ai',
    'rohan.lead@sentinelx.io',
    'kavya.volunteer@hackathon.org',
    'unknown.email@test.com',
  ];

  for (const email of testEmails) {
    console.log(`Testing Lead Email: "${email}"...`);
    const foundTeam = findTeamByLeadEmail(email);
    if (foundTeam) {
      console.log(`   🎉 Access Granted!`);
      console.log(`      Team: ${foundTeam.teamName} [${foundTeam.track}]`);
      console.log(`      Teammates (${foundTeam.members.length}): ${foundTeam.members.map((m) => m.name).join(', ')}`);
      console.log(`      Zip Bundle: ${foundTeam.zipFilePath}`);
    } else {
      console.log(`   🚫 Access Denied (Not a registered team lead)`);
    }
  }

  console.log(`\n======================================================================`);
  console.log(`🎉 ALL TESTS COMPLETED SUCCESSFULLY!`);
  console.log(`======================================================================\n`);
}

runCsvTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
