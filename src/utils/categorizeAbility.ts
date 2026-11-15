export type AbilityCategory = 'toHit' | 'toWound' | 'postHit' | 'defensive' | 'other';

/**
 * Returns true for abilities that should be hidden from ability lists:
 * - Weapon-type/keyword restatements already shown in the weapon table
 * - Army-building metadata managed by the list builder (Leader, Scouts, etc.)
 * - Faction rules already shown in the FactionRules panel
 */
const WEAPON_ABILITY_RE =
  /^(pistol|heavy|assault|rapid fire|blast|hazardous|indirect fire|melta|precision|torrent|twin-?linked|sustained hits|lethal hits|devastating wounds|anti\b|anti-)/i;

const STRIP_ABILITY_NAMES = new Set([
  'leader',
  'scouts',
  'deep strike',
  'infiltrators',
  'lone operative',
  'firing deck',
  'transport',
  'deadly demise',
  'aircraft',
  'hover',
  'stealth',
  'smokescreen',
  'grenades',
  'force of nature',
  'attached unit',
  'prioritised efficiency',
  'one shot',
]);

export function isWeaponKeywordAbility(name: string): boolean {
  const n = name.trim().toLowerCase();
  if (WEAPON_ABILITY_RE.test(n)) return true;
  if (STRIP_ABILITY_NAMES.has(n)) return true;
  // Strip abilities where the name starts with "leader" (e.g. "Leader: This model can be attached to...")
  if (n.startsWith('leader')) return true;
  return false;
}

export const CATEGORY_LABELS: Record<AbilityCategory, string> = {
  toHit:     'To Hit',
  toWound:   'To Wound',
  postHit:   'Post-Hit',
  defensive: 'Defensive',
  other:     'Other',
};

export const CATEGORY_ORDER: AbilityCategory[] = ['toHit', 'toWound', 'postHit', 'defensive', 'other'];

/** Explicit name → category overrides, applied before regex. */
const ABILITY_OVERRIDES: Record<string, AbilityCategory> = {
  'break the foe':            'toHit',
  'kindred hero':             'toHit',
  'seized opportunity':           'postHit',
  'scanner uplinks':              'postHit',
  'breaching fire':               'postHit',
  'subterranean explosives':      'postHit',
  // Enhancements — faction pack
  'saturation rounds':            'toHit',
  'optimised attack lines':       'other',
  'pan-spectral lockons':         'other',
  'shroudwërke talismans':        'defensive',
  'high kâhl':                    'defensive',
  'ironskein':                    'defensive',
  'bastion shield':               'defensive',
  'quake multigenerator':         'postHit',
  'mercenary prospector':         'other',
  'metaphysical brokerage':       'other',
  'etacarn sb9 targeting implant':'toHit',
  'asset manipulator':            'other',
  // Enhancements — core codex detachments (from wahapedia)
  'oathbound speculator':         'toWound',
  'dead reckoning':               'other',
  'iron ambassador':              'postHit',
  'ancestral crest':              'other',
  'eye for weakness':             'toWound',
  'writ of acquisition':          'postHit',
  'surgical saboteur':            'postHit',
  'nomad strategist':             'other',
  'dêlvwerke navigator':          'other',
  'multiwave system jammer':      'other',
  'quake supervisor':             'toHit',
  'piledriver':                   'postHit',
  'tactical alchemy':             'other',
  'trivärg cyber implant':        'postHit',
  'precursive judgement':         'other',
  'signature restoration':        'other',
  'fârstrydr node':               'defensive',
  'calculated tenacity':          'other',
  'mantle of elders':             'other',
  'graviton vault':               'postHit',
};

export function categorizeAbility(name: string, description: string): AbilityCategory {
  const lname = name.trim().toLowerCase();
  if (lname in ABILITY_OVERRIDES) return ABILITY_OVERRIDES[lname];

  const text = `${name} ${description}`.toLowerCase();

  // Post-Hit: triggers after shots resolve, on critical/hit results
  if (/after this (unit|model) has shot|after.*unit.*shot|sustained hits|lethal hits|devastating wounds|critical hit/i.test(text)) return 'postHit';

  // To Hit: affects hit rolls or BS/WS
  if (/hit roll|to hit|\+1.*hit|re.?roll.*hit|hit on \d\+|scored on/i.test(text)) return 'toHit';

  // To Wound: affects wound rolls or strength comparisons
  if (/wound roll|to wound|anti-[a-z]|re.?roll.*wound|\+1.*wound|subtract.*wound|armour penetration/i.test(text)) return 'toWound';

  // Defensive: saves, damage reduction, reactive moves, do-not-remove
  if (/invulnerable|feel no pain|fnp|reactive|normal move.*destro|not remove|subtract.*damage|damage characteristic|save roll|saving throw|armour save|emergenc/i.test(text)) return 'defensive';

  return 'other';
}

export interface CategorizedAbility {
  id: string;
  source: string;
  name: string;
  description: string;
  category: AbilityCategory;
  custom?: boolean;
}
