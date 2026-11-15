import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { SelectedDetachment } from '../types';

interface DetachmentRule {
  detachmentName: string;
  /** Alternate spellings/substrings to match against stored detachment names */
  aliases: string[];
  ruleName: string;
  ruleText: string;
}

const LOV_DETACHMENT_RULES: DetachmentRule[] = [
  // ── Faction Pack detachments (from GW PDF) ───────────────
  {
    detachmentName: 'Armoured Trailblazers',
    aliases: ['armoured trailblazers', 'trailblazers'],
    ruleName: 'Sagitaur Spearhead',
    ruleText:
      'Friendly SAGITAUR units have Scouts 6".',
  },
  {
    detachmentName: 'Farseekers',
    aliases: ['farseekers'],
    ruleName: 'Eye of the Hunt',
    ruleText:
      'Friendly HERNKYN units\' ranged attacks that target a unit within 12" have +1 to hit rolls.',
  },
  {
    detachmentName: 'Hearthguard Covenant',
    aliases: ['hearthguard covenant'],
    ruleName: 'Avatars of the Ancestors',
    ruleText:
      'Friendly KÂHL, EINHYR CHAMPION, EINHYR HEARTHGUARD and ÛTHAR THE DESTINED units\' ranged attacks that target a unit within 9" can re-roll wound rolls of 1. This detachment has the HEARTHGUARD tag and cannot be taken with another HEARTHGUARD detachment.',
  },
  {
    detachmentName: 'Hearthband',
    aliases: ['hearthband'],
    ruleName: 'Methodical Annihilation',
    ruleText:
      'Each time a Leagues of Votann model from your army makes an attack with a weapon that targets the closest eligible target, or a target within Engagement Range of that model\'s unit: re-roll a Wound roll of 1. If your unit is a Kâhl, Einhyr Hearthguard or Ûthar the Destined unit, improve the Armour Penetration characteristic of that attack by 1.',
  },
  {
    detachmentName: 'Mercenary Oathband',
    aliases: ['mercenary'],
    ruleName: 'Ruthless Reinvestment',
    ruleText:
      'Your Leagues of Votann units do not have Hostile Acquisition or Fortify Takeover except as described in this rule. At the start of the battle, your units have Hostile Acquisition. At the end of your Command phase, you can spend 3YP — if you do, your Leagues of Votann units lose Hostile Acquisition and gain Fortify Takeover, or vice versa.',
  },
  // ── Core codex detachments (from wahapedia) ──────────────
  {
    detachmentName: 'Needgaârd Oathband',
    aliases: ['needga', 'needgaard', 'needgaârd'],
    ruleName: 'Martial Leverage',
    ruleText:
      'Each time an enemy unit is destroyed, you gain 1YP.',
  },
  {
    detachmentName: 'Persecution Prospect',
    aliases: ['persecution'],
    ruleName: 'Assailed From Every Angle',
    ruleText:
      'LEAGUES OF VOTANN units from your army have the Guerrilla Adepts ability. In your Shooting phase, just after this unit is selected to shoot, select one enemy unit (excluding MONSTERS and VEHICLES). Until the end of the phase, attacks made by models in this unit can only target that enemy unit (if it is an eligible target), and after resolving those attacks, if one or more hit, until the start of your next Shooting phase that enemy unit is assailed. If it is already assailed, it also becomes pinned (subtract 2″ from Move and subtract 2 from Charge rolls).',
  },
  {
    detachmentName: 'Dêlve Assault Shift',
    aliases: ['delve', 'dêlve', 'assault shift'],
    ruleName: 'Fury From The Dêlve',
    ruleText:
      'CTHONIAN BESERKS units from your army have the Deep Strike ability. CTHONIAN BESERKS units from your army gain the BATTLELINE keyword.',
  },
  {
    detachmentName: 'Brandfast Oathband',
    aliases: ['brandfast'],
    ruleName: 'Mobile Sensor Relays',
    ruleText:
      'LEAGUES OF VOTANN TRANSPORT units from your army have the Firebase Control (Aura) ability: While a friendly LEAGUES OF VOTANN INFANTRY unit is wholly within 6″ of this TRANSPORT, ranged weapons equipped by models in that INFANTRY unit have the [SUSTAINED HITS 1] ability.',
  },
  {
    detachmentName: 'Hearthfyre Arsenal',
    aliases: ['hearthfyre'],
    ruleName: 'Optimal Application',
    ruleText:
      'At the end of your Command phase, you gain 1YP for each objective marker you control that is not within your deployment zone and has one or more IRON-MASTER and/or MEMNYR STRATEGIST models from your army within range of it (maximum 2YP per turn from this rule). In your Shooting phase, each time a BRÔKHYR, IRONKIN STEELJACKS or ARKANYST EVALUATOR unit from your army is selected to shoot, you can spend 1YP. If you do, until the end of the phase, each time a model in that unit makes an attack, re-roll a Hit roll of 1.',
  },
];

function matchDetachments(stored: SelectedDetachment): DetachmentRule[] {
  const name = stored.name.toLowerCase();
  return LOV_DETACHMENT_RULES.filter((r) =>
    r.aliases.some((alias) => name.includes(alias))
  );
}

interface CardProps {
  rule: DetachmentRule;
}

function DetachmentCard({ rule }: CardProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="det-rule-card">
      <button
        type="button"
        className="det-rule-header"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="det-rule-titles">
          <span className="det-rule-detname">{rule.detachmentName}</span>
          <span className="det-rule-rulename">{rule.ruleName}</span>
        </div>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && <p className="det-rule-body">{rule.ruleText}</p>}
    </div>
  );
}

interface Props {
  detachments: SelectedDetachment[];
}

export function DetachmentRules({ detachments }: Props) {
  const matched = detachments.flatMap((d) => matchDetachments(d));

  if (matched.length === 0) return null;

  return (
    <div className={`det-rules-row det-rules-count-${Math.min(matched.length, 3)}`}>
      {matched.map((rule) => (
        <DetachmentCard key={rule.detachmentName} rule={rule} />
      ))}
    </div>
  );
}
