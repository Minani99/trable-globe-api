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
        <h2 id="landing-guide-title">여행 하나가 지구본의 기억이 되기까지</h2>
        <ol>
          <GuideStep number="01" title="계획 만들기" description="나라와 날짜를 고르면 일차별 일정이 바로 만들어집니다." />
          <GuideStep number="02" title="여행하며 체크하기" description="장소를 고르고 실제로 간 일정과 사진을 가볍게 더합니다." />
          <GuideStep number="03" title="기록으로 남기기" description="다녀온 계획을 다시 쓰지 않고 지구본의 여행 기록으로 바꿉니다." />
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
