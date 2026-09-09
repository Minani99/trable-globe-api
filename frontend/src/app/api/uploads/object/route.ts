import { NextRequest, NextResponse } from "next/server";

import { isSameOriginRequest } from "@/lib/api/auth-route";
import { getCurrentMember } from "@/lib/api/server-session";
import { deletePhotoObject, objectKeyFromPublicUrl } from "@/lib/uploads/r2";

export async function DELETE(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ success: false, data: null, message: "허용되지 않은 요청입니다." }, { status: 403 });
  }
  const member = await getCurrentMember();
  if (!member) {
    return NextResponse.json({ success: false, data: null, message: "로그인이 필요합니다.", error: { code: "AUTHENTICATION_REQUIRED" } }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { objectKey?: string; publicUrl?: string } | null;
  try {
    const objectKey = body?.objectKey || objectKeyFromPublicUrl(member.id, body?.publicUrl ?? "");
    if (!objectKey) {
      return NextResponse.json({ success: true, data: null, message: "관리 대상 사진이 아닙니다." });
    }
    await deletePhotoObject(member.id, objectKey);
    return NextResponse.json({ success: true, data: null, message: "사진을 삭제했습니다." });
  } catch (error) {
    return NextResponse.json(
      { success: false, data: null, message: error instanceof Error ? error.message : "사진을 삭제하지 못했습니다." },
      { status: 400 },
    );
  }
}
