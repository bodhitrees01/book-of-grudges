#!/usr/bin/env node
/**
 * sync-units.mjs
 * Run from the warOrgan project root:
 *   node scripts/sync-units.mjs
 *
 * Fetches the full Leagues of Votann roster from the OpenHammer API
 * and writes it to public/data/units.json in the app's internal format.
 * After running, do: npm run build  (then republish the Artifact if needed)
 */

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const BASE = 'https://openhammer-api-production.up.railway.app/v1/11e';
const FACTION = 'Leagues of Votann';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data', 'units.json');

// ── Mapping helpers ───────────────────────────────────────────────────────────

function mapWeapon(w) {
  const rawKw = w.Keywords ?? w.keywords ?? '';
  const keywords = Array.isArray(rawKw)
    ? rawKw
    : typeof rawKw === 'string' && rawKw.trim()
      ? rawKw.split(',').map(s => s.trim()).filter(Boolean)
      : [];
  return {
    name: w.name ?? '—',
    range: w.Range ?? w.range ?? 'Melee',
    attacks: String(w.A ?? w.attacks ?? '1'),
    skill: w.BS ?? w.WS ?? w.skill ?? '4+',
    strength: String(w.S ?? w.strength ?? '4'),
    ap: String(w.AP ?? w.ap ?? '0'),
    damage: String(w.D ?? w.damage ?? '1'),
    keywords,
  };
}

function mapUnit(u) {
  const keywords = Array.isArray(u.keywords) ? u.keywords : [];
  // isLeader = has the actual "Leader" keyword (not just "Character")
  const isLeader = keywords.some(k => k.toLowerCase() === 'leader');

  const profile = {
    name: u.name,
    movement: u.stats?.M ?? '5"',
    toughness: String(u.stats?.T ?? '4'),
    save: u.stats?.SV ?? '4+',
    invulnSave: u.invuln_save ?? undefined,
    wounds: String(u.stats?.W ?? '1'),
    leadership: u.stats?.LD ?? '7+',
    objectiveControl: String(u.stats?.OC ?? '1'),
    keywords: [],
  };

  const abilities = [
    ...(u.abilities ?? []),
    ...(u.special_rules ?? []),
  ];
  if (u.transport?.capacity) {
    abilities.push({
      name: 'Transport',
      description: `Capacity: ${u.transport.capacity}${u.transport.restrictions ? ' — ' + u.transport.restrictions : ''}.`,
    });
  }

  return {
    id: u.id ?? `${u.faction}-${u.name}`.toLowerCase().replace(/\s+/g, '-'),
    name: u.name,
    faction: u.faction ?? FACTION,
    points: u.points?.base ?? u.points ?? 0,
    isLeader,
    keywords,
    profiles: [profile],
    rangedWeapons: (u.weapons?.ranged ?? []).map(mapWeapon),
    meleeWeapons: (u.weapons?.melee ?? []).map(mapWeapon),
    abilities,
  };
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function fetchPage(offset, limit = 50) {
  const url = `${BASE}/units?faction=${encodeURIComponent(FACTION)}&limit=${limit}&offset=${offset}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
}

async function fetchAllUnits() {
  let all = [];
  let offset = 0;
  const limit = 50;

  while (true) {
    process.stdout.write(`  Fetching units ${offset + 1}–${offset + limit}…`);
    const data = await fetchPage(offset, limit);

    // OpenHammer may return { units: [...], total: N } or just an array
    const page = Array.isArray(data) ? data : (data.units ?? data.data ?? []);
    const total = data.total ?? data.count ?? null;

    all = all.concat(page);
    console.log(` got ${page.length}`);

    if (page.length < limit) break;          // last page
    if (total !== null && all.length >= total) break;
    offset += limit;
  }

  return all;
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log(`\nFetching Leagues of Votann units from OpenHammer (11th edition)…\n`);

try {
  const raw = await fetchAllUnits();

  if (!raw.length) {
    console.error('\nNo units returned — check that the faction name matches exactly.');
    process.exit(1);
  }

  // Check available faction names if we got nothing
  const units = raw.map(mapUnit);
  const json = JSON.stringify(units, null, 2);

  writeFileSync(OUT, json, 'utf8');

  console.log(`\n✓ Wrote ${units.length} units to public/data/units.json`);
  console.log('\nNext steps:');
  console.log('  npm run build');
  console.log('  Then republish the Artifact (ask Claude to rebuild & publish)\n');
} catch (err) {
  // If the faction name didn't match, list available factions to help debug
  console.error(`\nError: ${err.message}`);
  console.log('\nTrying to list available factions to help debug…');
  try {
    const res = await fetch(`${BASE}/factions`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data.factions ?? []);
    const names = list.map(f => typeof f === 'string' ? f : f.name);
    const votann = names.filter(n => n?.toLowerCase().includes('votann') || n?.toLowerCase().includes('league'));
    console.log('\nFactions containing "votann" or "league":');
    votann.forEach(n => console.log(`  "${n}"`));
    if (!votann.length) {
      console.log('  (none found — full list below)');
      names.slice(0, 20).forEach(n => console.log(`  "${n}"`));
    }
  } catch {
    console.log('  Could not reach the API at all — check your internet connection.');
  }
  process.exit(1);
}
