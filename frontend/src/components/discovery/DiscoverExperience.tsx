"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

import { MemberCard } from "@/components/discovery/MemberCard";
import { ApiError } from "@/lib/api/client";
import { searchMembers } from "@/lib/api/discovery";
import type { MemberDiscovery } from "@/types";

export function DiscoverExperience({
  recommendations,
  viewerAuthenticated,
}: {
  recommendations: MemberDiscovery[];
  viewerAuthenticated: boolean;
}) {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [results, setResults] = useState<MemberDiscovery[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const normalized = query.trim();
    if (!normalized) return;
    const timer = window.setTimeout(() => void runSearch(normalized), 280);
    return () => window.clearTimeout(timer);
  // runSearch deliberately reads no reactive state; query alone controls this effect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function runSearch(value: string) {
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    setLoading(true);
    setError(null);
    try {
      const next = await searchMembers(value, viewerAuthenticated);
      if (requestId.current === currentRequest) {
        setResults(next);
        setSubmittedQuery(value);
      }
    } catch (caught) {
      if (requestId.current === currentRequest) {
        setError(caught instanceof ApiError ? caught.message : "검색 결과를 불러오지 못했습니다.");
      }
    } finally {
      if (requestId.current === currentRequest) setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = query.trim();
    if (normalized) void runSearch(normalized);
  }

  function changeQuery(value: string) {
    setQuery(value);
    if (!value.trim()) {
      requestId.current += 1;
      setSubmittedQuery("");
      setResults([]);
      setError(null);
      setLoading(false);
    }
  }

  const searching = Boolean(query.trim());
  const eligibleRecommendations = recommendations.filter(
    (member) => member.travelCount > 0 && member.countryCount > 0,
  );
  const visible = searching ? results : eligibleRecommendations;

  return (
    <>
      <form className="discover-search" role="search" onSubmit={submit}>
        <label htmlFor="member-search" className="sr-only">다른 여행자 검색</label>
        <div className="discover-search__field">
          <span aria-hidden="true">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
          </span>
          <input
            id="member-search"
            type="search"
            value={query}
            onChange={(event) => changeQuery(event.target.value)}
            placeholder="여행자 이름 또는 @사용자명 검색"
            autoComplete="off"
            maxLength={60}
          />
          {query ? <button type="button" onClick={() => changeQuery("")} aria-label="검색어 지우기">×</button> : null}
        </div>
        <p>추천에는 공개 Journey가 있는 여행자만 표시됩니다. 검색에서는 새로 가입한 친구도 찾을 수 있어요.</p>
      </form>

      <section className="discover-results" aria-labelledby="discover-results-heading" aria-busy={loading}>
        <header>
          <div>
            <p className="discover-results__eyebrow">{searching ? "SEARCH RESULTS" : "FEATURED TRAVELERS"}</p>
            <h2 id="discover-results-heading">
              {searching ? `“${submittedQuery || query.trim()}” 검색 결과` : "기록이 있는 여행자"}
            </h2>
            {!searching ? <p>방문한 나라와 최근 Journey가 있는 Travel World만 모았습니다.</p> : null}
          </div>
          <span aria-live="polite">{loading ? "찾는 중…" : `${visible.length}명`}</span>
        </header>

        {error ? <div className="discover-empty" role="alert"><strong>검색을 완료하지 못했습니다</strong><p>{error}</p></div> : null}
        {!error && !loading && visible.length === 0 ? (
          <div className="discover-empty">
            <strong>{searching ? "일치하는 여행자가 없습니다" : "아직 소개할 Travel World가 없어요"}</strong>
            <p>{searching ? "사용자명 일부나 보여질 이름으로 다시 검색해 보세요." : "공개 Journey가 쌓이면 이곳에서 새로운 여행 세계로 소개됩니다. 위 검색으로 친구를 먼저 찾아볼 수도 있어요."}</p>
          </div>
        ) : null}
        {!error && visible.length > 0 ? (
          <div className={`member-grid${loading ? " is-loading" : ""}`}>
            {visible.map((member) => (
              <MemberCard key={member.username} member={member} viewerAuthenticated={viewerAuthenticated} />
            ))}
          </div>
        ) : null}
      </section>
    </>
  );
}
