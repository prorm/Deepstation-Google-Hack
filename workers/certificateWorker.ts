import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';

// Fallbacks prevent the app from hard-crashing if the .env vars are missing
const region = process.env.AWS_REGION || "us-east-1"; 

const s3Client = new S3Client({
  region: region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "dummy-key",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "dummy-secret",
  }
});

const prisma = new PrismaClient();

export async function processCertificateRecord(
  certificateId: string,
  pdfBuffer: Buffer,
  fileName: string
) {
  try {
    const bucketName = process.env.AWS_S3_BUCKET_NAME || "dummy-local-bucket";
    const s3Url = `https://${bucketName}.s3.${region}.amazonaws.com/${fileName}.pdf`;

    // Only attempt real AWS upload if you have the keys in your .env
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_ACCESS_KEY_ID !== "dummy-key") {
      const uploadParams = {
        Bucket: bucketName,
        Key: `${fileName}.pdf`,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
      };
      await s3Client.send(new PutObjectCommand(uploadParams));
      console.log(`✅ Uploaded to S3: ${s3Url}`);
    } else {
      console.warn(`⚠️ AWS Keys missing in .env. Skipped real S3 upload for ${fileName}.`);
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