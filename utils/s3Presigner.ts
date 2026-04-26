// utils/s3Presigner.ts
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({ region: process.env.AWS_REGION });

export async function getSecureDownloadUrl(fileName: string) {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: `certificates/${fileName}.pdf`, // Ensure this matches exactly how you save it
  });

  // This link will securely expire after 7 days (604800 seconds)
  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 604800 });
  return signedUrl;
}