"use client";

import { FormEvent, useState } from "react";

import { ApiError, apiMutation } from "@/lib/api/client";
import type { AuthMember } from "@/types";

export function ProfileEditor({ member }: { member: AuthMember }) {
  const [savedMember, setSavedMember] = useState(member);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPending(true);
    setStatus(null);
    try {
      const result = await apiMutation<AuthMember>("/api/private/profile", "PATCH", {
        displayName: formData.get("displayName"),
        bio: formData.get("bio"),
        profileImageUrl: formData.get("profileImageUrl") || null,
      });
      if (result) setSavedMember(result);
      setStatus("프로필을 저장했습니다.");
    } catch (error) {
      setStatus(error instanceof ApiError ? error.message : "프로필을 저장하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="studio-profile" onSubmit={handleSubmit}>
      <div className="studio-profile__heading">
        <div>
          <p className="eyebrow">Public profile</p>
          <h2>프로필</h2>
        </div>
        <span>@{savedMember.username}</span>
      </div>
      <label><span>이름</span><input name="displayName" defaultValue={savedMember.displayName} maxLength={60} required /></label>
      <label><span>소개</span><textarea name="bio" defaultValue={savedMember.bio ?? ""} maxLength={300} rows={3} /></label>
      <label><span>프로필 이미지 URL</span><input name="profileImageUrl" type="url" defaultValue={savedMember.profileImageUrl ?? ""} placeholder="https://…" /></label>
      <div className="studio-form-actions">
        <span aria-live="polite">{status}</span>
        <button type="submit" disabled={pending}>{pending ? "저장 중…" : "프로필 저장"}</button>
      </div>
    </form>
  );
}
