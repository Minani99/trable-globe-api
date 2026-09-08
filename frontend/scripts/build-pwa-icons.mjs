import { fileURLToPath } from "node:url";
import path from "node:path";

import sharp from "sharp";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(projectRoot, "src", "app", "icon.svg");
const output = path.join(projectRoot, "public");

await Promise.all([180, 192, 512].map((size) => (
  sharp(source)
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(path.join(output, `icon-${size}.png`))
)));
