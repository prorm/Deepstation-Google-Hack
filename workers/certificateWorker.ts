import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from "@/lib/prisma";
import { promises as fs } from 'fs';
import path from 'path';

// Cloudflare R2 / AWS S3 Configuration
const endpoint = process.env.ENDPOINT || process.env.CLOUDFLARE_R2_ENDPOINT;
const accessKeyId = process.env.ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || "dummy-key";
const secretAccessKey = process.env.SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || "dummy-secret";
const region = endpoint ? "auto" : (process.env.AWS_REGION || "us-east-1");
const bucketName = process.env.BUCKET_NAME || process.env.R2_BUCKET_NAME || process.env.AWS_S3_BUCKET_NAME || "certificates";

// Safe local mode: Only upload to cloud when explicitly enabled (preserves cloud storage quota)
const uploadToCloud = process.env.UPLOAD_TO_CLOUD === "true";

const s3Client = new S3Client({
  region,
  ...(endpoint ? { endpoint } : {}),
  credentials: {
    accessKeyId,
    secretAccessKey,
  }
});

export async function processCertificateRecord(
  certificateId: string,
  pdfBuffer: Buffer,
  fileName: string,
  teamFolder?: string
) {
  try {
    // 1. ALWAYS save the certificate locally in this repo (generated_certificates folder)
    const baseDir = path.join(process.cwd(), 'generated_certificates');
    const sanitizedTeamFolder = teamFolder ? teamFolder.replace(/[<>:"/\\|?*]/g, '_').trim() : '';
    const localDir = sanitizedTeamFolder ? path.join(baseDir, sanitizedTeamFolder) : baseDir;
    
    await fs.mkdir(localDir, { recursive: true });
    
    // Sanitize fileName for filesystem
    const sanitizedFileName = fileName.replace(/[<>:"/\\|?*]/g, '_');
    const localFilePath = path.join(localDir, `${sanitizedFileName}.pdf`);
    await fs.writeFile(localFilePath, pdfBuffer);
    console.log(`💾 Saved certificate locally: ${localFilePath}`);

    const relativePath = sanitizedTeamFolder 
      ? `/generated_certificates/${sanitizedTeamFolder}/${sanitizedFileName}.pdf`
      : `/generated_certificates/${sanitizedFileName}.pdf`;
    let certificateUrl = relativePath;

    // 2. Upload to Cloudflare R2 / AWS S3 ONLY if UPLOAD_TO_CLOUD is true
    if (uploadToCloud && accessKeyId && accessKeyId !== "dummy-key") {
      const s3Url = endpoint
        ? `${endpoint}/${bucketName}/${sanitizedFileName}.pdf`
        : `https://${bucketName}.s3.${region}.amazonaws.com/${sanitizedFileName}.pdf`;

      const uploadParams = {
        Bucket: bucketName,
        Key: `${sanitizedFileName}.pdf`,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
      };
      await s3Client.send(new PutObjectCommand(uploadParams));
      console.log(`✅ Uploaded certificate to Cloud: ${s3Url}`);
      certificateUrl = s3Url;
    } else {
      console.log(`ℹ️ Preserved Cloud Storage: Local file saved at ${localFilePath}`);
    }

    // 3. Update the database status to COMPLETED (if certificateId provided and not a local test)
    if (certificateId && certificateId !== "local-test" && !certificateId.startsWith("test-")) {
      try {
        await prisma.certificate.update({
          where: { id: certificateId },
          data: {
            status: "COMPLETED",
            fileUrl: certificateUrl,
            fileName: `${sanitizedFileName}.pdf`,
          },
        });
      } catch (dbErr) {
        console.warn(`⚠️ Prisma status update warning for ${certificateId}:`, (dbErr as Error).message);
      }
    }

    return { success: true, localFilePath, certificateUrl };

  } catch (error) {
    console.error("❌ Failed to process certificate record:", error);
    
    // If it fails, mark it as FAILED in the database if available
    if (certificateId && certificateId !== "local-test") {
      try {
        await prisma.certificate.update({
          where: { id: certificateId },
          data: { status: "FAILED" },
        });
      } catch {
        // ignore db secondary error
      }
    }
    
    throw error;
  }
}