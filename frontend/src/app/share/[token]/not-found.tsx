import Link from "next/link";
export default function SharedPlanNotFound() {
  return <main className="shared-plan site-shell"><h1>공유가 종료된 일정입니다</h1><p>링크가 잘못되었거나 만든 사람이 공유를 껐을 수 있어요. 새 링크를 요청해 주세요.</p><Link href="/">홈으로 돌아가기</Link></main>;
}
