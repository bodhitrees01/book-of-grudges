import { useState, useEffect } from 'react';
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
const _listeners = new Set<() => void>();

export async function loadEnhancements(): Promise<void> {
  if (_loaded) return;
  try {
    const res = await fetch('/data/enhancements.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: EnhancementEntry[] = await res.json();
    _store = new Map(data.map((e) => [e.name.toLowerCase(), e]));
  } catch (err) {
    console.warn('Could not load enhancements.json, using empty store:', err);
  }
  _loaded = true;
  _listeners.forEach((cb) => cb());
}

/** Re-renders the calling component once enhancements.json has loaded. */
export function useEnhancementsReady(): boolean {
  const [ready, setReady] = useState(_loaded);
  useEffect(() => {
    if (_loaded) { setReady(true); return; }
    const cb = () => setReady(true);
    _listeners.add(cb);
    return () => { _listeners.delete(cb); };
  }, []);
  return ready;
}

export function lookupEnhancement(name: string): ApiAbility {
  const entry = _store.get(name.toLowerCase());
  return { name, description: entry?.description ?? '' };
}

export function getAllEnhancements(): EnhancementEntry[] {
  return Array.from(_store.values());
}
