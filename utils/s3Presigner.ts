import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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
  },
});

export async function getSecureDownloadUrl(fileName: string) {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: `${fileName}.pdf`,
  });

  // This link will securely expire after 7 days (604800 seconds)
  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 604800 });
  return signedUrl;
}