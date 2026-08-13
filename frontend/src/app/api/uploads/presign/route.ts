import { NextRequest, NextResponse } from "next/server";

import { isSameOriginRequest } from "@/lib/api/auth-route";
import { getCurrentMember } from "@/lib/api/server-session";
import {
  createPhotoUpload,
  MAX_TRAVEL_PHOTOS,
  MAX_UPLOAD_BYTES,
  uploadStorageConfigured,
} from "@/lib/uploads/r2";

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      configured: uploadStorageConfigured(),
      maxBytes: MAX_UPLOAD_BYTES,
      maxPhotos: MAX_TRAVEL_PHOTOS,
      acceptedTypes: ["image/jpeg", "image/png", "image/webp"],
    },
    message: null,
  });
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { success: false, data: null, message: "허용되지 않은 요청입니다." },
      { status: 403 },
    );
  }
  const member = await getCurrentMember();
  if (!member) {
    return NextResponse.json(
      { success: false, data: null, message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }
  const body = (await request.json().catch(() => null)) as { contentType?: string; size?: number } | null;
  try {
    const upload = await createPhotoUpload(member.id, body?.contentType ?? "", Number(body?.size));
    return NextResponse.json({ success: true, data: upload, message: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "사진 업로드를 준비하지 못했습니다.";
    return NextResponse.json(
      {
        success: false,
        data: null,
        message: message === "PHOTO_STORAGE_NOT_CONFIGURED"
          ? "사진 저장소 설정이 필요합니다. 현재는 이미지 URL을 사용할 수 있습니다."
          : message,
      },
      { status: message === "PHOTO_STORAGE_NOT_CONFIGURED" ? 503 : 400 },
    );
  }
}
