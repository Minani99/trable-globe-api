import { NextRequest, NextResponse } from "next/server";

import { forwardWithSession, isSameOriginRequest, passThrough } from "@/lib/api/auth-route";
import { authenticatedBackendGet, getCurrentMember, SESSION_COOKIE } from "@/lib/api/server-session";
import { deletePhotoObject, objectKeyFromPublicUrl } from "@/lib/uploads/r2";
import type { OwnedTravelSummary, TravelDetail } from "@/types";

export async function DELETE(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ success: false, data: null, message: "허용되지 않은 요청입니다." }, { status: 403 });
  }
  const member = await getCurrentMember();
  if (!member) {
    return NextResponse.json({ success: false, data: null, message: "로그인이 필요합니다." }, { status: 401 });
  }

  const owned = (await authenticatedBackendGet<OwnedTravelSummary[]>("/api/private/travels")) ?? [];
  const urls = new Set<string>();
  if (member.profileImageUrl) urls.add(member.profileImageUrl);
  for (const item of owned) {
    const detail = await authenticatedBackendGet<TravelDetail>(`/api/private/travels/${item.travel.id}`);
    if (!detail) continue;
    if (detail.coverImageUrl) urls.add(detail.coverImageUrl);
    detail.photos.forEach((photo) => urls.add(photo.imageUrl));
  }
  const backend = await forwardWithSession(
    "/api/auth/account",
    { method: "DELETE", body: await request.text() },
    request.cookies.get(SESSION_COOKIE)?.value,
  );
  const response = await passThrough(backend);
  if (response.ok) {
    await Promise.allSettled([...urls].map(async (publicUrl) => {
      const objectKey = objectKeyFromPublicUrl(member.id, publicUrl);
      if (objectKey) await deletePhotoObject(member.id, objectKey);
    }));
    response.cookies.delete(SESSION_COOKIE);
  }
  return response;
}
