import "server-only";

import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { AwsClient } from "aws4fetch";

const CONTENT_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_TRAVEL_PHOTOS = 30;

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string;
}

let cachedClient: S3Client | null = null;

function config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET_NAME?.trim();
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.trim().replace(/\/+$/, "");
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl };
}

export function uploadStorageConfigured() {
  return config() !== null;
}

function client(storage: R2Config) {
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: "auto",
      endpoint: `https://${storage.accountId}.r2.cloudflarestorage.com`,
      // The SDK defaults to CRC32 for supported uploads. A presigner has no file
      // body yet, so that default signs the checksum of an empty object and R2
      // rejects the real browser payload with SignatureDoesNotMatch.
      requestChecksumCalculation: "WHEN_REQUIRED",
      credentials: {
        accessKeyId: storage.accessKeyId,
        secretAccessKey: storage.secretAccessKey,
      },
    });
  }
  return cachedClient;
}

export function validateUpload(contentType: string, size: number) {
  const extension = CONTENT_TYPES.get(contentType);
  if (!extension) throw new Error("JPG, PNG, WebP 사진만 업로드할 수 있습니다.");
  if (!Number.isInteger(size) || size < 1 || size > MAX_UPLOAD_BYTES) {
    throw new Error("사진 한 장은 10MB 이하여야 합니다.");
  }
  return extension;
}

export async function createPhotoUpload(memberId: number, contentType: string, size: number) {
  const storage = config();
  if (!storage) throw new Error("PHOTO_STORAGE_NOT_CONFIGURED");
  const extension = validateUpload(contentType, size);
  const objectKey = `members/${memberId}/photos/${crypto.randomUUID()}.${extension}`;
  const uploadUrl = new URL(
    `https://${storage.accountId}.r2.cloudflarestorage.com/${encodeURIComponent(storage.bucket)}/${objectKey.split("/").map(encodeURIComponent).join("/")}`,
  );
  uploadUrl.searchParams.set("X-Amz-Expires", "300");
  const signer = new AwsClient({
    accessKeyId: storage.accessKeyId,
    secretAccessKey: storage.secretAccessKey,
    service: "s3",
    region: "auto",
  });
  const signedRequest = await signer.sign(new Request(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
  }), { aws: { signQuery: true, allHeaders: true } });
  const publicUrl = `${storage.publicBaseUrl}/${objectKey.split("/").map(encodeURIComponent).join("/")}`;
  return { objectKey, uploadUrl: signedRequest.url, publicUrl, expiresInSeconds: 300 };
}

export async function deletePhotoObject(memberId: number, objectKey: string) {
  const storage = config();
  if (!storage) throw new Error("PHOTO_STORAGE_NOT_CONFIGURED");
  const expectedPrefix = `members/${memberId}/photos/`;
  if (!objectKey.startsWith(expectedPrefix) || objectKey.includes("..")) {
    throw new Error("삭제할 수 없는 사진 경로입니다.");
  }
  await client(storage).send(new DeleteObjectCommand({ Bucket: storage.bucket, Key: objectKey }));
}

export function objectKeyFromPublicUrl(memberId: number, publicUrl: string) {
  const storage = config();
  if (!storage || !publicUrl.startsWith(`${storage.publicBaseUrl}/`)) return null;
  const key = decodeURIComponent(publicUrl.slice(storage.publicBaseUrl.length + 1));
  return key.startsWith(`members/${memberId}/photos/`) ? key : null;
}
