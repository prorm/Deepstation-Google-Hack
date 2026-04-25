// workers/certificateWorker.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const prisma = new PrismaClient();

export async function processCertificateRecord(
  certificateId: string, 
  finalPdfBuffer: Buffer, 
  fileName: string
) {
  try {
    // 1. Upload to S3
    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: `certificates/${fileName}.pdf`,
      Body: finalPdfBuffer,
      ContentType: 'application/pdf',
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    // The raw S3 URL (we can make this a pre-signed URL later when fetching)
    const s3Url = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/certificates/${fileName}.pdf`;

    // 2. Update the Database
    await prisma.certificate.update({
      where: { id: certificateId },
      data: {
        status: 'COMPLETED',
        fileUrl: s3Url,
      },
    });

    console.log(`✅ Success: Certificate ${certificateId} generated and logged.`);

  } catch (error) {
    console.error(`❌ Failed to process certificate ${certificateId}:`, error);
    
    // Fallback: Log the failure in the DB so your queue knows it failed
    await prisma.certificate.update({
      where: { id: certificateId },
      data: { status: 'FAILED' },
    });
  }
}   