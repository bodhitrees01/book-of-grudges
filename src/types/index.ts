export type AttackPhase = 'hit' | 'wound' | 'post_hit' | 'general';

export type AbilityEffectType =
  | 'plus_one_hit'
  | 'plus_one_wound'
  | 'sustained_hits_1'
  | 'sustained_hits_2'
  | 'strip_cover'
  | 'reroll_ones_hit'
  | 'reroll_ones_wound'
  | 'lethal_hits'
  | 'lethal_wounds'
  | 'plus_one_vp_on_destroy'
  | 'suppressed'
  | 'ignore_hit_modifiers'
  | 'other';

export interface AbilityEffect {
  id: string;
  type: AbilityEffectType;
  phase: AttackPhase;
  label: string;
  description: string;
  sourceUnitName: string;
}

export interface ApiAbility {
  name: string;
  description: string;
}

export interface WeaponProfile {
  name: string;
  range: string;
  attacks: string;
  skill: string;
  strength: string;
  ap: string;
  damage: string;
  keywords: string[];
  abilities?: string;
}

export interface UnitProfile {
  name: string;
  movement: string;
  toughness: string;
  save: string;
  invulnSave?: string;
  wounds: string;
  leadership: string;
  objectiveControl: string;
  keywords: string[];
}

export interface ApiUnit {
  id: string;
  name: string;
  faction: string;
  profiles: UnitProfile[];
  rangedWeapons: WeaponProfile[];
  meleeWeapons: WeaponProfile[];
  abilities: ApiAbility[];
  keywords: string[];
  points: number;
  isLeader?: boolean;
}

export interface ArmyUnit {
  id: string;
  apiUnitId: string;
  unitData: ApiUnit;
  customAbilities: AbilityEffect[];
  attachedLeaderIds: string[];
  notes: string;
  /** Enhancement names parsed from the GW app import (e.g. "Oathbound Speculator") */
  enhancements?: string[];
}

export interface BattleSetup {
  primaryObjective: string;
  secondaryObjectives: string[];
  customSecondary: string;
  notes: string;
}

export interface SelectedDetachment {
  id: string;
  name: string;
  cost: number;
  rule: string;
  ruleDetail: string;
}

export interface Army {
  id: string;
  name: string;
  faction: string;
  /** Legacy single detachment id — migrated to detachments[] on first load */
  detachmentId?: string;
  detachments: SelectedDetachment[];
  points: number;
  units: ArmyUnit[];
  battleSetup?: BattleSetup;
  createdAt: string;
  updatedAt: string;
}

export const ABILITY_EFFECT_LABELS: Record<AbilityEffectType, string> = {
  plus_one_hit: '+1 to Hit',
  plus_one_wound: '+1 to Wound',
  sustained_hits_1: 'Sustained Hits 1',
  sustained_hits_2: 'Sustained Hits 2',
  strip_cover: 'Strip Cover',
  reroll_ones_hit: 'Re-roll 1s to Hit',
  reroll_ones_wound: 'Re-roll 1s to Wound',
  lethal_hits: 'Lethal Hits',
  lethal_wounds: 'Lethal Wounds',
  plus_one_vp_on_destroy: '+1 VP (if unit destroyed)',
  suppressed: 'Suppressed (-1 to Hit)',
  ignore_hit_modifiers: 'Ignore Hit Roll Modifiers',
  other: 'Other',
};

export const ABILITY_EFFECT_PHASES: Record<AbilityEffectType, AttackPhase> = {
  plus_one_hit: 'hit',
  plus_one_wound: 'wound',
  sustained_hits_1: 'hit',
  sustained_hits_2: 'hit',
  strip_cover: 'post_hit',
  reroll_ones_hit: 'hit',
  reroll_ones_wound: 'wound',
  lethal_hits: 'hit',
  lethal_wounds: 'wound',
  plus_one_vp_on_destroy: 'general',
  suppressed: 'post_hit',
  ignore_hit_modifiers: 'hit',
  other: 'general',
};

export const PHASE_LABELS: Record<AttackPhase, string> = {
  hit: 'Modifiers to Hit',
  wound: 'Modifiers to Wound',
  post_hit: 'Post-Hit Modifiers',
  general: 'General',
};
