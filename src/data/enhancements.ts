import type { ApiAbility } from '../types';

export interface EnhancementEntry {
  name: string;
  pts: number;
  detachment: string;
  description: string;
}

// Runtime store — populated by loadEnhancements()
let _store: Map<string, EnhancementEntry> = new Map();
let _loaded = false;

export async function loadEnhancements(): Promise<void> {
  if (_loaded) return;
  try {
    const res = await fetch('/data/enhancements.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: EnhancementEntry[] = await res.json();
    _store = new Map(data.map((e) => [e.name.toLowerCase(), e]));
    _loaded = true;
  } catch (err) {
    console.warn('Could not load enhancements.json, using empty store:', err);
    _loaded = true;
  }
}

export function lookupEnhancement(name: string): ApiAbility {
  const entry = _store.get(name.toLowerCase());
  return { name, description: entry?.description ?? '' };
}

export function getAllEnhancements(): EnhancementEntry[] {
  return Array.from(_store.values());
}
