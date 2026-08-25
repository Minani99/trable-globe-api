"use client";

import { FormEvent, useMemo, useState } from "react";

import { ApiError, apiMutation } from "@/lib/api/client";
import type { TravelTask, TravelTaskCategory } from "@/types";

const CATEGORY_LABELS: Record<TravelTaskCategory, string> = {
  RESERVATION: "예약",
  DOCUMENT: "서류",
  MONEY: "결제",
  PACKING: "짐",
  OTHER: "기타",
};

export function TravelChecklist({ travelId, initialTasks }: { travelId: number; initialTasks: TravelTask[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<TravelTaskCategory>("OTHER");
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const completedCount = useMemo(() => tasks.filter((task) => task.completed).length, [tasks]);
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  async function toggle(task: TravelTask) {
    const key = `toggle-${task.id}`;
    setPendingKey(key);
    setError(null);
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, completed: !item.completed } : item));
    try {
      const next = await apiMutation<TravelTask[]>(
        `/api/private/travels/${travelId}/tasks/${task.id}`,
        "PATCH",
        { completed: !task.completed },
      );
      if (next) setTasks(next);
    } catch (cause) {
      setTasks((current) => current.map((item) => item.id === task.id ? task : item));
      setError(cause instanceof ApiError ? cause.message : "준비 항목을 저장하지 못했습니다.");
    } finally {
      setPendingKey(null);
    }
  }

  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTitle = title.trim();
    if (!nextTitle) return;
    setPendingKey("create");
    setError(null);
    try {
      const next = await apiMutation<TravelTask[]>(
        `/api/private/travels/${travelId}/tasks`,
        "POST",
        { title: nextTitle, category },
      );
      if (next) setTasks(next);
      setTitle("");
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "준비 항목을 추가하지 못했습니다.");
    } finally {
      setPendingKey(null);
    }
  }

  async function remove(task: TravelTask) {
    const key = `delete-${task.id}`;
    setPendingKey(key);
    setError(null);
    try {
      const next = await apiMutation<TravelTask[]>(
        `/api/private/travels/${travelId}/tasks/${task.id}`,
        "DELETE",
      );
      if (next) setTasks(next);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "준비 항목을 삭제하지 못했습니다.");
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <section className="travel-checklist" aria-labelledby="travel-checklist-heading">
      <header>
        <div>
          <p className="eyebrow">Before you go</p>
          <h2 id="travel-checklist-heading">여행 준비 체크리스트</h2>
          <p>노션 템플릿을 찾지 않아도 기본 준비 항목부터 바로 체크할 수 있어요.</p>
        </div>
        <div className="travel-checklist__progress" aria-label={`${tasks.length}개 중 ${completedCount}개 완료`}>
          <strong>{progress}%</strong>
          <span><i style={{ width: `${progress}%` }} /></span>
          <small>{completedCount} / {tasks.length} 완료</small>
        </div>
      </header>

      {tasks.length ? (
        <ul className="travel-checklist__items">
          {tasks.map((task) => (
            <li key={task.id} className={task.completed ? "is-complete" : undefined}>
              <button
                type="button"
                className="travel-checklist__toggle"
                onClick={() => void toggle(task)}
                disabled={pendingKey !== null}
                aria-label={`${task.title} ${task.completed ? "미완료로 변경" : "완료로 변경"}`}
                aria-pressed={task.completed}
              >
                <span aria-hidden="true">{task.completed ? "✓" : ""}</span>
                <strong>{task.title}</strong>
              </button>
              <small>{CATEGORY_LABELS[task.category]}</small>
              <button
                type="button"
                className="travel-checklist__delete"
                onClick={() => void remove(task)}
                disabled={pendingKey !== null}
                aria-label={`${task.title} 삭제`}
              >×</button>
            </li>
          ))}
        </ul>
      ) : <p className="travel-checklist__empty">필요한 준비 항목을 아래에서 바로 추가해 보세요.</p>}

      <form className="travel-checklist__composer" onSubmit={addTask}>
        <label><span className="sr-only">새 준비 항목</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="예: 공항철도 예약" /></label>
        <label><span className="sr-only">항목 분류</span><select value={category} onChange={(event) => setCategory(event.target.value as TravelTaskCategory)}>{Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <button type="submit" disabled={pendingKey !== null || !title.trim()}>{pendingKey === "create" ? "추가 중…" : "＋ 추가"}</button>
      </form>
      {error ? <p className="travel-checklist__error" role="alert">{error}</p> : null}
    </section>
  );
}
