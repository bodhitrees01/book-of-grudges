import { useState } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import {
  categorizeAbility,
  isWeaponKeywordAbility,
  CATEGORY_LABELS,
  type AbilityCategory,
} from '../utils/categorizeAbility';
import type { ApiAbility } from '../types';

/** Categories shown in the right-column panel (offensive modifiers only). */
const PANEL_CATEGORIES: AbilityCategory[] = ['toHit', 'toWound', 'postHit'];

export interface UnitAbilitySource {
  sourceName: string;
  abilities: ApiAbility[];
}

interface Props {
  sources: UnitAbilitySource[];
}

export function AbilitiesPanel({ sources }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<AbilityCategory>>(new Set());

  const abilities = sources
    .flatMap(({ sourceName, abilities: abs }) =>
      abs
        .filter((ab) => !isWeaponKeywordAbility(ab.name))
        .map((ab) => ({
          id: `${sourceName}::${ab.name}`,
          source: sourceName,
          name: ab.name,
          description: ab.description,
          category: categorizeAbility(ab.name, ab.description),
        }))
    )
    .filter((ab) => PANEL_CATEGORIES.includes(ab.category) && !dismissed.has(ab.id));

  const byCategory = Object.fromEntries(
    PANEL_CATEGORIES.map((cat) => [cat, abilities.filter((ab) => ab.category === cat)])
  ) as Record<AbilityCategory, typeof abilities>;

  const dismiss = (id: string) => setDismissed((prev) => new Set([...prev, id]));

  const toggleCollapse = (cat: AbilityCategory) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });

  if (abilities.length === 0) return null;

  return (
    <div className="abilities-panel">
      {PANEL_CATEGORIES.map((cat) => {
        const items = byCategory[cat];
        if (items.length === 0) return null;
        const isCollapsed = collapsed.has(cat);

        return (
          <div key={cat} className={`ap-category ap-category--${cat}`}>
            <button
              type="button"
              className="ap-category-header"
              onClick={() => toggleCollapse(cat)}
            >
              <span className="ap-category-label">{CATEGORY_LABELS[cat]}</span>
              <span className="ap-category-count">{items.length}</span>
              {isCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
            </button>

            {!isCollapsed && (
              <div className="ap-category-body">
                {items.map((ab) => (
                  <div key={ab.id} className="ap-ability">
                    <div className="ap-ability-header">
                      <span className="ap-ability-name">
                        {ab.name}
                        {sources.length > 1 && (
                          <span className="ap-ability-source"> ({ab.source})</span>
                        )}
                      </span>
                      <button
                        type="button"
                        className="ap-dismiss"
                        onClick={() => dismiss(ab.id)}
                        title="Dismiss"
                      >
                        <X size={11} />
                      </button>
                    </div>
                    <p className="ap-ability-desc">{ab.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
