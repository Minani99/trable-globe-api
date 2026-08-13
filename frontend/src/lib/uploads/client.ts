import { ApiError, apiMutation } from "@/lib/api/client";

export interface UploadConfiguration {
  configured: boolean;
  maxBytes: number;
  maxPhotos: number;
  acceptedTypes: string[];
}

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

export async function uploadPhoto(file: File, onProgress: (progress: number) => void) {
  const ticket = await apiMutation<UploadTicket>("/api/uploads/presign", "POST", {
    contentType: file.type,
    size: file.size,
  });
  if (!ticket) throw new ApiError(500, "사진 업로드 주소를 받지 못했습니다.");

  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", ticket.uploadUrl);
    request.setRequestHeader("Content-Type", file.type);
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
    request.send(file);
  });

  return { objectKey: ticket.objectKey, publicUrl: ticket.publicUrl };
}

export function deleteUploadedPhoto(input: { objectKey?: string | null; publicUrl?: string | null }) {
  return apiMutation<null>("/api/uploads/object", "DELETE", input);
}
