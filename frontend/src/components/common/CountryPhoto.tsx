import Image from "next/image";

export function CountryPhoto({ code, alt, sizes, priority = false }: {
  code: string;
  alt: string;
  sizes: string;
  priority?: boolean;
}) {
  return <Image src={`/images/countries/${code}.webp`} alt={alt}
    width={960} height={640} sizes={sizes} loading={priority ? "eager" : "lazy"} />;
}
