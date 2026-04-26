// workers/certificateWorker.ts

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '@/lib/prisma';

// FAIL FAST: Check environment variables before the worker even tries to run
if (!process.env.AWS_REGION || !process.env.AWS_S3_BUCKET_NAME) {
  throw new Error("CRITICAL: Missing AWS environment variables for S3.");
}

const s3Client = new S3Client({ region: process.env.AWS_REGION });

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

    const s3Url = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/certificates/${fileName}.pdf`;

    // 2. Update DB
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

    await prisma.certificate.update({
      where: { id: certificateId },
      data: { status: 'FAILED' },
    });
  }
}