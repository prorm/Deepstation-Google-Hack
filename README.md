# Deepstation Certificate Generator & Team Distribution Engine

A modern, scalable Next.js application designed to automate the generation, packaging, and distribution of personalized certificates from bulk Excel/CSV data. Designed for hackathons and conferences featuring mixed-track competitions, volunteer appreciation, and judge awards with team-lead-only certificate distribution.

---

## 🚀 Key Capabilities

- **Mixed-Track Dynamic Ingestion**: Upload a single CSV/Excel spreadsheet containing participants across different tracks. The engine automatically matches each row to the correct design template without requiring manual sorting.
- **Track-Specific Design Templates**: High-resolution certificate templates (2000 × 1414 px) with exact typography alignment and dynamic font-scaling (`Montserrat-Bold`) directly over template dotted lines:
  - **Sovereign AI** (`sovereign_ai.png`)
  - **Wellness & Lifestyle** (`wellness_and_lifestyle.png`)
  - **Cybersecurity & Defense** (`cybersecurity_and_defense.png`)
  - **Open Innovation** (`open_innovation.png`)
  - **Volunteer** (`volunteer.png`)
  - **Judge Appreciation** (`judge.png`)
- **Team Lead Grouping & Distribution**: Certificates are automatically grouped by Team and Team Lead:
  - Only registered Team Leads can access and download certificates for their teammates.
  - Automatically generates `<Team_Name>_All_Certificates.zip` per team for one-click downloading.
  - Generates `team_manifest.json` and `teams_index.json` for lookup by team lead email.
- **Ready-to-Use Website API**: Provides an API route for website frontend developers:
  - `GET /api/team-certificates?email=<lead_email>`: Returns team details, track, and teammate certificate records.
  - `GET /api/team-certificates?email=<lead_email>&download=zip`: Streams the bundled `.zip` archive directly.
- **Zero Cloud Storage Waste (Local Mode)**: Generation and packaging can run 100% locally in `generated_certificates/` without consuming AWS S3 or Cloudflare R2 quotas. Cloud upload is strictly opt-in via `UPLOAD_TO_CLOUD="true"`.

---

## 📊 Recommended CSV Structure

The engine processes mixed tracks and multi-member teams seamlessly:

```csv
Team,Lead_Email,Name,USN,Track,Role,Email
Synapse AI,aarav.lead@synapse.ai,Aarav Sharma,1MS21AI001,Sovereign AI,Lead,aarav@synapse.ai
Synapse AI,aarav.lead@synapse.ai,Priya Rao,1MS21AI042,Sovereign AI,Member,priya@synapse.ai
Synapse AI,aarav.lead@synapse.ai,Kiran Kumar,1MS21AI078,Sovereign AI,Member,kiran@synapse.ai
Sentinel X,rohan.lead@sentinelx.io,Rohan Verma,1MS21CY023,Cybersecurity and Defense,Lead,rohan@sentinelx.io
Sentinel X,rohan.lead@sentinelx.io,Sneha Kulkarni,1MS21CY055,Cybersecurity and Defense,Member,sneha@sentinelx.io
Vitality Labs,diya.lead@vitality.org,Diya Patel,1MS21CS045,Wellness and Lifestyle,Lead,diya@vitality.org
Innov8ors,ananya.lead@innov8.net,Ananya Iyer,1MS21IS012,Open Innovation,Lead,ananya@innov8.net
Operations Crew,kavya.volunteer@hackathon.org,Kavya Reddy,1MS22AI088,Volunteer,Volunteer,kavya.volunteer@hackathon.org
Jury Panel,arun.prasad@university.edu,Dr. Arun Prasad,,Judge,Judge,arun.prasad@university.edu
```

- **`Lead_Email`**: The email the team lead enters on the portal to access and download the team's certificates.
- For individual roles (Volunteers, Judges), their own email serves as the `Lead_Email`.

---

## 📁 Directory Structure

```
deepstation-google-hack/
├── Participation_volunteer_certificate/   # Official design templates & coordinate specs
│   ├── sovereign_ai.png                  # Sovereign AI Track template
│   ├── wellness_and_lifestyle.png        # Wellness & Lifestyle Track template
│   ├── cybersecurity_and_defense.png     # Cybersecurity & Defense Track template
│   ├── open_innovation.png               # Open Innovation Track template
│   ├── volunteer.png                     # Volunteer certificate template
│   ├── judge.png                         # Judge appreciation certificate template
│   └── README.md                         # Coordinate specs & dimensions
├── app/
│   ├── api/
│   │   ├── team-certificates/route.ts    # Team lead verification & ZIP download endpoint
│   │   ├── upload/route.ts               # Bulk CSV/Excel ingestion route
│   │   └── inngest/route.ts              # Inngest orchestration handler
│   ├── dashboard/page.tsx                # Admin certificate dashboard
│   ├── layout.tsx
│   └── page.tsx                          # Upload and data mapper entry page
├── components/
│   ├── DataMapper.tsx                    # CSV column-to-certificate mapping UI
│   └── ExcelUploader.tsx                 # Drag-and-drop spreadsheet uploader
├── inngest/                              # Asynchronous queue workers
│   ├── client.ts
│   └── functions.ts                      # Background PDF generation function
├── scripts/
│   └── test-csv.ts                       # Local CSV generation & team grouping test runner
├── utils/
│   ├── pdfEngine.ts                      # PDF generation, track resolver, & text positioning
│   └── teamOrganizer.ts                  # Team grouping, zip bundling, & index manager
├── workers/
│   └── certificateWorker.ts              # Local file saver and optional R2/S3 cloud worker
├── public/fonts/                         # Embedded Montserrat fonts
├── test_participants.csv                 # Sample mixed-track CSV with multi-member teams
└── prisma/schema.prisma                  # Event, Participant, and Certificate data schema
```

---

## 🎨 Design Templates & Typography

All certificates are rendered at 2000 × 1414 px using `pdf-lib` and `@pdf-lib/fontkit`:

| Track / Certificate | Template File | Printed Fields |
| :--- | :--- | :--- |
| **Sovereign AI** | `sovereign_ai.png` | Name, USN, Team Name |
| **Wellness & Lifestyle** | `wellness_and_lifestyle.png` | Name, USN, Team Name |
| **Cybersecurity & Defense** | `cybersecurity_and_defense.png` | Name, USN, Team Name |
| **Open Innovation** | `open_innovation.png` | Name, USN, Team Name |
| **Volunteer** | `volunteer.png` | Volunteer Name, USN, Domain / Team |
| **Judge Appreciation** | `judge.png` | Judge / Jury Name *(No USN/Team line)* |

Text is rendered in dark charcoal (`#1F1F26` / `rgb(0.12, 0.12, 0.15)`) with dynamic width calculation and automatic font size reduction to prevent overflow on long names.

---

## 💻 Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript 5
- **Styling**: Tailwind CSS v4
- **Database**: PostgreSQL via Prisma ORM
- **PDF Generation**: `pdf-lib`, `@pdf-lib/fontkit`
- **Spreadsheet Parsing**: `xlsx`
- **Archive Bundling**: `archiver`
- **Queue Orchestration**: Inngest
- **Cloud Storage (Optional)**: Cloudflare R2 / AWS S3 via `@aws-sdk/client-s3`

---

## 🛠️ Local Development & Quick Start

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL (e.g. [Neon](https://neon.tech))

### 2. Environment Setup
```bash
cp .env.example .env
```

To run purely locally without uploading to cloud:
```env
# Optional cloud storage (defaults to false / local-only)
UPLOAD_TO_CLOUD="false"
```

### 3. Install Dependencies
```bash
npm install
npx prisma db push
```

### 4. Run Certificate Generation Test
To generate test certificates and verify team grouping, zip bundling, and lead email lookup locally:
```bash
npm run test:csv
```

Outputs will be generated inside `./generated_certificates/<Team_Name>/` with zero cloud bandwidth usage.

### 5. Start Development Server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) for the UI or query the API:
```bash
curl "http://localhost:3000/api/team-certificates?email=aarav.lead@synapse.ai"
```

---

## 🛡️ Quality Assurance

Run type-checking and linting:
```bash
npx tsc --noEmit
npm run lint
```
