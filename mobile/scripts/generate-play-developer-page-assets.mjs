/**
 * Página do programador na Play Store:
 * - Ícone: 512×512 px, JPEG opaco (sem transparência), ≤1 MB
 * - Cabeçalho: 4096×2304 px, JPEG (para caber em ≤1 MB), opaco
 *
 * Uso: node scripts/generate-play-developer-page-assets.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = path.join(root, "assets", "images", "logo-A.png");
const outDir = path.join(root, "assets", "store");

const BRAND = { r: 15, g: 118, b: 110 };

async function write512Icon() {
  const out = path.join(outDir, "play-developer-icon-512.jpg");
  const logoBuf = await sharp(src)
    .resize(440, 440, {
      fit: "contain",
      background: BRAND,
    })
    .flatten({ background: BRAND })
    .jpeg({ quality: 93 })
    .toBuffer();

  const meta = await sharp(logoBuf).metadata();
  const w = meta.width ?? 440;
  const h = meta.height ?? 440;
  const left = Math.round((512 - w) / 2);
  const top = Math.round((512 - h) / 2);

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 3,
      background: BRAND,
    },
  })
    .composite([{ input: logoBuf, left, top }])
    .jpeg({ quality: 93, chromaSubsampling: "4:4:4" })
    .toFile(out);

  const stat = await import("node:fs/promises").then((fs) => fs.stat(out));
  console.log("Wrote:", out, "512×512", (stat.size / 1024).toFixed(1), "KB");
  return out;
}

async function write4096Header() {
  const outJpg = path.join(outDir, "play-developer-header-4096x2304.jpg");
  const W = 4096;
  const H = 2304;

  const logoMaxH = Math.round(H * 0.42);
  const logoBuf = await sharp(src)
    .resize({ height: logoMaxH, fit: "inside" })
    .flatten({ background: BRAND })
    .png()
    .toBuffer();

  const lm = await sharp(logoBuf).metadata();
  const lw = lm.width ?? 1;
  const lh = lm.height ?? 1;
  const left = Math.round((W - lw) / 2);
  const top = Math.round((H - lh) / 2);

  const base = sharp({
    create: {
      width: W,
      height: H,
      channels: 3,
      background: BRAND,
    },
  });

  await base
    .composite([{ input: logoBuf, left, top }])
    .jpeg({ quality: 88, chromaSubsampling: "4:4:4" })
    .toFile(outJpg);

  const stat = await import("node:fs/promises").then((fs) => fs.stat(outJpg));
  console.log("Wrote:", outJpg, `${W}×${H}`, (stat.size / 1024).toFixed(1), "KB");
  if (stat.size > 1024 * 1024) {
    console.warn("Aviso: ficheiro > 1 MB. Reduza quality no script ou use mais compressão JPEG.");
  }
  return outJpg;
}

async function main() {
  const fs = await import("node:fs/promises");
  await fs.mkdir(outDir, { recursive: true });
  await write512Icon();
  await write4096Header();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
