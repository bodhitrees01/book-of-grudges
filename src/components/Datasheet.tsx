import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2, UserPlus, UserMinus } from 'lucide-react';
import type { ArmyUnit, AbilityEffect, Army, WeaponProfile } from '../types';
import { AddAbilityForm } from './AddAbilityForm';
import { AttackPanel } from './AttackPanel';
import { AbilitiesPanel } from './AbilitiesPanel';
import { parseLoadoutCounts, weaponCount } from '../utils/loadoutCounts';
import { categorizeAbility, isWeaponKeywordAbility } from '../utils/categorizeAbility';
import { lookupEnhancement, useEnhancementsReady } from '../data/enhancements';

interface Props {
  armyUnit: ArmyUnit;
  army: Army;
  onAddAbility: (ability: Omit<AbilityEffect, 'id'>) => void;
  onRemoveAbility: (abilityId: string) => void;
  /** Leaders eligible to be attached to this unit (not already attached elsewhere) */
  attachableLeaders?: ArmyUnit[];
  onAttachLeader?: (leaderId: string) => void;
  onDetachLeader?: (leaderId: string) => void;
  /** Battle mode: filter weapons by selected loadout and show model counts */
  isBattle?: boolean;
}

function StatsBlock({ unit, label }: { unit: ArmyUnit['unitData']; label?: string }) {
  return (
    <div className="stats-block">
      {label && <div className="stats-block-label">{label}</div>}
      {unit.profiles.map((profile, i) => (
        <div key={i}>
          {unit.profiles.length > 1 && (
            <div className="profile-name">{profile.name}</div>
          )}
          <table className="stats-table">
            <thead>
              <tr>
                <th>M</th><th>T</th><th>Sv</th>
                {profile.invulnSave && <th>Inv</th>}
                <th>W</th><th>Ld</th><th>OC</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{profile.movement}</td>
                <td>{profile.toughness}</td>
                <td>{profile.save}</td>
                {profile.invulnSave && <td>{profile.invulnSave}</td>}
                <td>{profile.wounds}</td>
                <td>{profile.leadership}</td>
                <td>{profile.objectiveControl}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function WeaponTable({
  weapons,
  skillHeader,
  noteCounts,
}: {
  weapons: WeaponProfile[];
  skillHeader: 'BS' | 'WS';
  noteCounts?: Map<string, number>;
}) {
  const rows: { w: WeaponProfile; count: number | undefined }[] = weapons
    .map((w) => ({ w, count: noteCounts ? weaponCount(w.name, noteCounts) : undefined }))
    .filter(({ count }) => count === undefined || count > 0);

  if (!rows.length) return null;

  const showCount = noteCounts && noteCounts.size > 0;

  return (
    <table className="weapons-table">
      <thead>
        <tr>
          <th>Weapon</th>
          <th>Range</th><th>A</th><th>{skillHeader}</th>
          <th>S</th><th>AP</th><th>D</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ w, count }, i) => (
          <tr key={i}>
            <td className="weapon-name-cell">
              <div className="weapon-name-row">
                {showCount && (
                  <span className="weapon-count">{count != null && count > 0 ? `${count}×` : '—'}</span>
                )}
                <div className="weapon-name-stack">
                  <span className="weapon-name">{w.name}</span>
                  {w.keywords.length > 0 && (
                    <span className="weapon-keywords">[{w.keywords.join(', ')}]</span>
                  )}
                </div>
              </div>
            </td>
            <td>{w.range}</td><td>{w.attacks}</td><td>{w.skill}</td>
            <td>{w.strength}</td><td>{w.ap}</td><td>{w.damage}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function WeaponsBlock({
  unit,
  label,
  noteCounts,
}: {
  unit: ArmyUnit['unitData'];
  label?: string;
  noteCounts?: Map<string, number>;
}) {
  // Only filter when at least one weapon actually matches the notes (avoid blank tables)
  const anyWeaponMatches = (nc: Map<string, number>) =>
    [...unit.rangedWeapons, ...unit.meleeWeapons].some((w) => {
      const c = weaponCount(w.name, nc);
      return c !== undefined && c > 0;
    });

  const effectiveCounts = noteCounts && noteCounts.size > 0 && anyWeaponMatches(noteCounts)
    ? noteCounts
    : undefined;

  const ranged = effectiveCounts
    ? unit.rangedWeapons.filter((w) => {
        const c = weaponCount(w.name, effectiveCounts);
        return c === undefined || c > 0;
      })
    : unit.rangedWeapons;
  const melee = effectiveCounts
    ? unit.meleeWeapons.filter((w) => {
        const c = weaponCount(w.name, effectiveCounts);
        return c === undefined || c > 0;
      })
    : unit.meleeWeapons;

  if (!ranged.length && !melee.length) return null;

  return (
    <div className="weapons-section">
      {label && <div className="weapons-section-label">{label}</div>}
      {ranged.length > 0 && (
        <div className="weapons-block">
          <h4 className="weapons-heading">Ranged Weapons</h4>
          <WeaponTable weapons={ranged} skillHeader="BS" noteCounts={effectiveCounts} />
        </div>
      )}
      {melee.length > 0 && (
        <div className="weapons-block">
          <h4 className="weapons-heading">Melee Weapons</h4>
          <WeaponTable weapons={melee} skillHeader="WS" noteCounts={effectiveCounts} />
        </div>
      )}
    </div>
  );
}

export function Datasheet({
  armyUnit,
  army,
  onAddAbility,
  onRemoveAbility,
  attachableLeaders = [],
  onAttachLeader,
  onDetachLeader,
  isBattle = false,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  useEnhancementsReady(); // triggers re-render once enhancements.json is loaded

  const unit = armyUnit.unitData;

  // Resolve enhancements: use the dedicated field if present, otherwise fall
  // back to parsing "Enhancement: <name>" lines out of notes (legacy imports
  // that pre-date the dedicated field will have them there).
  const getEnhancements = (au: ArmyUnit): string[] => {
    if (au.enhancements !== undefined) return au.enhancements;
    if (!au.notes) return [];
    return au.notes
      .split('\n')
      .map((l) => l.match(/^Enhancement:\s*(.+)$/i)?.[1]?.trim())
      .filter(Boolean) as string[];
  };

  // Parse imported loadout counts for the host unit; only used in battle mode
  const hostNoteCounts = useMemo(
    () => (isBattle && armyUnit.notes ? parseLoadoutCounts(armyUnit.notes) : new Map<string, number>()),
    [isBattle, armyUnit.notes]
  );

  const attachedLeaders = armyUnit.attachedLeaderIds
    .map((lid) => army.units.find((u) => u.id === lid))
    .filter(Boolean) as ArmyUnit[];

  const allAbilities: AbilityEffect[] = [
    ...armyUnit.customAbilities,
    ...attachedLeaders.flatMap((l) => l.customAbilities),
  ];

  const isMerged = attachedLeaders.length > 0;

  // For merged units show the leader's portrait; otherwise the unit's own
  const portraitUnit = isMerged && attachedLeaders.length > 0 ? attachedLeaders[0].unitData : unit;
  const portraitUrl = portraitUnit.imageUrl;

  return (
    <div className={`datasheet${isMerged ? ' datasheet--merged' : ''}`}>
      <button
        className="datasheet-header"
        onClick={() => setExpanded((v) => !v)}
        type="button"
      >
        <div className="unit-portrait">
          {portraitUrl ? (
            <img src={portraitUrl} alt={portraitUnit.name} className="unit-portrait-img" />
          ) : (
            <svg className="unit-portrait-placeholder" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="48" height="48" rx="4" fill="var(--surface2)" />
              <path d="M24 8L28 18H38L30 24L33 34L24 28L15 34L18 24L10 18H20L24 8Z" fill="var(--gold)" opacity="0.6" />
            </svg>
          )}
        </div>
        {isMerged ? (
          <span className="unit-name unit-name--merged">
            <strong>{attachedLeaders.map((l) => l.unitData.name).join(' + ')}</strong>
            <em className="unit-name-attached">Attached to: {unit.name}</em>
          </span>
        ) : (
          <span className="unit-name">{unit.name}</span>
        )}
        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {expanded && (
        <div className="datasheet-body">
          {isBattle ? (
            /* ── Battle mode: two-column layout ───────────────────── */
            <div className="datasheet-battle-cols">
              {/* LEFT: stats + weapons + notes + attach */}
              <div className="datasheet-col-left">
                {attachedLeaders.map((leader) => (
                  <div key={leader.id} className="leader-block">
                    <div className="leader-block-header">
                      <span className="leader-block-title">
                        <span className="leader-tag-inline">Leader</span>
                        {leader.unitData.name}
                      </span>
                      {onDetachLeader && (
                        <button
                          type="button"
                          className="btn-detach"
                          onClick={() => onDetachLeader(leader.id)}
                          title={`Detach ${leader.unitData.name}`}
                        >
                          <UserMinus size={14} /> Detach
                        </button>
                      )}
                    </div>
                    <StatsBlock unit={leader.unitData} />
                    <WeaponsBlock
                      unit={leader.unitData}
                      noteCounts={leader.notes ? parseLoadoutCounts(leader.notes) : undefined}
                    />
                  </div>
                ))}

                {isMerged && <div className="unit-block-label">{unit.name}</div>}
                <StatsBlock unit={unit} />
                <WeaponsBlock unit={unit} noteCounts={hostNoteCounts.size > 0 ? hostNoteCounts : undefined} />

                {/* Defensive + Other abilities stay in the left column */}
                {(() => {
                  const leftAbilities = [
                    ...attachedLeaders.flatMap((l) =>
                      l.unitData.abilities.map((ab) => ({ ...ab, source: l.unitData.name }))
                    ),
                    ...unit.abilities.map((ab) => ({ ...ab, source: unit.name })),
                  ].filter((ab) => {
                    if (isWeaponKeywordAbility(ab.name)) return false;
                    const cat = categorizeAbility(ab.name, ab.description);
                    return cat === 'defensive' || cat === 'other';
                  });
                  if (!leftAbilities.length) return null;
                  return (
                    <div className="raw-abilities-block">
                      <h4 className="section-heading">Unit Abilities</h4>
                      {leftAbilities.map((ab, i) => (
                        <div key={i} className="raw-ability">
                          <strong>{ab.name}:</strong> {ab.description}
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {armyUnit.notes && (
                  <details className="loadout-notes">
                    <summary className="loadout-notes-summary">Selected loadout</summary>
                    <pre className="loadout-notes-body">{armyUnit.notes}</pre>
                  </details>
                )}

                {!unit.isLeader && (attachableLeaders.length > 0 || attachedLeaders.length > 0) && (
                  <div className="attach-leader-section">
                    <span className="attach-leader-label">
                      <UserPlus size={14} /> Attach Leader:
                    </span>
                    {attachableLeaders.map((leader) => (
                      <button
                        key={leader.id}
                        type="button"
                        className="btn-attach-leader"
                        onClick={() => onAttachLeader?.(leader.id)}
                        title={`Attach ${leader.unitData.name} to this unit`}
                      >
                        + {leader.unitData.name}
                      </button>
                    ))}
                    {attachableLeaders.length === 0 && attachedLeaders.length > 0 && (
                      <span className="attach-leader-none">No more leaders available</span>
                    )}
                  </div>
                )}
              </div>

              {/* RIGHT: categorised abilities panel */}
              <div className="datasheet-col-right">
                <AbilitiesPanel
                  sources={[
                    ...attachedLeaders
                      .filter((l) => l.unitData.abilities.length > 0 || getEnhancements(l).length > 0)
                      .map((l) => ({
                        sourceName: l.unitData.name,
                        abilities: [
                          ...l.unitData.abilities,
                          ...getEnhancements(l).map(lookupEnhancement),
                        ],
                      })),
                    {
                      sourceName: unit.name,
                      abilities: [
                        ...unit.abilities,
                        ...getEnhancements(armyUnit).map(lookupEnhancement),
                      ],
                    },
                  ].filter((s) => s.abilities.length > 0)}
                />
              </div>
            </div>
          ) : (
            /* ── Edit mode: single-column layout (unchanged) ──────── */
            <>
              {attachedLeaders.map((leader) => (
                <div key={leader.id} className="leader-block">
                  <div className="leader-block-header">
                    <span className="leader-block-title">
                      <span className="leader-tag-inline">Leader</span>
                      {leader.unitData.name}
                    </span>
                    {onDetachLeader && (
                      <button
                        type="button"
                        className="btn-detach"
                        onClick={() => onDetachLeader(leader.id)}
                        title={`Detach ${leader.unitData.name}`}
                      >
                        <UserMinus size={14} /> Detach
                      </button>
                    )}
                  </div>
                  <StatsBlock unit={leader.unitData} />
                  <WeaponsBlock unit={leader.unitData} />
                  {leader.unitData.abilities.filter((ab) => !isWeaponKeywordAbility(ab.name)).length > 0 && (
                    <div className="leader-abilities-block">
                      <h4 className="section-heading leader-abilities-heading">
                        {leader.unitData.name} Abilities
                      </h4>
                      {leader.unitData.abilities
                        .filter((ab) => !isWeaponKeywordAbility(ab.name))
                        .map((ab, i) => (
                          <div key={i} className="raw-ability">
                            <strong>{ab.name}:</strong> {ab.description}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))}

              {isMerged && <div className="unit-block-label">{unit.name}</div>}
              <StatsBlock unit={unit} />
              <WeaponsBlock unit={unit} />

              {(unit.abilities.filter((ab) => !isWeaponKeywordAbility(ab.name)).length > 0 ||
                getEnhancements(armyUnit).length > 0) && (
                <div className="raw-abilities-block">
                  <h4 className="section-heading">
                    {isMerged ? `${unit.name} Abilities` : 'Unit Abilities'}
                  </h4>
                  {unit.abilities
                    .filter((ab) => !isWeaponKeywordAbility(ab.name))
                    .map((ab, i) => (
                      <div key={i} className="raw-ability">
                        <strong>{ab.name}:</strong> {ab.description}
                      </div>
                    ))}
                  {getEnhancements(armyUnit).map((enh, i) => {
                    const ab = lookupEnhancement(enh);
                    return (
                      <div key={`enh-${i}`} className="raw-ability raw-ability--enhancement">
                        <strong>{ab.name}:</strong>{ab.description ? ` ${ab.description}` : ' (Enhancement)'}
                      </div>
                    );
                  })}
                </div>
              )}

              {armyUnit.notes && (
                <details className="loadout-notes">
                  <summary className="loadout-notes-summary">Selected loadout</summary>
                  <pre className="loadout-notes-body">{armyUnit.notes}</pre>
                </details>
              )}

              {!unit.isLeader && (attachableLeaders.length > 0 || attachedLeaders.length > 0) && (
                <div className="attach-leader-section">
                  <span className="attach-leader-label">
                    <UserPlus size={14} /> Attach Leader:
                  </span>
                  {attachableLeaders.map((leader) => (
                    <button
                      key={leader.id}
                      type="button"
                      className="btn-attach-leader"
                      onClick={() => onAttachLeader?.(leader.id)}
                      title={`Attach ${leader.unitData.name} to this unit`}
                    >
                      + {leader.unitData.name}
                    </button>
                  ))}
                  {attachableLeaders.length === 0 && attachedLeaders.length > 0 && (
                    <span className="attach-leader-none">No more leaders available</span>
                  )}
                </div>
              )}

              <AttackPanel abilities={allAbilities} />

              <div className="add-ability-section">
                <h4 className="section-heading">Tag Attack Modifiers</h4>
                {[armyUnit, ...attachedLeaders].map((cu) => (
                  cu.customAbilities.length > 0 && (
                    <div key={cu.id} className="tagged-list">
                      <span className="tagged-source">{cu.unitData.name}:</span>
                      {cu.customAbilities.map((ab) => (
                        <span key={ab.id} className="tagged-pill">
                          {ab.label}
                          {cu.id === armyUnit.id && (
                            <button
                              type="button"
                              className="pill-remove"
                              onClick={() => onRemoveAbility(ab.id)}
                              title="Remove"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  )
                ))}

                {showAddForm ? (
                  <AddAbilityForm
                    sourceUnitName={unit.name}
                    onAdd={(ab) => { onAddAbility(ab); setShowAddForm(false); }}
                    onCancel={() => setShowAddForm(false)}
                  />
                ) : (
                  <button
                    type="button"
                    className="btn-add"
                    onClick={() => setShowAddForm(true)}
                  >
                    <Plus size={14} /> Add modifier for {unit.name}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
