#!/usr/bin/env node
/**
 * add-unit-images.mjs
 *
 * Downloads Leagues of Votann unit portrait images from Wahapedia and adds
 * imageUrl fields to public/data/units.json.
 *
 * Run from the project root (requires internet access):
 *   node scripts/add-unit-images.mjs
 *
 * Images are saved to public/data/images/ and referenced as relative paths
 * so they work on GitHub Pages.
 *
 * How it works:
 *   1. Fetches the LoV faction page from Wahapedia to discover unit URLs.
 *   2. For each unit, fetches its page and looks for a portrait image in
 *      the .header-unit-img or .wh-unit-portrait CSS classes.
 *   3. Downloads the image, saves it locally, and writes imageUrl into units.json.
 *
 * If automatic scraping fails for a unit, you can manually drop a JPG/PNG
 * into public/data/images/ named after the unit (kebab-case, e.g. kahl.jpg)
 * and re-run with --manual-only to skip scraping.
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const UNITS_PATH = join(ROOT, 'public', 'data', 'units.json');
const IMG_DIR = join(ROOT, 'public', 'data', 'images');
const WAHAPEDIA_BASE = 'https://wahapedia.ru';
const MANUAL_ONLY = process.argv.includes('--manual-only');

function toKebab(name) {
  return name
    .toLowerCase()
    .replace(/[âàáä]/g, 'a')
    .replace(/[êèéë]/g, 'e')
    .replace(/[îìíï]/g, 'i')
    .replace(/[ôòóö]/g, 'o')
    .replace(/[ûùúü]/g, 'u')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function downloadImage(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} downloading ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(destPath, buf);
}

function extractPortraitUrl(html) {
  // Wahapedia serves unit portraits as the first large image on the unit page
  // Look for common patterns
  const patterns = [
    /class="[^"]*unit[^"]*portrait[^"]*"[^>]*src="([^"]+)"/i,
    /class="[^"]*portrait[^"]*"[^>]*src="([^"]+)"/i,
    /<img[^>]+src="([^"]+\/unit[^"]+\.(jpg|png|webp))"/i,
    /<img[^>]+src="([^"]+\/Miniatures[^"]+\.(jpg|png|webp))"/i,
    /<img[^>]+class="[^"]*card[^"]*"[^>]*src="([^"]+\.(jpg|png|webp))"/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return m[1].startsWith('http') ? m[1] : `${WAHAPEDIA_BASE}${m[1]}`;
  }
  return null;
}

async function main() {
  mkdirSync(IMG_DIR, { recursive: true });

  const units = JSON.parse(readFileSync(UNITS_PATH, 'utf8'));
  let updated = 0;

  for (const unit of units) {
    const kebab = toKebab(unit.name);
    // Check for manually placed image first
    for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
      const localPath = join(IMG_DIR, `${kebab}.${ext}`);
      if (existsSync(localPath)) {
        unit.imageUrl = `data/images/${kebab}.${ext}`;
        console.log(`[manual]  ${unit.name} → ${unit.imageUrl}`);
        updated++;
        break;
      }
    }
    if (unit.imageUrl || MANUAL_ONLY) continue;

    // Try scraping Wahapedia
    const wahUrl = `${WAHAPEDIA_BASE}/wh40k10ed/factions/leagues-of-votann/${unit.name.replace(/[^a-zA-Z0-9-]/g, (c) => encodeURIComponent(c))}`;
    try {
      const html = await fetchText(wahUrl);
      const imgUrl = extractPortraitUrl(html);
      if (imgUrl) {
        const ext = imgUrl.split('.').pop().split('?')[0] || 'jpg';
        const destName = `${kebab}.${ext}`;
        await downloadImage(imgUrl, join(IMG_DIR, destName));
        unit.imageUrl = `data/images/${destName}`;
        console.log(`[scraped] ${unit.name} → ${unit.imageUrl}`);
        updated++;
      } else {
        console.log(`[no img]  ${unit.name} — no portrait found on Wahapedia`);
      }
    } catch (e) {
      console.log(`[error]   ${unit.name} — ${e.message}`);
    }
  }

  writeFileSync(UNITS_PATH, JSON.stringify(units, null, 2));
  console.log(`\nDone. Updated ${updated}/${units.length} units.`);
  console.log('Run  npm run build  to include the images in the dist.');
}

main().catch((e) => { console.error(e); process.exit(1); });
