import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from "@/lib/prisma";

// Cloudflare R2 / AWS S3 Configuration
const endpoint = process.env.ENDPOINT || process.env.CLOUDFLARE_R2_ENDPOINT;
const accessKeyId = process.env.ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || "dummy-key";
const secretAccessKey = process.env.SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || "dummy-secret";
const region = endpoint ? "auto" : (process.env.AWS_REGION || "us-east-1");
const bucketName = process.env.BUCKET_NAME || process.env.R2_BUCKET_NAME || process.env.AWS_S3_BUCKET_NAME || "certificates";

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
  fileName: string
) {
  try {
    const s3Url = endpoint
      ? `${endpoint}/${bucketName}/${fileName}.pdf`
      : `https://${bucketName}.s3.${region}.amazonaws.com/${fileName}.pdf`;

    // Upload if valid keys are provided
    if (accessKeyId && accessKeyId !== "dummy-key") {
      const uploadParams = {
        Bucket: bucketName,
        Key: `${fileName}.pdf`,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
      };
      await s3Client.send(new PutObjectCommand(uploadParams));
      console.log(`✅ Uploaded certificate: ${s3Url}`);
    } else {
      console.warn(`⚠️ Storage Keys missing in .env. Skipped upload for ${fileName}.`);
    }

    // Update the database status to COMPLETED
    await prisma.certificate.update({
      where: { id: certificateId },
      data: {
        status: "COMPLETED",
        fileUrl: s3Url,
      },
    });

  } catch (error) {
    console.error("❌ Failed to process certificate record:", error);
    
    // If it fails, mark it as FAILED in the database
    await prisma.certificate.update({
      where: { id: certificateId },
      data: { status: "FAILED" },
    });
    
    throw error; // Re-throw so Inngest knows it failed and can retry
  }
}