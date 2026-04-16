/**
 * Recurso gráfico da Play Store: exatamente 1024 x 500 px (PNG).
 * Uso: node scripts/generate-play-feature-graphic.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = path.join(root, "assets", "images", "logo-A.png");
const outDir = path.join(root, "assets", "store");
const out = path.join(outDir, "play-feature-graphic-1024x500.png");

async function main() {
  const fs = await import("node:fs/promises");
  await fs.mkdir(outDir, { recursive: true });

  const bg = sharp({
    create: {
      width: 1024,
      height: 500,
      channels: 4,
      background: { r: 15, g: 118, b: 110, alpha: 1 },
    },
  });

  const logoSize = 380;
  const logoBuf = await sharp(src)
    .resize(logoSize, logoSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const meta = await sharp(logoBuf).metadata();
  const lw = meta.width ?? logoSize;
  const lh = meta.height ?? logoSize;
  const left = Math.round((1024 - lw) / 2);
  const top = Math.round((500 - lh) / 2);

  await bg
    .composite([{ input: logoBuf, left, top }])
    .png()
    .toFile(out);

  const check = await sharp(out).metadata();
  console.log("Wrote:", out, check.width, "x", check.height);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
