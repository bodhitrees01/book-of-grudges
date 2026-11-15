import { useState, useCallback } from 'react';
import type { Army, ArmyUnit, AbilityEffect, SelectedDetachment, ApiUnit } from '../types';

const STORAGE_KEY = 'warOrgan_armies';

function loadFromStorage(): Army[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const armies: Army[] = raw ? JSON.parse(raw) : [];
    // Migrate legacy detachmentId → detachments[]
    return armies.map((a) => ({
      ...a,
      detachments: a.detachments ?? [],
    }));
  } catch {
    return [];
  }
}

function saveToStorage(armies: Army[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(armies));
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function useArmyStore() {
  const [armies, setArmies] = useState<Army[]>(() => loadFromStorage());

  const persist = useCallback((next: Army[]) => {
    setArmies(next);
    saveToStorage(next);
  }, []);

  const createArmy = useCallback(
    (name: string, faction: string, detachments: SelectedDetachment[] = []): Army => {
      const army: Army = {
        id: uid(),
        name,
        faction,
        detachments,
        points: 0,
        units: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      persist([...armies, army]);
      return army;
    },
    [armies, persist]
  );

  const updateArmy = useCallback(
    (id: string, patch: Partial<Omit<Army, 'id'>>) => {
      persist(
        armies.map((a) =>
          a.id === id ? { ...a, ...patch, updatedAt: new Date().toISOString() } : a
        )
      );
    },
    [armies, persist]
  );

  const deleteArmy = useCallback(
    (id: string) => {
      persist(armies.filter((a) => a.id !== id));
    },
    [armies, persist]
  );

  const addUnit = useCallback(
    (armyId: string, unit: Omit<ArmyUnit, 'id'>): ArmyUnit => {
      const armyUnit: ArmyUnit = { ...unit, id: uid() };
      persist(
        armies.map((a) =>
          a.id === armyId
            ? {
                ...a,
                units: [...a.units, armyUnit],
                points: a.points + unit.unitData.points,
                updatedAt: new Date().toISOString(),
              }
            : a
        )
      );
      return armyUnit;
    },
    [armies, persist]
  );

  const removeUnit = useCallback(
    (armyId: string, unitId: string) => {
      persist(
        armies.map((a) => {
          if (a.id !== armyId) return a;
          const unit = a.units.find((u) => u.id === unitId);
          return {
            ...a,
            units: a.units.filter((u) => u.id !== unitId),
            points: a.points - (unit?.unitData.points ?? 0),
            updatedAt: new Date().toISOString(),
          };
        })
      );
    },
    [armies, persist]
  );

  const updateUnit = useCallback(
    (armyId: string, unitId: string, patch: Partial<ArmyUnit>) => {
      persist(
        armies.map((a) =>
          a.id !== armyId
            ? a
            : {
                ...a,
                units: a.units.map((u) => (u.id === unitId ? { ...u, ...patch } : u)),
                updatedAt: new Date().toISOString(),
              }
        )
      );
    },
    [armies, persist]
  );

  const addAbility = useCallback(
    (armyId: string, unitId: string, ability: Omit<AbilityEffect, 'id'>) => {
      const effect: AbilityEffect = { ...ability, id: uid() };
      persist(
        armies.map((a) =>
          a.id !== armyId
            ? a
            : {
                ...a,
                units: a.units.map((u) =>
                  u.id !== unitId
                    ? u
                    : { ...u, customAbilities: [...u.customAbilities, effect] }
                ),
                updatedAt: new Date().toISOString(),
              }
        )
      );
    },
    [armies, persist]
  );

  const removeAbility = useCallback(
    (armyId: string, unitId: string, abilityId: string) => {
      persist(
        armies.map((a) =>
          a.id !== armyId
            ? a
            : {
                ...a,
                units: a.units.map((u) =>
                  u.id !== unitId
                    ? u
                    : {
                        ...u,
                        customAbilities: u.customAbilities.filter(
                          (ab) => ab.id !== abilityId
                        ),
                      }
                ),
                updatedAt: new Date().toISOString(),
              }
        )
      );
    },
    [armies, persist]
  );

  // Refresh unitData in every stored army from the latest units.json.
  // Preserves points, customAbilities, attachedLeaderIds, and notes from storage.
  const refreshUnitData = useCallback(
    (knownUnits: ApiUnit[]) => {
      const byId = new Map(knownUnits.map((u) => [u.id, u]));
      const byName = new Map(knownUnits.map((u) => [u.name.toLowerCase(), u]));
      const updated = armies.map((a) => ({
        ...a,
        units: a.units.map((u) => {
          const fresh = byId.get(u.unitData.id) ?? byName.get(u.unitData.name.toLowerCase());
          if (!fresh) return u;
          return {
            ...u,
            unitData: {
              ...fresh,
              points: u.unitData.points, // keep imported/overridden points
            },
          };
        }),
      }));
      // Only persist if something actually changed
      const changed = JSON.stringify(updated) !== JSON.stringify(armies);
      if (changed) persist(updated);
    },
    [armies, persist]
  );

  const exportArmy = useCallback(
    (armyId: string): string => {
      const army = armies.find((a) => a.id === armyId);
      if (!army) return '';
      return JSON.stringify(army, null, 2);
    },
    [armies]
  );

  const importArmy = useCallback(
    (json: string): { ok: boolean; error?: string } => {
      try {
        const army = JSON.parse(json) as Army;
        if (!army.id || !army.name || !Array.isArray(army.units)) {
          return { ok: false, error: 'Invalid army format' };
        }
        // Give it a new ID to avoid conflicts
        const imported: Army = {
          ...army,
          id: uid(),
          name: army.name + ' (imported)',
          updatedAt: new Date().toISOString(),
        };
        persist([...armies, imported]);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    },
    [armies, persist]
  );

  return {
    armies,
    createArmy,
    updateArmy,
    deleteArmy,
    addUnit,
    removeUnit,
    updateUnit,
    addAbility,
    removeAbility,
    refreshUnitData,
    exportArmy,
    importArmy,
  };
}
