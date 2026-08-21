"use client";

import { useRef, useState } from "react";

import { profileRecapImagePath } from "@/lib/config";

interface RecapActionsProps {
  displayName: string;
  username: string;
  year: number | null;
  shareText: string;
}

function recapScope(year: number | null): string {
  return year ? `${year}년 여행 세계` : "여행 세계";
}

function recapFilename(username: string, year: number | null): string {
  return `travel-globe-${username}-${year ?? "all"}.png`;
}

export function RecapActions({ displayName, username, year, shareText }: RecapActionsProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"download" | "share" | null>(null);
  const imagePath = profileRecapImagePath(username, year);
  const fileRequestRef = useRef<{ path: string; request: Promise<File> } | null>(null);

  function fetchRecapFile(): Promise<File> {
    if (fileRequestRef.current?.path === imagePath) return fileRequestRef.current.request;

    const request = fetch(imagePath)
      .then(async (response) => {
        if (!response.ok) throw new Error("Recap image request failed");
        const blob = await response.blob();
        return new File([blob], recapFilename(username, year), { type: "image/png" });
      })
      .catch((error: unknown) => {
        if (fileRequestRef.current?.path === imagePath) fileRequestRef.current = null;
        throw error;
      });
    fileRequestRef.current = { path: imagePath, request };
    return request;
  }

  async function downloadRecap() {
    setStatus(null);
    setBusyAction("download");
    try {
      const file = await fetchRecapFile();
      const objectUrl = URL.createObjectURL(file);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = file.name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
      setStatus("리캡 이미지를 저장했습니다.");
    } catch {
      window.open(imagePath, "_blank", "noopener,noreferrer");
      setStatus("이미지를 새 창에서 열었습니다.");
    } finally {
      setBusyAction(null);
    }
  }

  async function shareRecap() {
    setStatus(null);
    setBusyAction("share");
    const scope = recapScope(year);
    const shareUrl = new URL(window.location.href);
    if (year === null) shareUrl.searchParams.delete("year");
    else shareUrl.searchParams.set("year", String(year));

    try {
      if (navigator.share) {
        const file = await fetchRecapFile();
        const fileShareData: ShareData = {
          files: [file],
          title: `${displayName}의 ${scope}`,
          text: shareText,
        };
        if (navigator.canShare?.(fileShareData)) {
          await navigator.share(fileShareData);
          setStatus("리캡 이미지를 공유했습니다.");
          return;
        }
        await navigator.share({
          title: `${displayName}의 ${scope}`,
          text: shareText,
          url: shareUrl.toString(),
        });
        return;
      }

      await navigator.clipboard.writeText(shareUrl.toString());
      setStatus("리캡 링크를 복사했습니다.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(shareUrl.toString());
        setStatus("리캡 링크를 복사했습니다.");
      } catch {
        setStatus("주소창의 링크를 복사해 주세요.");
      }
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="recap-actions">
      <div className="recap-actions__buttons">
        <button type="button" onClick={downloadRecap} disabled={busyAction !== null}>
          <DownloadIcon />
          {busyAction === "download" ? "이미지 준비 중" : "이미지 저장"}
        </button>
        <button type="button" onClick={shareRecap} disabled={busyAction !== null}>
          <ShareIcon />
          {busyAction === "share" ? "공유 준비 중" : "리캡 공유"}
        </button>
      </div>
      <span className="recap-actions__status" role="status" aria-live="polite">
        {status}
      </span>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <path d="M10 3v9m0 0 3.25-3.25M10 12 6.75 8.75M4 15.5h12" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <circle cx="5" cy="10" r="2" />
      <circle cx="15" cy="5" r="2" />
      <circle cx="15" cy="15" r="2" />
      <path d="m6.8 9.1 6.4-3.2M6.8 10.9l6.4 3.2" />
    </svg>
  );
}
