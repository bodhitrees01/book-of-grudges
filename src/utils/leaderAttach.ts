import type { ApiAbility, ArmyUnit } from '../types';

/** Parse the "Leader" ability description to get the list of valid bodyguard unit names. */
export function parseLeaderTargets(abilities: ApiAbility[]): string[] {
  const leaderAbility = abilities.find((a) => a.name === 'Leader');
  if (!leaderAbility) return [];
  // e.g. "This model can be attached to the following units: EINHYR HEARTHGUARD, HEARTHKYN WARRIORS"
  const match = leaderAbility.description.match(/following units?[:\s]+([^.]+)/i);
  if (!match) return [];
  return match[1]
    .split(',')
    .map((s) => s.trim().replace(/\*\*/g, '').toLowerCase())
    .filter(Boolean);
}

/** Returns true if `leader` can attach to `bodyguard` based on the Leader ability text. */
export function leaderCanAttachTo(leader: ArmyUnit, bodyguard: ArmyUnit): boolean {
  if (!leader.unitData.isLeader) return false;
  const targets = parseLeaderTargets(leader.unitData.abilities);
  if (!targets.length) return false;
  const bodyguardName = bodyguard.unitData.name.toLowerCase();
  return targets.some(
    (t) => bodyguardName.includes(t) || t.includes(bodyguardName)
  );
}

/** Returns all leaders in the army that can attach to `bodyguard` and aren't already attached elsewhere. */
export function getAttachableLeaders(
  allUnits: ArmyUnit[],
  bodyguard: ArmyUnit
): ArmyUnit[] {
  const attachedElsewhere = new Set(
    allUnits.flatMap((u) =>
      u.id !== bodyguard.id ? u.attachedLeaderIds : []
    )
  );
  return allUnits.filter(
    (u) =>
      u.unitData.isLeader &&
      leaderCanAttachTo(u, bodyguard) &&
      !attachedElsewhere.has(u.id)
  );
}
