"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import { TravelImage } from "@/components/common/TravelImage";
import { showFeedback } from "@/components/common/AppFeedback";
import { setCachedAuthMember } from "@/lib/auth-state";
import { ApiError, apiMutation } from "@/lib/api/client";
import {
  deleteUploadedPhoto,
  getUploadConfiguration,
  uploadPhoto,
  type UploadConfiguration,
} from "@/lib/uploads/client";
import type { AuthMember } from "@/types";

export function ProfileEditor({ member }: { member: AuthMember }) {
  const [savedMember, setSavedMember] = useState(member);
  const [imageUrl, setImageUrl] = useState(member.profileImageUrl ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadConfig, setUploadConfig] = useState<UploadConfiguration | null>(null);
  const [uploadConfigFailed, setUploadConfigFailed] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    getUploadConfiguration()
      .then(setUploadConfig)
      .catch(() => setUploadConfigFailed(true));
  }, []);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const displayImage = previewUrl ?? (imageUrl || null);

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setStatus(null);
    if (!file) {
      setImageFile(null);
      setPreviewUrl(null);
      return;
    }
    if (!uploadConfig?.acceptedTypes.includes(file.type)) {
      setStatus("JPG, PNG, WebP 이미지만 선택해 주세요.");
      event.target.value = "";
      return;
    }
    if (file.size > uploadConfig.maxBytes) {
      setStatus(`이미지는 ${Math.round(uploadConfig.maxBytes / 1024 / 1024)}MB 이하여야 합니다.`);
      event.target.value = "";
      return;
    }
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const previousImageUrl = savedMember.profileImageUrl;
    let uploaded: { objectKey: string; publicUrl: string } | null = null;
    setPending(true);
    setStatus(null);
    setUploadProgress(imageFile ? 0 : null);
    try {
      if (imageFile) {
        uploaded = await uploadPhoto(imageFile, setUploadProgress);
      }
      const nextImageUrl = uploaded?.publicUrl ?? (imageUrl.trim() || null);
      const result = await apiMutation<AuthMember>("/api/private/profile", "PATCH", {
        displayName: formData.get("displayName"),
        bio: formData.get("bio"),
        profileImageUrl: nextImageUrl,
      });
      if (result) {
        setSavedMember(result);
        setCachedAuthMember(result);
        setImageUrl(result.profileImageUrl ?? "");
        setImageFile(null);
        setPreviewUrl(null);
      }
      if (previousImageUrl && previousImageUrl !== nextImageUrl) {
        void deleteUploadedPhoto({ publicUrl: previousImageUrl }).catch(() => undefined);
      }
      setStatus("프로필을 저장했습니다.");
      showFeedback("프로필 변경사항을 저장했습니다.", "success");
    } catch (error) {
      if (uploaded) {
        void deleteUploadedPhoto({ objectKey: uploaded.objectKey }).catch(() => undefined);
      }
      setStatus(error instanceof ApiError ? error.message : "프로필을 저장하지 못했습니다.");
    } finally {
      setPending(false);
      setUploadProgress(null);
    }
  }

  return (
    <form id="profile" className="studio-profile settings-profile" onSubmit={handleSubmit}>
      <div className="studio-profile__heading">
        <div>
          <p className="eyebrow">Public profile</p>
          <h2>공개 프로필</h2>
        </div>
        <span>@{savedMember.username}</span>
      </div>

      <div className="settings-avatar">
        <TravelImage
          src={displayImage}
          alt={`${savedMember.displayName} 프로필 이미지 미리보기`}
          fallbackLabel={savedMember.username.slice(0, 2)}
          className="settings-avatar__preview"
        />
        <div className="settings-avatar__actions">
          <strong>프로필 사진</strong>
          <p>얼굴이나 나를 잘 보여주는 정사각형 이미지를 권장합니다. JPG, PNG, WebP · 최대 10MB</p>
          <div>
            <label className={`settings-avatar__upload${uploadConfig?.configured ? "" : " is-disabled"}`}>
              <span>{imageFile
                ? "다른 사진 선택"
                : uploadConfig === null && !uploadConfigFailed
                  ? "업로드 확인 중…"
                  : uploadConfig?.configured
                    ? "사진 업로드"
                    : "파일 업로드 준비 중"}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={chooseImage}
                disabled={!uploadConfig?.configured || pending}
              />
            </label>
            {displayImage ? (
              <button type="button" onClick={() => { setImageFile(null); setPreviewUrl(null); setImageUrl(""); }} disabled={pending}>
                사진 삭제
              </button>
            ) : null}
          </div>
          {uploadConfig && !uploadConfig.configured ? (
            <small className="settings-avatar__notice" role="status">
              파일 저장소 연결이 아직 완료되지 않았습니다. 아래에서 이미지 URL을 등록할 수 있습니다.
            </small>
          ) : uploadConfigFailed ? (
            <small className="settings-avatar__notice is-error" role="alert">
              업로드 가능 여부를 확인하지 못했습니다. 새로고침 후 다시 시도해 주세요.
            </small>
          ) : null}
          {uploadProgress !== null ? <small role="status">업로드 {uploadProgress}%</small> : null}
        </div>
      </div>

      <label>
        <span>보여질 이름</span>
        <input
          name="displayName"
          defaultValue={savedMember.displayName}
          minLength={2}
          maxLength={60}
          aria-label="보여질 이름"
          aria-describedby="settings-display-name-help"
          required
        />
        <small id="settings-display-name-help" className="settings-field-help">
          프로필과 공개한 여행 기록에 표시됩니다. 사용자명 @{savedMember.username}은 프로필 주소와 검색에 사용돼요.
        </small>
      </label>
      <label>
        <span>소개</span>
        <textarea name="bio" defaultValue={savedMember.bio ?? ""} maxLength={300} rows={4} placeholder="어떤 여행을 좋아하는지 들려주세요." />
      </label>
      <details className="settings-image-url">
        <summary>이미지 URL 직접 입력</summary>
        <label>
          <span>프로필 이미지 URL</span>
          <input value={imageUrl} onChange={(event) => { setImageUrl(event.target.value); setImageFile(null); setPreviewUrl(null); }} type="url" placeholder="https://…" />
        </label>
      </details>
      <div className="studio-form-actions">
        <span aria-live="polite">{status}</span>
        <button type="submit" disabled={pending}>{pending ? "저장 중…" : "변경사항 저장"}</button>
      </div>
    </form>
  );
}
