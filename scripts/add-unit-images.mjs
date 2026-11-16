#!/usr/bin/env node
/**
 * add-unit-images.mjs
 *
 * Downloads Leagues of Votann unit portrait images and adds imageUrl fields
 * to public/data/units.json.
 *
 * Run from the project root on your LOCAL machine (requires unrestricted internet):
 *   node scripts/add-unit-images.mjs
 *
 * Then commit and push:
 *   git add public/data/images/ public/data/units.json
 *   git push
 *
 * Requirements:
 *   npx playwright install chromium   (run once if not already installed)
 *
 * Images are saved to public/data/images/ as {kebab-name}.jpg
 * and referenced as relative paths so they work on GitHub Pages.
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const UNITS_PATH = join(ROOT, 'public', 'data', 'units.json');
const IMG_DIR = join(ROOT, 'public', 'data', 'images');

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

// Known GW store search slugs for LoV units (name → search term)
// The script will find the best product image for each.
const UNIT_OVERRIDES = {
  'uthar-the-destined': 'Uthar the Destined Leagues of Votann',
  'kahl': 'Kahl Leagues of Votann',
  'einhyr-champion': 'Einhyr Champion Leagues of Votann',
  'grimnyr': 'Grimnyr Leagues of Votann',
  'brokhyr-iron-master': 'Brokhyr Iron-master Leagues of Votann',
  'einhyr-hearthguard': 'Einhyr Hearthguard Leagues of Votann',
  'cthonian-beserks': 'Cthonian Beserks Leagues of Votann',
  'hearthkyn-warriors': 'Hearthkyn Warriors Leagues of Votann',
  'hernkyn-pioneers': 'Hernkyn Pioneers Leagues of Votann',
  'sagitaur': 'Sagitaur ATV Leagues of Votann',
  'brokhyr-thunderkyn': 'Brokhyr Thunderkyn Leagues of Votann',
  'hekaton-land-fortress': 'Hekaton Land Fortress Leagues of Votann',
  'hernkyn-yaegirs': 'Hernkyn Yaegirs Leagues of Votann',
};

async function findGWStoreImage(browser, searchTerm) {
  const page = await browser.newPage();
  try {
    const searchUrl = `https://www.games-workshop.com/en-GB/Search?query=${encodeURIComponent(searchTerm)}&pageSize=4`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);

    // Find the first product card image
    const imgSrc = await page.evaluate(() => {
      // Try product card images
      const selectors = [
        '.product-image img',
        '.search-result img',
        '.product-card img',
        'article img',
        '.range-item img',
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.src && !el.src.includes('placeholder') && !el.src.includes('logo')) {
          return el.src;
        }
      }
      // Fall back to any large image
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs.map(i => i.src).find(s => s && s.includes('media') && !s.includes('logo') && !s.includes('banner')) || null;
    });

    return imgSrc;
  } catch (e) {
    return null;
  } finally {
    await page.close();
  }
}

async function downloadBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  mkdirSync(IMG_DIR, { recursive: true });

  const units = JSON.parse(readFileSync(UNITS_PATH, 'utf8'));
  let updated = 0;

  const browser = await chromium.launch({ headless: true });

  for (const unit of units) {
    const kebab = toKebab(unit.name);

    // Skip if already has imageUrl or manual image exists
    if (unit.imageUrl) {
      console.log(`[skip]    ${unit.name} — already set`);
      continue;
    }
    for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
      if (existsSync(join(IMG_DIR, `${kebab}.${ext}`))) {
        unit.imageUrl = `data/images/${kebab}.${ext}`;
        console.log(`[manual]  ${unit.name} → ${unit.imageUrl}`);
        updated++;
        break;
      }
    }
    if (unit.imageUrl) continue;

    const searchTerm = UNIT_OVERRIDES[kebab] || `${unit.name} Leagues of Votann 40k`;
    console.log(`[search]  ${unit.name} — "${searchTerm}"`);

    const imgUrl = await findGWStoreImage(browser, searchTerm);
    if (!imgUrl) {
      console.log(`[no img]  ${unit.name} — not found on GW store`);
      continue;
    }

    try {
      const buf = await downloadBuffer(imgUrl);
      const ext = imgUrl.split('.').pop()?.split('?')[0] || 'jpg';
      const fname = `${kebab}.${ext}`;
      writeFileSync(join(IMG_DIR, fname), buf);
      unit.imageUrl = `data/images/${fname}`;
      console.log(`[saved]   ${unit.name} → ${unit.imageUrl}`);
      updated++;
    } catch (e) {
      console.log(`[error]   ${unit.name} — ${e.message}`);
    }

    // Be polite to GW servers
    await new Promise(r => setTimeout(r, 1500));
  }

  await browser.close();

  writeFileSync(UNITS_PATH, JSON.stringify(units, null, 2));
  console.log(`\nDone. Updated ${updated}/${units.length} units.`);
  console.log('\nNext steps:');
  console.log('  git add public/data/images/ public/data/units.json');
  console.log('  git commit -m "Add unit portrait images"');
  console.log('  git push');
}

main().catch((e) => { console.error(e); process.exit(1); });
