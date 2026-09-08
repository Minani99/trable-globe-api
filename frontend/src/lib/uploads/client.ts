import { ApiError, apiMutation } from "@/lib/api/client";

export interface UploadConfiguration {
  configured: boolean;
  maxBytes: number;
  maxPhotos: number;
  acceptedTypes: string[];
}

export interface PhotoUploadResult {
  objectKey: string;
  publicUrl: string;
  sourceBytes: number;
  uploadedBytes: number;
  optimized: boolean;
}

export const MAX_SOURCE_IMAGE_BYTES = 30 * 1024 * 1024;
const MAX_IMAGE_EDGE = 2560;
const OPTIMIZE_ABOVE_BYTES = 2 * 1024 * 1024;

interface UploadTicket {
  objectKey: string;
  uploadUrl: string;
  publicUrl: string;
  expiresInSeconds: number;
}

export async function getUploadConfiguration(): Promise<UploadConfiguration> {
  const response = await fetch("/api/uploads/presign", { headers: { Accept: "application/json" }, cache: "no-store" });
  const body = (await response.json()) as { success: boolean; data: UploadConfiguration | null; message: string | null };
  if (!response.ok || !body.success || !body.data) throw new ApiError(response.status, body.message ?? "업로드 설정을 확인하지 못했습니다.");
  return body.data;
}

export async function uploadPhoto(file: File, onProgress: (progress: number) => void): Promise<PhotoUploadResult> {
  const prepared = await preparePhoto(file);
  onProgress(1);
  const ticket = await apiMutation<UploadTicket>("/api/uploads/presign", "POST", {
    contentType: prepared.file.type,
    size: prepared.file.size,
  });
  if (!ticket) throw new ApiError(500, "사진 업로드 주소를 받지 못했습니다.");

  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", ticket.uploadUrl);
    request.setRequestHeader("Content-Type", prepared.file.type);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(new ApiError(request.status, "사진 저장소가 업로드를 거절했습니다. 저장소 CORS 설정을 확인해 주세요."));
      }
    };
    request.onerror = () => reject(new ApiError(0, "사진 업로드 중 네트워크 연결이 끊겼습니다."));
    request.onabort = () => reject(new ApiError(0, "사진 업로드가 취소되었습니다."));
    request.send(prepared.file);
  });

  return {
    objectKey: ticket.objectKey,
    publicUrl: ticket.publicUrl,
    sourceBytes: file.size,
    uploadedBytes: prepared.file.size,
    optimized: prepared.file !== file,
  };
}

export function deleteUploadedPhoto(input: { objectKey?: string | null; publicUrl?: string | null }) {
  return apiMutation<null>("/api/uploads/object", "DELETE", input);
}

async function preparePhoto(file: File): Promise<{ file: File }> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new ApiError(400, "JPG, PNG, WebP 사진만 올릴 수 있습니다.");
  }
  if (file.size < 1 || file.size > MAX_SOURCE_IMAGE_BYTES) {
    throw new ApiError(400, "원본 사진은 장당 30MB 이하여야 합니다.");
  }

  let decoded: DecodedImage | null = null;
  try {
    decoded = await decodeImage(file);
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(decoded.width, decoded.height));
    if (scale === 1 && file.size <= OPTIMIZE_ABOVE_BYTES) return { file };

    const width = Math.max(1, Math.round(decoded.width * scale));
    const height = Math.max(1, Math.round(decoded.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: file.type !== "image/jpeg" });
    if (!context) throw new Error("CANVAS_UNAVAILABLE");
    context.drawImage(decoded.source, 0, 0, width, height);

    const outputType = file.type === "image/jpeg" ? "image/jpeg" : "image/webp";
    const blob = await canvasToBlob(canvas, outputType, 0.84);
    if (blob.size >= file.size && scale === 1) return { file };
    return {
      file: new File([blob], optimizedFilename(file.name, outputType), {
        type: outputType,
        lastModified: file.lastModified,
      }),
    };
  } catch (error) {
    if (file.size <= 10 * 1024 * 1024) return { file };
    throw new ApiError(400, error instanceof ApiError ? error.message : "사진을 최적화하지 못했습니다. 다른 사진을 선택해 주세요.");
  } finally {
    decoded?.dispose();
  }
}

interface DecodedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  dispose: () => void;
}

async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { source: bitmap, width: bitmap.width, height: bitmap.height, dispose: () => bitmap.close() };
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";
  image.src = objectUrl;
  try {
    await image.decode();
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      dispose: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("IMAGE_ENCODING_FAILED")), type, quality);
  });
}

function optimizedFilename(filename: string, type: string): string {
  const stem = filename.replace(/\.[^.]+$/, "") || "travel-photo";
  return `${stem}.${type === "image/webp" ? "webp" : "jpg"}`;
}
