import type { ApiUnit } from '../types';

// Unit data is bundled as public/data/units.json (converted from GitHub source at build time).
// To refresh: run  node scripts/sync-units.mjs  then rebuild.

let cache: ApiUnit[] | null = null;
let cacheError: string | null = null;

export async function loadVotannUnits(): Promise<{ units: ApiUnit[]; error?: string }> {
  if (cache) return { units: cache };
  if (cacheError) return { units: [], error: cacheError };

  try {
    const res = await fetch('data/units.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: ApiUnit[] = await res.json();
    cache = data;
    return { units: cache };
  } catch (e) {
    cacheError = `Could not load unit data: ${String(e)}`;
    return { units: [], error: cacheError };
  }
}

export function clearCache() {
  cache = null;
  cacheError = null;
}

export async function searchVotannUnits(query: string): Promise<{ units: ApiUnit[]; error?: string }> {
  const { units, error } = await loadVotannUnits();
  if (!query.trim()) return { units, error };
  const q = query.toLowerCase();
  return {
    units: units.filter(u => u.name.toLowerCase().includes(q)),
    error,
  };
}

export async function fetchFactions(): Promise<{ factions: string[]; error?: string }> {
  return { factions: ['Leagues of Votann'] };
}

export interface OHDetachment {
  id: string;
  name: string;
  cost: number;
  rule: string;
  ruleDetail: string;
}

export async function fetchDetachments(_faction: string): Promise<{ detachments: OHDetachment[]; error?: string }> {
  return { detachments: [], error: 'no_detachments' };
}
