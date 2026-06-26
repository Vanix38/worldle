/**
 * Download Invincible character images from data/invincible.json.
 *
 * Usage:
 *   node scripts/download-invincible-character-images.mjs
 *   node scripts/download-invincible-character-images.mjs --skip-existing
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DEFAULT_IN = path.join(ROOT, "data", "invincible.json");
const DEFAULT_OUT_DIR = path.join(ROOT, "public", "universes", "invincible", "characters");

function parseArgs(argv) {
  const opts = {
    inPath: DEFAULT_IN,
    outDir: DEFAULT_OUT_DIR,
    delay: 150,
    skipExisting: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--in") opts.inPath = argv[++i] || DEFAULT_IN;
    else if (arg === "--out-dir") opts.outDir = argv[++i] || DEFAULT_OUT_DIR;
    else if (arg === "--delay") opts.delay = Math.max(0, parseInt(argv[++i], 10) || 0);
    else if (arg === "--skip-existing") opts.skipExisting = true;
  }

  return opts;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extensionFromUrl(url, contentType) {
  const clean = String(url || "").split("?")[0];
  const beforeRevision = clean.split("/revision/")[0];
  const ext = path.extname(beforeRevision).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) return ext;

  if (/png/i.test(contentType)) return ".png";
  if (/webp/i.test(contentType)) return ".webp";
  if (/gif/i.test(contentType)) return ".gif";
  if (/jpe?g/i.test(contentType)) return ".jpg";
  return ".jpg";
}

async function download(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "worlddle-invincible-image-downloader/1.0" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  return {
    buffer,
    contentType: res.headers.get("content-type") || "",
  };
}

async function main() {
  const opts = parseArgs(process.argv);
  const data = JSON.parse(fs.readFileSync(opts.inPath, "utf8"));
  const characters = Array.isArray(data.characters) ? data.characters : [];

  fs.mkdirSync(opts.outDir, { recursive: true });

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const character of characters) {
    if (!character.id || !character.imageUrl) {
      skipped++;
      continue;
    }

    try {
      const provisionalExt = extensionFromUrl(character.imageUrl, "");
      const existingPattern = new RegExp(`^${character.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.(jpg|jpeg|png|webp|gif)$`, "i");
      if (opts.skipExisting && fs.readdirSync(opts.outDir).some((file) => existingPattern.test(file))) {
        skipped++;
        continue;
      }

      const { buffer, contentType } = await download(character.imageUrl);
      const ext = extensionFromUrl(character.imageUrl, contentType) || provisionalExt;
      const outPath = path.join(opts.outDir, `${character.id}${ext}`);
      fs.writeFileSync(outPath, buffer);
      ok++;
    } catch (error) {
      failed++;
      console.warn(`[failed] ${character.id}: ${error.message}`);
    }

    if ((ok + skipped + failed) % 25 === 0) {
      console.log(`Progress ${ok + skipped + failed}/${characters.length} ok=${ok} skipped=${skipped} failed=${failed}`);
    }
    await sleep(opts.delay);
  }

  console.log(`Done ok=${ok} skipped=${skipped} failed=${failed}`);
  console.log(`Output ${opts.outDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
