"use client";

import { useEffect, useState } from "react";

export type FeedbackTone = "success" | "error" | "info";

interface FeedbackMessage {
  id: number;
  message: string;
  tone: FeedbackTone;
}

type FeedbackListener = (feedback: FeedbackMessage) => void;

let nextFeedbackId = 0;
const feedbackListeners = new Set<FeedbackListener>();

export function showFeedback(message: string, tone: FeedbackTone = "info") {
  const feedback = { id: ++nextFeedbackId, message, tone };
  feedbackListeners.forEach((listener) => listener(feedback));
}

export function AppFeedback() {
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);

  useEffect(() => {
    const listener: FeedbackListener = (nextFeedback) => setFeedback(nextFeedback);
    feedbackListeners.add(listener);
    return () => {
      feedbackListeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(null), 3_600);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  return (
    <div className="app-feedback-region" aria-live="polite" aria-atomic="true">
      {feedback ? (
        <div className={`app-feedback is-${feedback.tone}`} role={feedback.tone === "error" ? "alert" : "status"}>
          <span className="app-feedback__icon" aria-hidden="true">
            {feedback.tone === "success" ? "✓" : feedback.tone === "error" ? "!" : "i"}
          </span>
          <span>{feedback.message}</span>
          <button type="button" onClick={() => setFeedback(null)} aria-label="알림 닫기">×</button>
        </div>
      ) : null}
    </div>
  );
}
