// Generates the raster icon set the PWA manifest, Bubblewrap, and Play Store
// require from the source SVGs in public/.
//
// Run with:   node scripts/generate-icons.mjs
//
// Requires `sharp`. Install with `npm i -D sharp` (already added as devDep).
//
// Produces (committed in the repo):
//   public/icon-192.png             — any-purpose, 192x192
//   public/icon-512.png             — any-purpose, 512x512
//   public/icon-maskable-192.png    — maskable, 192x192
//   public/icon-maskable-512.png    — maskable, 512x512
//   public/apple-touch-icon.png     — 180x180 (iOS home screen)
//   public/play-store-icon.png      — 512x512 (Play Console listing)
import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const PUBLIC = path.join(ROOT, "public");

const baseSvg = await readFile(path.join(PUBLIC, "icon.svg"));
const maskableSvg = await readFile(path.join(PUBLIC, "icon-maskable.svg"));

async function emit(svg, size, outName) {
  const png = await sharp(svg, { density: 384 })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(path.join(PUBLIC, outName), png);
  console.log(`✓ ${outName} (${size}x${size}, ${png.byteLength} bytes)`);
}

await Promise.all([
  emit(baseSvg, 192, "icon-192.png"),
  emit(baseSvg, 512, "icon-512.png"),
  emit(maskableSvg, 192, "icon-maskable-192.png"),
  emit(maskableSvg, 512, "icon-maskable-512.png"),
  emit(baseSvg, 180, "apple-touch-icon.png"),
  emit(maskableSvg, 512, "play-store-icon.png"),
]);
console.log("All icons generated.");
