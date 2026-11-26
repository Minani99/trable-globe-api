import { Suspense } from "react";
import Form from "next/form";
import Link from "next/link";
import { apiGet } from "@/lib/api/client";
import { authenticatedBackendGet } from "@/lib/api/server-session";

interface Course {
  travelId: number; username: string; title: string; date: string; day: number;
  stops: number; firstStop: string; lastStop: string; transport: string | null; reflection: string | null;
}

type CourseFinderProps = { destination: string; signedIn: boolean };

export function CourseFinder({ destination, signedIn }: CourseFinderProps) {
  return <section className="discover-courses" aria-labelledby="course-finder-title">
    <h2 id="course-finder-title">목적지로 하루 코스 찾기</h2>
    <Form action="/discover" role="search" aria-label="하루 코스 검색">
      <input key={destination} name="destination" type="search" aria-label="목적지 또는 장소" placeholder="도시, 나라 또는 장소 이름" maxLength={60} defaultValue={destination} />
      <button type="submit">코스 찾기</button>
    </Form>
    {destination && <Link href="/discover">전체 둘러보기</Link>}
    <Suspense key={destination} fallback={<p role="status">코스를 불러오는 중…</p>}>
      <CourseResults destination={destination} signedIn={signedIn} />
    </Suspense>
  </section>;
}

async function CourseResults({ destination, signedIn }: CourseFinderProps) {
  const suffix = "/discovery/courses?destination=" + encodeURIComponent(destination);
  let courses: Course[] | null;
  try {
    courses = signedIn ? await authenticatedBackendGet<Course[]>("/api/private" + suffix) : await apiGet<Course[]>("/api" + suffix, { cache: false });
  } catch {
    courses = null;
  }
  return <>
    <p role="status">{courses === null ? "코스를 불러오지 못했습니다. 잠시 후 다시 검색해 주세요." :
      destination ? (courses.length ? `‘${destination}’에서 찾은 하루 코스` : `‘${destination}’에 해당하는 공개 코스가 없습니다. 가까운 도시 이름으로도 찾아보세요.`) :
      courses.length ? "최근 다녀온 하루 코스" : "아직 공개된 하루 코스가 없습니다."}</p>
    {courses && courses.length > 0 && <ul>{courses.map(course => <li key={course.travelId + ":" + course.date}>
      <Link prefetch={false} href={`/${encodeURIComponent(course.username)}/travel/${course.travelId}?routeDay=${course.date}#course-map`}>
        <small>{course.day}일차 · {course.stops}곳{course.transport && " · " + course.transport}</small>
        <strong>{course.firstStop}{course.stops > 1 && " → " + course.lastStop}</strong>
        <span>{course.title}</span>
        {course.reflection && <p>다시 간다면 · {course.reflection}</p>}
      </Link>
    </li>)}</ul>}
  </>;
}
