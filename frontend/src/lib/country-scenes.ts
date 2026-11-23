import { randomInt } from "node:crypto";
import { cookies } from "next/headers";
import records from "./country-photo-credits.json";
import { journalPhotos } from "./journal-photos";

export type CountryCredit = {
  region: string;
  title: string;
  author: string;
  attribution: string;
  credit: string;
  license: string;
  licenseUrl: string;
  source: string;
};

export const countryCredits: Record<string, CountryCredit> = records;

export async function chooseScene() {
  const [previous, previousExample] = (await cookies()).get("tg_scene")?.value.split(".") ?? [];
  const candidates = Object.keys(countryCredits).filter(code => code !== previous);
  const code = candidates[randomInt(candidates.length)];
  const examples = journalPhotos.filter(photo => photo.id !== previousExample && photo.country !== code);
  return { code, scene: countryCredits[code], example: examples[randomInt(examples.length)] };
}
