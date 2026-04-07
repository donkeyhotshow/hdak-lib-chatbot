/**
 * Generates PWA icons (192x192 and 512x512 PNG) from the SVG logo.
 * Run once: node scripts/generate-icons.mjs
 * Requires: npm install --save-dev sharp
 */
import sharp from "sharp";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const svgPath = join(root, "public", "favicon.svg");
const svg = readFileSync(svgPath);

for (const size of [192, 512]) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(join(root, "public", "icons", `icon-${size}.png`));
  console.log(`✓ icon-${size}.png`);
}
