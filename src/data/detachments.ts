export interface Detachment {
  id: string;
  name: string;
  rule: string;
  ruleDetail: string;
}

// Leagues of Votann 10th edition detachments (codex August 2025)
// Points and exact rule text — verify against your codex
export const VOTANN_DETACHMENTS: Detachment[] = [
  {
    id: 'oathband',
    name: 'Oathband',
    rule: 'Ancestral Judgement',
    ruleDetail:
      'Each time an enemy unit with one or more Judgement tokens is destroyed, you gain 1 Command Point. Additionally, friendly Leagues of Votann units within 6" of that destruction gain [LETHAL HITS] until the end of the turn.',
  },
  {
    id: 'ancestors-grace',
    name: "Ancestor's Grace",
    rule: "Ancestor's Grace",
    ruleDetail:
      'Each time a friendly Leagues of Votann unit within range of a Grimnyr uses a Psychic ability, that unit may re-roll one hit roll or one wound roll. (Verify exact text against codex.)',
  },
  {
    id: 'grudge-sworn',
    name: 'Grudge Sworn',
    rule: 'Honour the Grudge',
    ruleDetail:
      'While a friendly unit is within 6" of an objective marker it controls, that unit has the [SUSTAINED HITS 1] ability on melee weapons. (Verify exact text against codex.)',
  },
  {
    id: 'hearthland-raiders',
    name: 'Hearthland Raiders',
    rule: 'Reclaim and Conquer',
    ruleDetail:
      'Friendly Leagues of Votann units that are within your opponent\'s deployment zone have +1 to their Objective Control characteristic. (Verify exact text against codex.)',
  },
];

export const SECONDARY_OBJECTIVES = [
  'Behind Enemy Lines',
  'Bring It Down',
  'Assassination',
  'Engage on All Fronts',
  'No Prisoners',
  'Overwhelming Force',
  'Retrieve Nachmund Data',
  'Storm Hostile Objective',
  'Raise the Banners High',
  'Deploy Teleport Homer',
  'Investigate Signals',
  'Psychological Warfare',
  'Establish Locus',
  'Sabotage',
];
