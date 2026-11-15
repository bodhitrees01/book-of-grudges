import type { ApiUnit } from '../types';

// Wahapedia data is available as CSV exports, but for this app we use
// a local JSON data file you can populate from any source.
// Place your units JSON at /public/data/units.json
// Format: ApiUnit[]

let cachedUnits: ApiUnit[] | null = null;

export async function loadUnits(): Promise<ApiUnit[]> {
  if (cachedUnits) return cachedUnits;

  try {
    const res = await fetch('data/units.json');
    if (!res.ok) throw new Error('No local data found');
    const data = await res.json();
    cachedUnits = data as ApiUnit[];
    return cachedUnits;
  } catch {
    // Return empty — user will import or use sample data
    return [];
  }
}

export async function searchUnits(query: string): Promise<ApiUnit[]> {
  const units = await loadUnits();
  if (!query.trim()) return units.slice(0, 20);
  const q = query.toLowerCase();
  return units.filter(
    (u) =>
      u.name.toLowerCase().includes(q) ||
      u.faction.toLowerCase().includes(q)
  );
}

export async function getUnit(id: string): Promise<ApiUnit | null> {
  const units = await loadUnits();
  return units.find((u) => u.id === id) ?? null;
}

// Parse a Wahapedia-style CSV export into ApiUnit[]
// This is a utility for users who download Wahapedia data exports
export function parseWahapediaUnits(_csvText: string): ApiUnit[] {
  return [];
}

// Empty fallback — the full Leagues of Votann roster lives in /public/data/units.json
export const SAMPLE_UNITS: ApiUnit[] = [];
