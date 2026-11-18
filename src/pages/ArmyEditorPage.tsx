import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Plus, Trash2, Link, Swords, Star, X, Pencil, Check } from 'lucide-react';
import type { useArmyStore } from '../store/armyStore';
import { UnitSearch } from '../components/UnitSearch';
import { getAllEnhancements, useEnhancementsReady } from '../data/enhancements';
import { fetchDetachments } from '../api/openHammer';
import type { ApiUnit, SelectedDetachment } from '../types';
import type { OHDetachment } from '../api/openHammer';

interface Props {
  store: ReturnType<typeof useArmyStore>;
}

const DETACHMENT_BUDGET = 3;

export function ArmyEditorPage({ store }: Props) {
  const { armyId } = useParams<{ armyId: string }>();
  const navigate = useNavigate();
  const [showSearch, setShowSearch] = useState(false);
  const [linkingUnit, setLinkingUnit] = useState<string | null>(null);
  const [editingEnhUnit, setEditingEnhUnit] = useState<string | null>(null);
  useEnhancementsReady();

  // ── Army header edit state ────────────────────────────────
  const [editingHeader, setEditingHeader] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [availableDetachments, setAvailableDetachments] = useState<OHDetachment[]>([]);
  const [detachmentsLoading, setDetachmentsLoading] = useState(false);
  const [draftDetachments, setDraftDetachments] = useState<SelectedDetachment[]>([]);

  const army = store.armies.find((a) => a.id === armyId);

  // Load available detachments when edit mode opens
  useEffect(() => {
    if (!editingHeader || !army) return;
    setDraftName(army.name);
    setDraftDetachments(army.detachments ?? []);
    setDetachmentsLoading(true);
    fetchDetachments(army.faction).then(({ detachments }) => {
      setAvailableDetachments(detachments);
      setDetachmentsLoading(false);
    });
  }, [editingHeader]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!army) {
    return (
      <div className="page">
        <p>Army not found.</p>
        <button className="btn-ghost" onClick={() => navigate('/')}>Back</button>
      </div>
    );
  }

  const pointsSpent = draftDetachments.reduce((s, d) => s + d.cost, 0);
  const pointsRemaining = DETACHMENT_BUDGET - pointsSpent;

  const toggleDraftDetachment = (d: OHDetachment) => {
    const already = draftDetachments.find((s) => s.id === d.id);
    if (already) {
      setDraftDetachments((prev) => prev.filter((s) => s.id !== d.id));
    } else if (pointsRemaining >= d.cost) {
      setDraftDetachments((prev) => [
        ...prev,
        { id: d.id, name: d.name, cost: d.cost, rule: d.rule, ruleDetail: d.ruleDetail },
      ]);
    }
  };

  const saveHeader = () => {
    store.updateArmy(army.id, {
      name: draftName.trim() || army.name,
      detachments: draftDetachments,
    });
    setEditingHeader(false);
  };

  const handleAddUnit = (apiUnit: ApiUnit) => {
    store.addUnit(army.id, {
      apiUnitId: apiUnit.id,
      unitData: apiUnit,
      customAbilities: [],
      attachedLeaderIds: [],
      notes: '',
    });
    setShowSearch(false);
  };

  const handleExport = () => {
    const json = store.exportArmy(army.id);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${army.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleLeaderLink = (unitId: string, leaderId: string) => {
    const unit = army.units.find((u) => u.id === unitId);
    if (!unit) return;
    const current = unit.attachedLeaderIds;
    const next = current.includes(leaderId)
      ? current.filter((id) => id !== leaderId)
      : [...current, leaderId];
    store.updateUnit(army.id, unitId, { attachedLeaderIds: next });
    setLinkingUnit(null);
  };

  const toggleEnhancement = (unitId: string, enhName: string) => {
    const unit = army.units.find((u) => u.id === unitId);
    if (!unit) return;
    const current = unit.enhancements ?? [];
    const next = current.includes(enhName)
      ? current.filter((e) => e !== enhName)
      : [...current, enhName];
    store.updateUnit(army.id, unitId, { enhancements: next.length ? next : undefined });
  };

  const leaders = army.units.filter((u) => u.unitData.isLeader);

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-icon" onClick={() => navigate('/')}>
          <ArrowLeft size={18} />
        </button>

        {editingHeader ? (
          /* ── Edit mode ── */
          <div className="header-edit-panel">
            <div className="header-edit-name-row">
              <input
                className="header-edit-input"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Army name"
                autoFocus
              />
            </div>

            <div className="header-edit-detachments">
              <span className="header-edit-label">Detachments ({pointsRemaining} pts remaining):</span>
              {/* Currently selected */}
              <div className="header-edit-selected">
                {draftDetachments.map((d) => (
                  <span key={d.id} className="enh-pill">
                    {d.name}
                    <button
                      type="button"
                      className="enh-pill-remove"
                      onClick={() => setDraftDetachments((prev) => prev.filter((x) => x.id !== d.id))}
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
                {draftDetachments.length === 0 && <span className="muted-text">None selected</span>}
              </div>

              {/* Available to pick */}
              {detachmentsLoading && <span className="muted-text">Loading…</span>}
              {!detachmentsLoading && availableDetachments.length > 0 && (
                <div className="header-edit-det-list">
                  {availableDetachments
                    .filter((d) => !draftDetachments.find((s) => s.id === d.id))
                    .map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        className={`enh-pick-item${pointsRemaining < d.cost ? ' enh-pick-item--disabled' : ''}`}
                        onClick={() => toggleDraftDetachment(d)}
                        disabled={pointsRemaining < d.cost}
                      >
                        <span className="enh-pick-name">{d.name}</span>
                        <span className="enh-pick-det">{d.cost} pt{d.cost !== 1 ? 's' : ''}</span>
                      </button>
                    ))}
                </div>
              )}
            </div>

            <div className="header-edit-actions">
              <button className="btn-primary" onClick={saveHeader}>
                <Check size={14} /> Save
              </button>
              <button className="btn-ghost" onClick={() => setEditingHeader(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* ── Display mode ── */
          <div className="header-title-group">
            <h1>{army.name}</h1>
            <p className="subtitle">{army.faction} · {army.points} pts · {army.units.length} units</p>
          </div>
        )}

        <div className="header-actions">
          {!editingHeader && (
            <button className="btn-secondary" onClick={() => setEditingHeader(true)} title="Edit name & detachments">
              <Pencil size={14} /> Edit
            </button>
          )}
          <button className="btn-secondary" onClick={handleExport}>
            <Download size={14} /> Export
          </button>
          <button className="btn-primary" onClick={() => navigate(`/battle/${army.id}`)}>
            <Swords size={14} /> Battle View
          </button>
        </div>
      </div>

      <div className="editor-layout">
        <div className="unit-list-section">
          <div className="section-header">
            <h2>Units</h2>
            <button className="btn-primary" onClick={() => setShowSearch((v) => !v)}>
              <Plus size={14} /> Add Unit
            </button>
          </div>

          {showSearch && (
            <div className="card">
              <UnitSearch onSelect={handleAddUnit} />
            </div>
          )}

          {army.units.length === 0 && !showSearch && (
            <p className="empty-hint">No units yet. Add units to build your army.</p>
          )}

          <div className="unit-rows">
            {army.units.map((armyUnit) => (
              <div key={armyUnit.id} className="unit-row card">
                <div className="unit-row-info">
                  <span className="unit-name">{armyUnit.unitData.name}</span>
                  <span className="unit-row-meta">
                    {armyUnit.unitData.faction} · {armyUnit.unitData.points} pts
                    {armyUnit.unitData.isLeader && <span className="leader-tag">Leader</span>}
                  </span>
                  {armyUnit.attachedLeaderIds.length > 0 && (
                    <div className="linked-leaders">
                      Attached leaders:{' '}
                      {armyUnit.attachedLeaderIds.map((lid) => {
                        const l = army.units.find((u) => u.id === lid);
                        return l ? (
                          <span key={lid} className="leader-pill">{l.unitData.name}</span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
                <div className="unit-row-actions">
                  <button
                    className={`btn-icon ${editingEnhUnit === armyUnit.id ? 'btn-active' : ''}`}
                    title="Edit enhancement"
                    onClick={() => setEditingEnhUnit(editingEnhUnit === armyUnit.id ? null : armyUnit.id)}
                  >
                    <Star size={16} />
                  </button>
                  {leaders.length > 0 && !armyUnit.unitData.isLeader && (
                    <button
                      className="btn-icon"
                      title="Attach leader"
                      onClick={() => setLinkingUnit(linkingUnit === armyUnit.id ? null : armyUnit.id)}
                    >
                      <Link size={16} />
                    </button>
                  )}
                  <button
                    className="btn-icon btn-danger"
                    title="Remove unit"
                    onClick={() => store.removeUnit(army.id, armyUnit.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {linkingUnit === armyUnit.id && (
                  <div className="leader-picker card">
                    <p className="picker-label">Toggle attached leaders:</p>
                    {leaders.map((l) => (
                      <label key={l.id} className="picker-item">
                        <input
                          type="checkbox"
                          checked={armyUnit.attachedLeaderIds.includes(l.id)}
                          onChange={() => toggleLeaderLink(armyUnit.id, l.id)}
                        />
                        {l.unitData.name}
                      </label>
                    ))}
                  </div>
                )}

                {editingEnhUnit === armyUnit.id && (() => {
                  const allEnhs = getAllEnhancements();
                  const current = armyUnit.enhancements ?? [];
                  return (
                    <div className="enhancement-picker card">
                      <p className="picker-label">Enhancement:</p>
                      {current.length > 0 && (
                        <div className="enh-current">
                          {current.map((e) => (
                            <span key={e} className="enh-pill">
                              {e}
                              <button
                                type="button"
                                className="enh-pill-remove"
                                onClick={() => toggleEnhancement(armyUnit.id, e)}
                              >
                                <X size={10} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      {current.length === 0 && (
                        <div className="enh-pick-list">
                          {allEnhs.length > 0 ? allEnhs.map((e) => (
                            <button
                              key={e.name}
                              type="button"
                              className="enh-pick-item"
                              onClick={() => { toggleEnhancement(armyUnit.id, e.name); setEditingEnhUnit(null); }}
                            >
                              <span className="enh-pick-name">{e.name}</span>
                              <span className="enh-pick-det">{e.detachment}</span>
                            </button>
                          )) : (
                            <p className="paste-hint">Enhancement data not loaded yet.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
