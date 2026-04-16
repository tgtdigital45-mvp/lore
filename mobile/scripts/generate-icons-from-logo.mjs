/**
 * Gera icon.png, adaptive-icon.png, favicon.png e splash-icon.png a partir de assets/images/logo-A.png
 * Uso: node scripts/generate-icons-from-logo.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = path.join(root, "assets", "images", "logo-A.png");
const out = {
  icon: path.join(root, "assets", "images", "icon.png"),
  adaptive: path.join(root, "assets", "images", "adaptive-icon.png"),
  favicon: path.join(root, "assets", "images", "favicon.png"),
  splash: path.join(root, "assets", "images", "splash-icon.png"),
};
const landingFavicon = path.join(root, "..", "landing-page-onco", "public", "favicon.png");
const landingFaviconSvg = path.join(root, "..", "landing-page-onco", "public", "favicon.svg");

async function main() {
  const img = sharp(src);
  const meta = await img.metadata();
  console.log("Source:", src, meta.width, "x", meta.height);

  await sharp(src).resize(1024, 1024, { fit: "contain", background: { r: 15, g: 118, b: 110, alpha: 1 } }).png().toFile(out.icon);
  await sharp(src).resize(1024, 1024, { fit: "contain", background: { r: 15, g: 118, b: 110, alpha: 1 } }).png().toFile(out.adaptive);
  await sharp(src).resize(1284, 1284, { fit: "contain", background: { r: 15, g: 118, b: 110, alpha: 1 } }).png().toFile(out.splash);
  await sharp(src).resize(48, 48, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toFile(out.favicon);
  const fav32 = await sharp(src)
    .resize(32, 32, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer();
  await import("node:fs/promises").then((fs) => fs.writeFile(landingFavicon, fav32));

  const b64 = fav32.toString("base64");
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <title>Aura Onco</title>
  <image width="32" height="32" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,${b64}"/>
</svg>`;
  await import("node:fs/promises").then((fs) => fs.writeFile(landingFaviconSvg, svg, "utf8"));

  console.log("Wrote:", Object.values(out).join("\n  "));
  console.log("Wrote:", landingFavicon, landingFaviconSvg);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
