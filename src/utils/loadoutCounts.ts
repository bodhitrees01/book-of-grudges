/**
 * Parse imported loadout notes into a weapon-name → model-count map.
 * Lines look like "7x Bolt shotgun", "1x Hernkyn Yaegir" etc.
 * We sum all occurrences of the same name (case-insensitive).
 */
export function parseLoadoutCounts(notes: string): Map<string, number> {
  const counts = new Map<string, number>();
  if (!notes.trim()) return counts;

  for (const rawLine of notes.split('\n')) {
    const line = rawLine.trim();
    const m = line.match(/^(\d+)x\s+(.+)$/i);
    if (!m) continue;
    const count = parseInt(m[1], 10);
    const name = normaliseNote(m[2].trim());
    counts.set(name, (counts.get(name) ?? 0) + count);
  }
  return counts;
}

/** Normalise a datasheet weapon name for matching against note keys. */
function normalise(name: string): string {
  return name
    .replace(/^[➤►]\s*/, '')   // strip choice prefix
    .replace(/\s+[-–]\s+.+$/, '') // strip profile variant suffix ("- graviton strikes")
    .replace(/[’‘]/g, "'")
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents (ô → o, etc.)
    .trim();
}

/** Normalise a user-supplied note key (from GW app export) for matching. */
function normaliseNote(key: string): string {
  return key
    .replace(/[’‘]/g, "'")
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

/**
 * Returns the model count for a datasheet weapon given parsed note counts,
 * or null if the weapon doesn't appear in notes (meaning it wasn't selected).
 * Returns undefined when notes is empty (no loadout info → show everything).
 */
export function weaponCount(
  weaponName: string,
  noteCounts: Map<string, number>
): number | undefined {
  if (noteCounts.size === 0) return undefined; // no notes → don't filter

  // Build a normalised lookup of the notes map (accent-insensitive)
  const normMap = new Map<string, number>();
  for (const [k, v] of noteCounts) normMap.set(normaliseNote(k), v);

  const base = normalise(weaponName);

  const match = normMap.get(base);
  if (match !== undefined) return match;

  // Named/signature weapons (e.g. "Kromlôk's Revenge") are never listed in
  // GW app exports, so an unlisted possessive name must not be hidden.
  if (/'s\b/.test(base)) return undefined;

  return 0; // weapon not mentioned in notes → not selected
}
