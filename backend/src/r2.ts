import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Env } from "./config.js";

export function isR2Configured(env: Env): boolean {
  return Boolean(env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET);
}

export function createR2Client(env: Env): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID!,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export function extFromMime(mime: string): string {
  const m = mime.toLowerCase().split(";")[0].trim();
  if (m === "application/pdf") return "pdf";
  if (m === "image/png") return "png";
  if (m === "image/webp") return "webp";
  if (m === "image/heic") return "heic";
  return "jpg";
}

export async function putExamObject(
  env: Env,
  storagePath: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  const client = createR2Client(env);
  await client.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET!,
      Key: storagePath,
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function deleteExamObject(env: Env, storagePath: string): Promise<void> {
  const client = createR2Client(env);
  await client.send(
    new DeleteObjectCommand({
      Bucket: env.R2_BUCKET!,
      Key: storagePath,
    })
  );
}

export async function presignGetExamObject(
  env: Env,
  storagePath: string,
  expiresSeconds: number
): Promise<string> {
  const client = createR2Client(env);
  const cmd = new GetObjectCommand({
    Bucket: env.R2_BUCKET!,
    Key: storagePath,
  });
  return getSignedUrl(client, cmd, { expiresIn: expiresSeconds });
}

/** Lê o objeto completo para proxy com Content-Disposition (download no browser). */
export async function getExamObjectBuffer(
  env: Env,
  storagePath: string
): Promise<{ body: Buffer; contentType: string | undefined }> {
  const client = createR2Client(env);
  const out = await client.send(
    new GetObjectCommand({
      Bucket: env.R2_BUCKET!,
      Key: storagePath,
    })
  );
  if (!out.Body) {
    throw new Error("empty_r2_body");
  }
  const bytes = await out.Body.transformToByteArray();
  return {
    body: Buffer.from(bytes),
    contentType: out.ContentType ?? undefined,
  };
}
