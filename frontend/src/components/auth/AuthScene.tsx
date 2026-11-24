import { CountryPhoto } from "@/components/common/CountryPhoto";
import Link from "next/link";
import { chooseScene } from "@/lib/country-scenes";

export async function AuthScene() {
  const { code, scene } = await chooseScene();
  return <aside className="auth-scene" aria-label="여행의 한 장면">
    <CountryPhoto code={code} alt={`${scene.region} 여행 참고 사진`} sizes="(max-width: 700px) 100vw, 512px" priority />
    <div className="auth-scene__copy"><p>{scene.region}</p></div>
    <Link className="auth-scene__credit" prefetch={false} href={`/photo-credits?q=${code}#${code}`}>사진 출처</Link>
  </aside>;
}
