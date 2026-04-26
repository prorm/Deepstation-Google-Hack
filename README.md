# DeepStation Certificate Generator

DeepStation is a Next.js + Inngest pipeline that turns bulk participant spreadsheets into generated PDF certificates and optional email delivery links.

The app is built for event workflows where you need to:
1. Upload a participant sheet.
2. Map spreadsheet columns to template placeholders.
3. Queue certificate rendering in the background.
4. Store certificates in S3.
5. Send signed download links by email.

## What This Repository Contains

This project combines:
1. A Next.js App Router frontend for upload and mapping.
2. API routes for data intake and Inngest serving.
3. A Prisma/PostgreSQL persistence layer.
4. Inngest workers for PDF generation and email dispatch.
5. Utility modules for PDF rendering and S3 signed URLs.

## High-Level Architecture

1. User uploads `.xlsx`, `.xls`, or `.csv` in the UI.
2. Browser parses spreadsheet with `xlsx` and sends structured payload to `/api/upload`.
3. API writes Event, Participant, and Certificate records to PostgreSQL (via Prisma).
4. API emits one `certificate/generate` event per participant.
5. Inngest worker generates PDF and uploads to S3.
6. Worker updates certificate row status in DB.
7. Worker emits `certificate/completed`.
8. Email worker creates a signed S3 URL and sends mail through Resend.

## Tech Stack

1. Framework: Next.js 16 (App Router), React 19, TypeScript 5
2. ORM/Database: Prisma + PostgreSQL
3. Background orchestration: Inngest
4. File parsing: `xlsx`
5. PDF generation: `pdf-lib` + `@pdf-lib/fontkit`
6. Storage: AWS S3
7. Email: Resend
8. Styling: Tailwind CSS v4

## Directory Guide

1. `app/page.tsx`: Landing page and uploader entry point.
2. `components/ExcelUploader.tsx`: Spreadsheet ingestion and parsing.
3. `components/DataMapper.tsx`: Placeholder-to-column mapping and upload trigger.
4. `app/api/upload/route.ts`: Validation, DB insert transaction, queue emission.
5. `app/api/inngest/route.ts`: Inngest function registration endpoint.
6. `inngest/functions.ts`: Certificate generation worker.
7. `inngest/emailWorker.ts`: Email dispatch worker.
8. `workers/certificateWorker.ts`: S3 upload + DB status updates.
9. `utils/pdfEngine.ts`: Template rendering with custom font and centering.
10. `utils/s3Presigner.ts`: Time-limited download URL generation.
11. `prisma/schema.prisma`: Data model for events/participants/certificates.

## Data Model

The schema includes three core models:

1. `Event`
2. `Participant` (belongs to one Event)
3. `Certificate` (one-to-one with Participant)

Current status values are stored as strings (`PENDING`, `COMPLETED`, `FAILED`).

## Environment Variables

Create a `.env` in project root with:

```dotenv
DATABASE_URL="postgresql://<user>:<password>@<host>:5432/<db>?schema=public"

AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="<aws-access-key-id>"
AWS_SECRET_ACCESS_KEY="<aws-secret-access-key>"
AWS_S3_BUCKET_NAME="<s3-bucket-name>"

RESEND_API_KEY="<resend-api-key>"

# Optional local dev behavior for Inngest
INNGEST_DEV="1"
```

Notes:
1. The code expects `AWS_S3_BUCKET_NAME` (not `S3_BUCKET_NAME`).
2. If `RESEND_API_KEY` is missing, email worker skips dispatch (dev-friendly behavior).
3. If AWS keys are missing, certificate upload is skipped but DB status logic still runs.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Generate Prisma client:

```bash
npx prisma generate
```

3. Sync schema (development):

```bash
npx prisma db push
```

## Running Locally

Run Next.js and Inngest together in separate terminals.

Terminal 1:

```bash
npm run dev
```

Terminal 2:

```bash
npx inngest-cli dev -u http://localhost:3000/api/inngest
```

Then open `http://localhost:3000`.

## Runtime Behavior Details

### Upload and Mapping

1. Spreadsheet is parsed in browser.
2. Operator provides a required `eventId` and optional `eventName`.
3. `participantName` is currently the only required placeholder.
4. Email is extracted from `Email` or `email` column.
5. All unmapped columns are preserved in participant metadata JSON.

### API Ingestion (`/api/upload`)

1. Validates `eventId` and non-empty participants list.
2. Upserts an `Event` using provided `eventName`/`templateUrl` when present.
3. Uses `/template.pdf` as a safe default template URL for newly created events.
4. Creates participants and nested certificate rows in one transaction.
5. Emits bulk `certificate/generate` events to Inngest.
6. If the queue is temporarily unavailable, the upload still succeeds and returns a deferred response so the rows remain saved.

### Certificate Worker

1. Loads `public/template.pdf`.
2. Falls back to a blank PDF if template is unavailable.
3. Renders participant name with `public/fonts/Montserrat-Bold.ttf`.
4. Uploads generated PDF to S3 via AWS SDK.
5. Updates certificate status in DB.
6. Emits `certificate/completed` event.

### Email Worker

1. Receives completion event with participant details.
2. Creates signed S3 download URL (7-day expiry).
3. Sends email with link using Resend.

## Quality Checks

Use these commands before deployment:

```bash
npm run lint
npm run build
```

Optional DB checks:

```bash
npx prisma validate
```

## Deployment Checklist

1. Environment variables set in deployment target.
2. `DATABASE_URL` points to production DB and is reachable.
3. Prisma client generated for current schema.
4. S3 bucket exists and IAM credentials allow `PutObject` and `GetObject`.
5. Resend sender domain configured for production sending.
6. `public/template.pdf` exists and matches desired design.
7. `public/fonts/Montserrat-Bold.ttf` exists.
8. `npm run lint` passes.
9. `npm run build` passes.
10. Inngest endpoint is reachable in deployed environment.

## Known Production Risks To Address

1. Secrets must never be committed to source control.
2. `from` email in Resend uses onboarding domain and should be replaced with your verified sender.
3. There is currently no automated test suite (`npm test` is not defined).

## Suggested Next Enhancements

1. Replace string certificate statuses with Prisma enum.
2. Add server-side payload schema validation (for example, with `zod`).
3. Add integration tests for `/api/upload` and Inngest event flow.
4. Add auth/admin guardrails for upload and dashboard routes.
5. Support dynamic templates and per-event template coordinates.

## License / Usage

Internal project for certificate automation workflows.
