#!/usr/bin/env node
/**
 * Scrape Leagues of Votann data from wahapedia.ru
 * Outputs:
 *   public/data/enhancements.json
 *   public/data/stratagems.json
 *
 * Run with: node scripts/update-lov-data.cjs
 */

'use strict';

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const URL = 'https://wahapedia.ru/wh40k10ed/factions/leagues-of-votann/';

const SKIP_HEADERS = new Set([
  'BOOKS', 'KEYWORDS', 'INTRODUCTION', 'ARMY RULES',
  'CRUSADE RULES', 'BOARDING ACTIONS',
]);

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  console.log('Loading wahapedia LoV page…');
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  console.log('Page loaded.');

  // ── Helpers ──────────────────────────────────────────────────────────────

  const { enhancements, stratagems } = await page.evaluate((SKIP) => {
    // Returns the nearest preceding detachment h2 for a given element
    const detachmentHeaders = Array.from(document.querySelectorAll('h2.outline_header'))
      .filter(h => !SKIP.includes(h.innerText?.trim().toUpperCase()));

    function nearestDetachment(el) {
      let best = null;
      for (const h2 of detachmentHeaders) {
        if (h2.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) {
          best = h2;
        }
      }
      // Title-case
      // Proper-case: capitalise first letter of each word (simple, preserves special chars)
      const raw = best.innerText.trim();
      return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
        .replace(/\s+(\S)/g, (_, ch) => ' ' + ch.toUpperCase());

    }

    // ── ENHANCEMENTS ───────────────────────────────────────────────────────
    const enhancements = [];

    for (const tdw of document.querySelectorAll('.td_w')) {
      const ul = tdw.querySelector('ul.EnhancementsPts');
      if (!ul) continue;

      const detachment = nearestDetachment(tdw);

      // Each li has the name + pts; description follows in the same td_w
      // The td_w text: name\nN pts\n[flavour]\n[rules]
      // We extract the full text, then split by name lines
      const rawText = tdw.innerText?.trim() || '';
      const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

      // Build a map of enhancement name -> { pts, description }
      // from the li items
      for (const li of ul.querySelectorAll('li')) {
        const liText = li.innerText?.trim() || '';
        const ptsMatch = liText.match(/(\d+)\s*pts?/i);
        const pts = ptsMatch ? parseInt(ptsMatch[1]) : 0;
        const name = liText.replace(/\d+\s*pts?\.?/i, '').replace(/^[–:•]+/, '').trim();

        // Find this name in the full td_w text, then grab the lines that follow
        // until the next enhancement name or end
        const nameIdx = lines.findIndex(l =>
          l.toLowerCase().startsWith(name.toLowerCase().slice(0, 15))
        );
        let description = '';
        if (nameIdx >= 0) {
          // skip name + pts lines, then collect until next li name or end
          const nextNames = Array.from(ul.querySelectorAll('li'))
            .map(el => el.innerText?.trim().replace(/\d+\s*pts?\.?/i, '').replace(/^[–:•]+/, '').trim().toLowerCase().slice(0, 15))
            .filter(n => n && n !== name.toLowerCase().slice(0, 15));

          const descLines = [];
          for (let i = nameIdx + 1; i < lines.length; i++) {
            const lc = lines[i].toLowerCase();
            if (nextNames.some(nn => lc.startsWith(nn)) && lines[i + 1]?.match(/\d+\s*pts/i)) break;
            if (lines[i].match(/^\d+\s*pts?/i)) continue; // skip pts line
            descLines.push(lines[i]);
          }
          description = descLines.join(' ').trim();
        }

        enhancements.push({ name, pts, detachment, description });
      }
    }

    // ── STRATAGEMS ─────────────────────────────────────────────────────────
    const stratagems = [];

    for (const wrap of document.querySelectorAll('.str10Wrap')) {
      const textDiv = wrap.querySelector('.str10Text');
      if (!textDiv) continue;

      const textContent = textDiv.innerText?.trim() || '';
      if (!textContent.includes('WHEN:')) continue; // skip non-battle cards

      const detachment = nearestDetachment(wrap);
      const fullCard = wrap.innerText?.trim() || '';
      const cardLines = fullCard.split('\n').map(l => l.trim()).filter(Boolean);

      // Name is on the first line; CP is second; detachment–type is third
      const name = cardLines[0] || '';
      const cpMatch = fullCard.match(/^(\d+)\s*CP/m);
      const cp = cpMatch ? parseInt(cpMatch[1]) : 1;

      // Stratagem type (BATTLE TACTIC, WARGEAR, etc.)
      const typeLine = cardLines.find(l => /STRATAGEM/i.test(l)) || '';
      const typeMatch = typeLine.match(/(BATTLE TACTIC|WARGEAR|EPIC DEED|STRATEGIC PLOY|REQUISITION)\s*STRATAGEM/i);
      const type = typeMatch ? typeMatch[1].replace(/\b\w/g, c => c.toUpperCase()) : 'Stratagem';

      // Pull WHEN / TARGET / EFFECT / RESTRICTIONS sections from textContent
      const sections = {};
      const sectionRe = /\b(WHEN|TARGET|EFFECT|RESTRICTIONS):\s*/g;
      let match;
      const positions = [];
      while ((match = sectionRe.exec(textContent)) !== null) {
        positions.push({ key: match[1], start: match.index + match[0].length });
      }
      for (let i = 0; i < positions.length; i++) {
        const end = i + 1 < positions.length ? positions[i + 1].start - positions[i + 1].key.length - 2 : textContent.length;
        sections[positions[i].key] = textContent.slice(positions[i].start, end).trim();
      }

      stratagems.push({
        name,
        cp,
        type,
        detachment,
        when: sections['WHEN'] || '',
        target: sections['TARGET'] || '',
        effect: sections['EFFECT'] || '',
        restrictions: sections['RESTRICTIONS'] || '',
      });
    }

    return { enhancements, stratagems };
  }, Array.from(SKIP_HEADERS));

  await browser.close();

  console.log(`Found ${enhancements.length} enhancements, ${stratagems.length} stratagems.`);

  // ── Write output files ────────────────────────────────────────────────────
  const dataDir = path.join(__dirname, '..', 'public', 'data');
  fs.mkdirSync(dataDir, { recursive: true });

  fs.writeFileSync(
    path.join(dataDir, 'enhancements.json'),
    JSON.stringify(enhancements, null, 2),
    'utf8'
  );
  fs.writeFileSync(
    path.join(dataDir, 'stratagems.json'),
    JSON.stringify(stratagems, null, 2),
    'utf8'
  );

  console.log('Written to public/data/enhancements.json and public/data/stratagems.json');

  // Print sample
  console.log('\nSample enhancements:');
  enhancements.slice(0, 3).forEach(e =>
    console.log(`  [${e.detachment}] ${e.name} (${e.pts}pts) — ${e.description?.slice(0, 80)}`)
  );
  console.log('\nSample stratagems:');
  stratagems.slice(0, 3).forEach(s =>
    console.log(`  [${s.detachment}] ${s.name} (${s.cp}CP, ${s.type}) — WHEN: ${s.when?.slice(0, 60)}`)
  );
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
