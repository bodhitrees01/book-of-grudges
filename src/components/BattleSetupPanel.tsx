import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { Army, BattleSetup } from '../types';
import { SECONDARY_OBJECTIVES } from '../data/detachments';

interface Props {
  army: Army;
  onSave: (setup: BattleSetup) => void;
}

export function BattleSetupPanel({ army, onSave }: Props) {
  const [expanded, setExpanded] = useState(false);
  const setup = army.battleSetup ?? {
    primaryObjective: '',
    secondaryObjectives: [],
    customSecondary: '',
    notes: '',
  };

  const detachments = army.detachments ?? [];

  const toggleSecondary = (obj: string) => {
    const current = setup.secondaryObjectives;
    const next = current.includes(obj)
      ? current.filter((o) => o !== obj)
      : current.length < 2
      ? [...current, obj]
      : current;
    onSave({ ...setup, secondaryObjectives: next });
  };

  return (
    <div className="battle-setup-panel card">
      <button
        className="battle-setup-header"
        type="button"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="setup-header-left">
          <span className="setup-title">Battle Setup</span>
          {detachments.map((d) => (
            <span key={d.id} className="detachment-pill">{d.name}</span>
          ))}
          {setup.secondaryObjectives.length > 0 && (
            <span className="setup-hint">
              {setup.secondaryObjectives.join(' · ')}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {expanded && (
        <div className="battle-setup-body">

          {/* Detachment rules */}
          {detachments.length > 0 && (
            <div className="detachment-rules-list">
              {detachments.map((d) => (
                <div key={d.id} className="detachment-rule">
                  <h4 className="section-heading">
                    {d.name}
                    {d.rule ? ` — ${d.rule}` : ''}
                    <span className="det-cost-badge">{d.cost}pt{d.cost !== 1 ? 's' : ''}</span>
                  </h4>
                  {d.ruleDetail && <p className="rule-text">{d.ruleDetail}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Primary objective */}
          <div className="setup-section">
            <h4 className="section-heading">Primary Objective</h4>
            <input
              type="text"
              value={setup.primaryObjective}
              onChange={(e) => onSave({ ...setup, primaryObjective: e.target.value })}
              placeholder="e.g. Priority Targets"
            />
          </div>

          {/* Secondary objectives */}
          <div className="setup-section">
            <h4 className="section-heading">Secondary Objectives (pick up to 2)</h4>
            <div className="secondary-grid">
              {SECONDARY_OBJECTIVES.map((obj) => (
                <label key={obj} className="secondary-item">
                  <input
                    type="checkbox"
                    checked={setup.secondaryObjectives.includes(obj)}
                    onChange={() => toggleSecondary(obj)}
                    disabled={
                      !setup.secondaryObjectives.includes(obj) &&
                      setup.secondaryObjectives.length >= 2
                    }
                  />
                  {obj}
                </label>
              ))}
            </div>
            <label style={{ marginTop: 8 }}>
              Custom secondary
              <input
                type="text"
                value={setup.customSecondary}
                onChange={(e) => onSave({ ...setup, customSecondary: e.target.value })}
                placeholder="Enter a custom secondary objective…"
              />
            </label>
          </div>

          {/* Notes */}
          <div className="setup-section">
            <h4 className="section-heading">Pre-game Notes</h4>
            <textarea
              value={setup.notes}
              onChange={(e) => onSave({ ...setup, notes: e.target.value })}
              placeholder="Deployment notes, opponent's army, game plan…"
              rows={3}
            />
          </div>
        </div>
      )}
    </div>
  );
}
