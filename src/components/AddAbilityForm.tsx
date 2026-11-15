import { useState } from 'react';
import type { AbilityEffect, AbilityEffectType } from '../types';
import { ABILITY_EFFECT_LABELS, ABILITY_EFFECT_PHASES } from '../types';
import { X } from 'lucide-react';

interface Props {
  sourceUnitName: string;
  onAdd: (ability: Omit<AbilityEffect, 'id'>) => void;
  onCancel: () => void;
}

const EFFECT_TYPES = Object.keys(ABILITY_EFFECT_LABELS) as AbilityEffectType[];

export function AddAbilityForm({ sourceUnitName, onAdd, onCancel }: Props) {
  const [type, setType] = useState<AbilityEffectType>('plus_one_hit');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      type,
      phase: ABILITY_EFFECT_PHASES[type],
      label: ABILITY_EFFECT_LABELS[type],
      description,
      sourceUnitName,
    });
    setType('plus_one_hit');
    setDescription('');
  };

  return (
    <form onSubmit={handleSubmit} className="add-ability-form">
      <div className="form-header">
        <span>Add Ability from {sourceUnitName}</span>
        <button type="button" onClick={onCancel} className="btn-icon">
          <X size={16} />
        </button>
      </div>
      <div className="form-row">
        <label>
          Effect type
          <select
            value={type}
            onChange={(e) => setType(e.target.value as AbilityEffectType)}
          >
            {EFFECT_TYPES.map((t) => (
              <option key={t} value={t}>
                {ABILITY_EFFECT_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-row">
        <label>
          Description (optional)
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. while within 6&quot; of objective"
          />
        </label>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn-primary">Add</button>
      </div>
    </form>
  );
}
