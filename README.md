# DeepStation Certificate Generator

A highly scalable Next.js application designed to automate the generation and emailing of personalized certificates from bulk Excel/CSV data. Built specifically for Hackathon workflows, this tool drastically reduces the manual effort of distributing participant certificates.

## 🚀 Key Features
- **Bulk Upload Support**: Drag and drop \.xlsx\, \.xls\, or \.csv\ files containing participant details (Name, Email, etc.).
- **Dynamic Field Mapping**: A UI mapper to lock Excel column headers directly to required data fields (\participantName\).
- **Template-Based PDF Engine**: Uses an uploaded Canva PDF (\public/template.pdf\) as a base canvas.
- **Smart Typography & Auto-Centering**: Uses the \pdf-lib\ engine and custom \Montserrat\ fonts. If precise coordinates aren't mapped, the engine automatically measures string widths and centers text perfectly in the middle of your template. 
- **Highly Scalable Queues**: Uses **Inngest** for background job processing. Offloads the heavy PDF rendering, S3 uploading, and Email dispatch tracking into highly concurrent background streams without crashing or freezing the UI.
- **AWS S3 & Resend Integration**: Securely uploads raw generated PDFs via pre-signed S3 URLs and dispatches them straight to participant inboxes via Resend.

## 💻 Tech Stack
- **Framework**: Next.js 16.x (App Router), React 19, TypeScript 5
- **Database**: PostgreSQL (via Prisma ORM)
- **Background Jobs**: Inngest
- **File Parsing**: xlsx
- **PDF Manipulation**: pdf-lib, @pdf-lib/fontkit
- **Cloud & Transport**: AWS S3 & Resend
- **Styling**: Tailwind CSS v4

## 🛠️ Local Development & Setup

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL Database URL
- Inngest CLI (\
px inngest-cli dev\)
- AWS S3 Bucket Credentials
- Resend API Key

### 2. Environment Variables
Create a \.env\ file in the root directory:
\\\env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="your-region"
S3_BUCKET_NAME="your-bucket-name"
RESEND_API_KEY="your-resend-key"
\\\

### 3. Installation
\\\ash
npm install
# Sync database
npx prisma db push
\\\

### 4. Running the Complete Stack
To test locally, you need both the Next.js process and the Inngest queue orchestrator running:
\\\ash
# Terminal 1: Start Next.js App
npm run dev

# Terminal 2: Start Inngest Background Worker Engine
npx inngest-cli dev
\\\
Go to [http://localhost:3000](http://localhost:3000) and upload your CSV. Watch the Inngest dashboard (typically http://127.0.0.1:8288) to see jobs flow through perfectly.

## 📂 Architecture Flow
1. **Upload & Map**: UI parses Excel to JSON -> Post to \/api/upload\.
2. **Database Sync**: \/api/upload\ saves users to Prisma Database -> Emits bulk \certificate/generate\ events to Inngest.
3. **Queue 1 (Worker 1)**: Inngest fires up \generateCertificate\. Pulls the blank PDF template -> Overlays White Montserrat text (auto-centered) -> Uploads finished PDF to AWS S3.
4. **Queue 2 (Worker 2)**: Worker 1 fires a \certificate/completed\ event. Inngest triggers the Email Worker -> Grabs the S3 Signed URL -> Attaches to Resend payload -> Delivers to the participant mapped email address.

---
> *Developed for the Google Hackathon 2026.*
