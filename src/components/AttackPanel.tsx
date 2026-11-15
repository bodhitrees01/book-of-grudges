import type { AbilityEffect, AttackPhase } from '../types';
import { PHASE_LABELS } from '../types';

interface Props {
  abilities: AbilityEffect[];
}

const PHASE_ORDER: AttackPhase[] = ['hit', 'wound', 'post_hit', 'general'];

const PHASE_COLORS: Record<AttackPhase, string> = {
  hit: 'phase-hit',
  wound: 'phase-wound',
  post_hit: 'phase-posthit',
  general: 'phase-general',
};

export function AttackPanel({ abilities }: Props) {
  const byPhase = PHASE_ORDER.reduce<Record<AttackPhase, AbilityEffect[]>>(
    (acc, phase) => {
      acc[phase] = abilities.filter((a) => a.phase === phase);
      return acc;
    },
    { hit: [], wound: [], post_hit: [], general: [] }
  );

  const hasAny = abilities.length > 0;

  return (
    <div className="attack-panel">
      <h3 className="panel-title">Attack Sequence Modifiers</h3>
      {!hasAny && (
        <p className="panel-empty">No abilities tagged yet. Add abilities from unit cards to see them here.</p>
      )}
      {PHASE_ORDER.map((phase) => {
        const list = byPhase[phase];
        if (list.length === 0) return null;
        return (
          <div key={phase} className={`phase-group ${PHASE_COLORS[phase]}`}>
            <h4 className="phase-heading">{PHASE_LABELS[phase]}</h4>
            <ul className="ability-list">
              {list.map((ab) => (
                <li key={ab.id} className="ability-item">
                  <div className="ability-header">
                    <span className="ability-label">{ab.label}</span>
                    <span className="ability-source">{ab.sourceUnitName}</span>
                  </div>
                  {ab.description && (
                    <p className="ability-desc">{ab.description}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
