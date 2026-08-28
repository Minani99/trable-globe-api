"use client";

import { useRef, useSyncExternalStore } from "react";

const GUIDE_STORAGE_KEY = "travel-globe:orientation-seen";
const GUIDE_CHANGE_EVENT = "travel-globe:orientation-change";

function subscribeToGuideState(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(GUIDE_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(GUIDE_CHANGE_EVENT, callback);
  };
}

function getGuideState() {
  return window.localStorage.getItem(GUIDE_STORAGE_KEY) === "1";
}

export function LandingOrientationGuide() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const seen = useSyncExternalStore(subscribeToGuideState, getGuideState, () => true);

  const openGuide = () => {
    window.localStorage.setItem(GUIDE_STORAGE_KEY, "1");
    window.dispatchEvent(new Event(GUIDE_CHANGE_EVENT));
    dialogRef.current?.showModal();
  };

  return (
    <>
      <button
        type="button"
        className={`landing-guide-trigger${seen ? "" : " is-new"}`}
        onClick={openGuide}
      >
        <span aria-hidden="true">{seen ? "?" : "1·2·3"}</span>
        {seen ? "이용 방법" : "처음이신가요? 30초 안내"}
      </button>

      <dialog ref={dialogRef} className="landing-guide-dialog" aria-labelledby="landing-guide-title">
        <button
          type="button"
          className="landing-guide-dialog__close"
          aria-label="안내 닫기"
          onClick={() => dialogRef.current?.close()}
        >
          ×
        </button>
        <p className="eyebrow">How it works</p>
        <h2 id="landing-guide-title">여행 하나가 나의 세계가 되기까지</h2>
        <ol>
          <GuideStep number="01" title="Journey 시작하기" description="다녀온 여행을 바로 기록하거나 다음 여행의 나라와 날짜를 정합니다." />
          <GuideStep number="02" title="장소와 기억 잇기" description="방문한 장소를 확인하고 그곳의 사진과 메모를 가볍게 더합니다." />
          <GuideStep number="03" title="내 세계 채우기" description="완성된 Journey가 경로와 기억이 되어 나만의 지구본에 쌓입니다." />
        </ol>
        <button type="button" className="landing-guide-dialog__confirm" onClick={() => dialogRef.current?.close()}>
          알겠어요, 시작할게요
        </button>
      </dialog>
    </>
  );
}

function GuideStep({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <li>
      <span>{number}</span>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </li>
  );
}
