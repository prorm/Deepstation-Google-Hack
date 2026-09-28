# Certificate Generator & Distribution Engine

A modern, scalable Next.js application designed to automate the generation, cloud storage, and distribution of personalized certificates from bulk Excel/CSV data. Built to handle large batches of participants, volunteers, and guests with zero cloud hosting costs.

## 🚀 Key Features

- **Bulk Data Ingestion**: Drag-and-drop `.xlsx`, `.xls`, or `.csv` files containing participant details.
- **Dynamic Field Mapping**: Intuitive column mapper to link spreadsheet headers directly to certificate placeholders (e.g., `{{participantName}}`).
- **Template-Based PDF Engine**: Overlays customized typography (using embedded fonts like Montserrat) directly onto pre-designed background PDF canvases (`public/template.pdf`).
- **Smart Typography & Auto-Centering**: Automatically calculates string widths and centers text dynamically if manual X/Y coordinates are omitted.
- **Asynchronous Background Processing**: Powered by **Inngest** to offload heavy rendering, cloud uploads, and email dispatches to concurrent worker queues without blocking UI threads.
- **Free-Tier Cloud Storage**: Securely stores generated certificates in **Cloudflare R2** (S3-compatible API with 10 GB free permanent storage and zero bandwidth egress fees).
- **Email Delivery**: Dispatches certificates directly to recipient inboxes via **Resend**.

## 💻 Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript 5
- **Styling**: Tailwind CSS v4
- **Database**: PostgreSQL (via Prisma ORM, hosted on Neon Serverless Postgres)
- **Object Storage**: Cloudflare R2 (`@aws-sdk/client-s3`)
- **Queue / Workers**: Inngest
- **PDF Manipulation**: `pdf-lib`, `@pdf-lib/fontkit`
- **Spreadsheet Parsing**: `xlsx`
- **Email Dispatch**: Resend

## 📁 Directory Guide

1. `app/page.tsx`: Landing page and uploader entry point.
2. `app/dashboard/page.tsx`: Real-time certificate generation status tracking.
3. `components/ExcelUploader.tsx`: Spreadsheet ingestion and parsing.
4. `components/DataMapper.tsx`: Placeholder-to-column mapping and upload trigger.
5. `app/api/upload/route.ts`: Validation, DB insert transaction, queue emission.
6. `app/api/inngest/route.ts`: Inngest function registration endpoint.
7. `inngest/functions.ts`: Certificate generation worker.
8. `inngest/emailWorker.ts`: Email dispatch worker.
9. `workers/certificateWorker.ts`: R2/S3 upload and DB status updates.
10. `utils/pdfEngine.ts`: Template rendering with custom font and auto-centering.
11. `utils/s3Presigner.ts`: Time-limited secure download URL generation.
12. `prisma/schema.prisma`: Data models for events, participants, and certificates.

## 🛠️ Local Development & Setup

### 1. Prerequisites

- Node.js (v18+)
- PostgreSQL Database (e.g., free serverless instance on [Neon](https://neon.tech))
- Cloudflare R2 Bucket (or any S3-compatible bucket)
- Resend Account (free API key)
- Inngest CLI

### 2. Environment Configuration

Copy the example configuration to `.env`:

```bash
cp .env.example .env
```

Fill in your service credentials:

```env
# Database (Neon / PostgreSQL)
DATABASE_URL="postgresql://username:password@ep-xyz.aws.neon.tech/neondb?sslmode=require"

# Cloudflare R2 (S3-Compatible Storage)
ENDPOINT="https://<account_id>.r2.cloudflarestorage.com"
ACCOUNT_ID="your_cloudflare_account_id"
ACCESS_KEY_ID="your_r2_access_key_id"
SECRET_ACCESS_KEY="your_r2_secret_access_key"
BUCKET_NAME="certificates"

# Background Jobs
INNGEST_DEV="1"

# Email Delivery
RESEND_API_KEY="re_your_api_key"
```

### 3. Install Dependencies & Synchronize Schema

```bash
npm install
npx prisma db push
```

### 4. Running the Complete Stack

To run the application locally, start both the Next.js development server and the Inngest local orchestrator:

```bash
# Terminal 1: Start Next.js App
npm run dev

# Terminal 2: Start Inngest Background Worker Engine
npx inngest-cli dev
```

- Web UI: [http://localhost:3000](http://localhost:3000)
- Inngest Dashboard: [http://127.0.0.1:8288](http://127.0.0.1:8288)
- Admin Dashboard: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

## 📂 Architecture Flow

1. **Upload & Map**: User uploads spreadsheet data and maps fields via `/`.
2. **Database Sync**: `/api/upload` batch-creates participant records in PostgreSQL via Prisma transactions and dispatches `certificate/generate` events to Inngest.
3. **Queue 1 (Certificate Worker)**: Inngest executes `generateCertificate`, renders the text onto the base PDF canvas, and streams the finished binary to Cloudflare R2.
4. **Queue 2 (Email Worker)**: Worker 1 fires a `certificate/completed` event, triggering the email worker to fetch a secure signed URL and dispatch the certificate via Resend.

## 🛡️ Quality Checks

Use these commands before deployment:

```bash
npm run lint
npx tsc --noEmit
npm run build
```
