import type { ApiUnit, Army, ArmyUnit } from '../types';

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// Role section labels (10th ed exports use ALL CAPS; we match case-insensitively)
const ROLE_LABELS = new Set([
  'characters', 'character', 'epic hero', 'epic heroes',
  'battleline',
  'dedicated transport', 'dedicated transports',
  'other datasheets',
  'infantry', 'mounted', 'vehicle', 'vehicles',
  'monster', 'monsters', 'beast', 'beasts', 'allied units',
  'hq', 'troops', 'elites', 'fast attack', 'heavy support',
  'flyer', 'flyers', 'lord of war', 'fortification',
  'configuration', 'warlord', 'stratagems', 'rules',
  'patrol detachment', 'battalion detachment', 'brigade detachment',
  'spearhead detachment', 'outrider detachment', 'vanguard detachment',
  'incursion', 'strike force', 'onslaught', 'combat patrol',
]);

const LEADER_SECTIONS = new Set([
  'characters', 'character', 'epic hero', 'epic heroes', 'hq',
]);

function normaliseKey(s: string) {
  return s.toLowerCase().replace(/^[+\s]+|[+\s]+$/g, '').trim();
}

const isRoleLabel = (s: string) => ROLE_LABELS.has(normaliseKey(s));

// "Unit Name (135 Points)" or "Unit Name (5 Models) (120 Points)"
const UNIT_LINE = /^(.+?)\s*(?:\(\d+\s*Models?\))?\s*\((\d[\d,]*)\s*Points?\)\s*$/i;

// "Name (3 Detachment Points)"
const DET_LINE = /^(.+?)\s*\(\d+\s*Detachment\s*Points?\)/i;

/**
 * Parse the GW 40k app plain-text roster export (10th / 11th edition format).
 *
 * @param knownUnits  Loaded from units.json — when a unit name matches, its
 *                    full stat block, weapons and abilities are merged in.
 */
export function parseGWRosterText(text: string, knownUnits: ApiUnit[] = []): Army | null {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return null;

  // ── Preamble: scan lines before the first role-section header ────────────
  let armyName = 'Imported Army';
  let faction = '';
  let totalPoints = 0;
  let importedDetachmentName = '';

  // Line 0: "Army Name (N Points)"
  const h = lines[0].match(/^(.+?)\s*\((\d[\d,]*)\s*Points?\)\s*$/i);
  if (h) {
    armyName = h[1].trim();
    totalPoints = parseInt(h[2].replace(/,/g, ''), 10);
  }

  // Scan preamble for faction (plain text line, no parenthetical digits)
  // and detachment "(N Detachment Points)"
  for (let i = 1; i < lines.length; i++) {
    if (isRoleLabel(lines[i])) break; // hit first section header — stop preamble scan

    const detMatch = lines[i].match(DET_LINE);
    if (detMatch) {
      importedDetachmentName = detMatch[1].trim();
      continue;
    }
    // Plain faction line: no parentheses with digits, not a points line
    if (!faction && !lines[i].match(/\(\d/) && !lines[i].match(UNIT_LINE)) {
      faction = lines[i];
    }
  }

  if (!faction) faction = armyName; // fallback

  // Build a quick lookup by lowercase name
  const knownByName = new Map(knownUnits.map((u) => [u.name.toLowerCase(), u]));

  // ── Walk all lines, only collecting units after the first section header ─
  const armyUnits: ArmyUnit[] = [];
  let pastPreamble = false;
  let isLeaderSection = false;

  interface PendingUnit { name: string; points: number; wargear: string[] }
  let pending: PendingUnit | null = null;

  const finalise = () => {
    if (!pending) return;

    const known = knownByName.get(pending.name.toLowerCase());

    const apiUnit: ApiUnit = known
      ? { ...known, points: pending.points, isLeader: isLeaderSection || !!known.isLeader }
      : {
          id: uid(),
          name: pending.name,
          faction,
          points: pending.points,
          isLeader: isLeaderSection,
          keywords: [],
          profiles: [{
            name: pending.name,
            movement: '—', toughness: '—', save: '—',
            wounds: '—', leadership: '—', objectiveControl: '—',
            keywords: [],
          }],
          rangedWeapons: [],
          meleeWeapons: [],
          abilities: [],
        };

    // Split wargear lines into loadout notes vs enhancement names
    const enhancements: string[] = [];
    const loadoutLines: string[] = [];
    for (const line of pending.wargear) {
      const enh = line.match(/^Enhancement:\s*(.+)$/i);
      if (enh) {
        enhancements.push(enh[1].trim());
      } else {
        loadoutLines.push(line);
      }
    }

    armyUnits.push({
      id: uid(),
      apiUnitId: apiUnit.id,
      unitData: apiUnit,
      customAbilities: [],
      attachedLeaderIds: [],
      notes: loadoutLines.length ? loadoutLines.join('\n') : '',
      enhancements: enhancements.length ? enhancements : undefined,
    });

    pending = null;
  };

  for (const line of lines) {
    // Skip the app-version footer
    if (/^exported with app/i.test(line)) continue;

    if (isRoleLabel(line)) {
      finalise();
      pastPreamble = true;
      isLeaderSection = LEADER_SECTIONS.has(normaliseKey(line));
      continue;
    }

    if (!pastPreamble) continue;

    const unitMatch = line.match(UNIT_LINE);
    if (unitMatch) {
      finalise();
      pending = {
        name: unitMatch[1].trim(),
        points: parseInt(unitMatch[2].replace(/,/g, ''), 10),
        wargear: [],
      };
      continue;
    }

    // Everything else after a unit line is wargear / metadata
    if (pending) {
      // Strip leading bullet and normalise
      const clean = line.replace(/^[•·*\-]\s*/, '').trim();
      if (clean) pending.wargear.push(clean);
    }
  }

  finalise();

  if (!armyUnits.length) return null;

  // "Hearthguard Covenant and Needgaârd Oathband" → two separate detachments
  const detachmentNames = importedDetachmentName
    ? importedDetachmentName.split(/\s+and\s+/i).map((s) => s.trim()).filter(Boolean)
    : [];
  const detachments = detachmentNames.map((name) => ({
    id: `import-${uid()}`,
    name,
    cost: 0,
    rule: '',
    ruleDetail: '',
  }));

  return {
    id: uid(),
    name: armyName,
    faction,
    detachments,
    points: totalPoints || armyUnits.reduce((s, u) => s + u.unitData.points, 0),
    units: armyUnits,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
