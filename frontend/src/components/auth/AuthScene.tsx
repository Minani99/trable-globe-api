import Link from "next/link";
import { chooseScene } from "@/lib/country-scenes";

export async function AuthScene() {
  const { code, scene } = await chooseScene();
  return <aside className="auth-scene" aria-label="여행의 한 장면">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={`/images/countries/${code}.webp`} alt={`${scene.region} 여행 참고 사진`} decoding="async" />
    <div className="auth-scene__copy"><p>{scene.region}</p></div>
    <Link className="auth-scene__credit" href={`/photo-credits#${code}`}>사진 출처</Link>
  </aside>;
}
