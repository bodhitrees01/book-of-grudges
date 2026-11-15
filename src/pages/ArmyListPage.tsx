import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Upload, ClipboardPaste, Trash2, Swords, Check, X, Loader } from 'lucide-react';
import type { useArmyStore } from '../store/armyStore';
import type { SelectedDetachment } from '../types';
import type { OHDetachment } from '../api/openHammer';
import { parseGWRosterText } from '../api/parseGWRoster';
import { fetchFactions, fetchDetachments, loadVotannUnits } from '../api/openHammer';
import type { ApiUnit } from '../types';

const DETACHMENT_BUDGET = 3;

interface Props {
  store: ReturnType<typeof useArmyStore>;
}

export function ArmyListPage({ store }: Props) {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  // Faction dropdown
  const [factions, setFactions] = useState<string[]>([]);
  const [factionsLoading, setFactionsLoading] = useState(false);
  const [faction, setFaction] = useState('Leagues of Votann');

  // Detachment selection
  const [availableDetachments, setAvailableDetachments] = useState<OHDetachment[]>([]);
  const [detachmentsLoading, setDetachmentsLoading] = useState(false);
  const [detachmentsUnavailable, setDetachmentsUnavailable] = useState(false);
  const [selectedDetachments, setSelectedDetachments] = useState<SelectedDetachment[]>([]);
  // Manual detachment editor (fallback)
  const [manualDetachments, setManualDetachments] = useState<SelectedDetachment[]>([]);
  const [addingManual, setAddingManual] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualCost, setManualCost] = useState(1);
  const [manualRule, setManualRule] = useState('');
  const [manualRuleDetail, setManualRuleDetail] = useState('');

  // Import
  const fileRef = useRef<HTMLInputElement>(null);
  const [importErr, setImportErr] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteErr, setPasteErr] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [knownUnits, setKnownUnits] = useState<ApiUnit[]>([]);

  // Load units for cross-referencing during roster import
  useEffect(() => {
    loadVotannUnits().then(({ units }) => setKnownUnits(units));
  }, []);

  // Load factions on mount
  useEffect(() => {
    setFactionsLoading(true);
    fetchFactions().then(({ factions: list }) => {
      if (list.length) setFactions(list);
      setFactionsLoading(false);
    });
  }, []);

  // Load detachments when faction changes
  useEffect(() => {
    if (!faction) return;
    setDetachmentsLoading(true);
    setAvailableDetachments([]);
    setSelectedDetachments([]);
    setDetachmentsUnavailable(false);
    fetchDetachments(faction).then(({ detachments, error }) => {
      if (detachments.length) {
        setAvailableDetachments(detachments);
      } else {
        setDetachmentsUnavailable(true);
      }
      void error;
      setDetachmentsLoading(false);
    });
  }, [faction]);

  const pointsSpent = selectedDetachments.reduce((s, d) => s + d.cost, 0)
    + manualDetachments.reduce((s, d) => s + d.cost, 0);
  const pointsRemaining = DETACHMENT_BUDGET - pointsSpent;

  const toggleDetachment = (d: OHDetachment) => {
    const already = selectedDetachments.find((s) => s.id === d.id);
    if (already) {
      setSelectedDetachments((prev) => prev.filter((s) => s.id !== d.id));
    } else if (pointsRemaining >= d.cost) {
      setSelectedDetachments((prev) => [...prev, { id: d.id, name: d.name, cost: d.cost, rule: d.rule, ruleDetail: d.ruleDetail }]);
    }
  };

  const addManualDetachment = () => {
    if (!manualName.trim()) return;
    const d: SelectedDetachment = {
      id: `manual-${Date.now()}`,
      name: manualName.trim(),
      cost: manualCost,
      rule: manualRule.trim(),
      ruleDetail: manualRuleDetail.trim(),
    };
    setManualDetachments((prev) => [...prev, d]);
    setManualName(''); setManualCost(1); setManualRule(''); setManualRuleDetail('');
    setAddingManual(false);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const allDetachments = [...selectedDetachments, ...manualDetachments];
    const army = store.createArmy(name.trim(), faction.trim(), allDetachments);
    navigate(`/army/${army.id}`);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = store.importArmy(ev.target?.result as string);
      if (!result.ok) setImportErr(result.error ?? 'Unknown error');
      else setImportErr('');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handlePasteImport = (e: React.FormEvent) => {
    e.preventDefault();
    setPasteErr('');
    if (!pasteText.trim()) return;
    if (pasteText.trim().startsWith('{')) {
      const result = store.importArmy(pasteText);
      if (result.ok) { setPasteText(''); setShowPaste(false); return; }
    }
    const army = parseGWRosterText(pasteText, knownUnits);
    if (!army) { setPasteErr("Couldn't recognise this roster format."); return; }
    store.importArmy(JSON.stringify(army));
    setPasteText(''); setShowPaste(false);
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>The Book of Grudges</h1>
        <p className="subtitle">Warhammer 40,000 Battle Assistant</p>
      </header>

      <div className="page-actions">
        <button className="btn-primary" onClick={() => { setCreating((v) => !v); setShowPaste(false); }}>
          <Plus size={16} /> New Army
        </button>
        <button className="btn-secondary" onClick={() => { setShowPaste((v) => !v); setCreating(false); }}>
          <ClipboardPaste size={16} /> Paste Roster
        </button>
        <button className="btn-secondary" onClick={() => fileRef.current?.click()}>
          <Upload size={16} /> Import File
        </button>
        <input ref={fileRef} type="file" accept=".json" onChange={handleFileImport} hidden />
      </div>

      {importErr && <p className="error-msg">{importErr}</p>}

      {showPaste && (
        <form onSubmit={handlePasteImport} className="create-form card">
          <h2>Paste Roster</h2>
          <p className="paste-hint">In the GW 40k app: Share → Copy to clipboard, then paste below.</p>
          <label>
            Roster text
            <textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder="Paste your roster here…" rows={10} autoFocus />
          </label>
          {pasteErr && <p className="error-msg">{pasteErr}</p>}
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={!pasteText.trim()}>Import</button>
            <button type="button" className="btn-ghost" onClick={() => { setShowPaste(false); setPasteErr(''); setPasteText(''); }}>Cancel</button>
          </div>
        </form>
      )}

      {creating && (
        <form onSubmit={handleCreate} className="create-form card">
          <h2>New Army</h2>

          {/* Army name */}
          <label>
            Army name
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 1st Kinhost Strike Force" autoFocus required />
          </label>

          {/* Faction dropdown */}
          <label>
            Faction
            {factionsLoading ? (
              <div className="loading-row"><Loader size={14} className="spin" /> Loading factions…</div>
            ) : factions.length > 0 ? (
              <select value={faction} onChange={(e) => setFaction(e.target.value)}>
                {factions.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            ) : (
              <input type="text" value={faction} onChange={(e) => setFaction(e.target.value)} placeholder="e.g. Leagues of Votann" />
            )}
          </label>

          {/* Detachment selection */}
          <div className="detachment-section">
            <div className="detachment-section-header">
              <span className="section-heading" style={{ margin: 0 }}>Detachments</span>
              <span className={`budget-pill ${pointsRemaining === 0 ? 'budget-full' : ''}`}>
                {pointsSpent}/{DETACHMENT_BUDGET} pts
              </span>
            </div>

            {detachmentsLoading && (
              <div className="loading-row"><Loader size={14} className="spin" /> Loading detachments…</div>
            )}

            {!detachmentsLoading && availableDetachments.length > 0 && (
              <div className="detachment-pick-list">
                {(availableDetachments as OHDetachment[]).map((d) => {
                  const isSelected = !!selectedDetachments.find((s) => s.id === d.id);
                  const canAfford = pointsRemaining >= d.cost || isSelected;
                  return (
                    <label key={d.id} className={`detachment-pick-item ${isSelected ? 'selected' : ''} ${!canAfford && !isSelected ? 'disabled' : ''}`}>
                      <input type="checkbox" checked={isSelected} disabled={!canAfford && !isSelected} onChange={() => toggleDetachment(d)} />
                      <span className="det-name">{d.name}</span>
                      <span className="det-cost">{d.cost}pt{d.cost !== 1 ? 's' : ''}</span>
                      {d.rule && <span className="det-rule">{d.rule}</span>}
                    </label>
                  );
                })}
              </div>
            )}

            {/* Manual detachments (shown when API has none, or as additions) */}
            {!detachmentsLoading && (detachmentsUnavailable || manualDetachments.length > 0) && (
              <div className="manual-detachments">
                {detachmentsUnavailable && (
                  <p className="paste-hint" style={{ marginBottom: 8 }}>Detachment data not available from API — add manually:</p>
                )}
                {manualDetachments.map((d) => (
                  <div key={d.id} className="manual-det-row">
                    <span>{d.name}</span>
                    <span className="det-cost">{d.cost}pt{d.cost !== 1 ? 's' : ''}</span>
                    <button type="button" className="btn-icon btn-danger" onClick={() => setManualDetachments((prev) => prev.filter((x) => x.id !== d.id))}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {addingManual ? (
                  <div className="manual-det-form">
                    <input type="text" value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="Detachment name" />
                    <select value={manualCost} onChange={(e) => setManualCost(Number(e.target.value))}>
                      <option value={1}>1 pt</option>
                      <option value={2}>2 pts</option>
                      <option value={3}>3 pts</option>
                    </select>
                    <input type="text" value={manualRule} onChange={(e) => setManualRule(e.target.value)} placeholder="Rule name (optional)" />
                    <textarea value={manualRuleDetail} onChange={(e) => setManualRuleDetail(e.target.value)} placeholder="Rule description (optional)" rows={2} />
                    <div className="form-actions">
                      <button type="button" className="btn-primary" onClick={addManualDetachment} disabled={!manualName.trim() || pointsRemaining < manualCost}>Add</button>
                      <button type="button" className="btn-ghost" onClick={() => setAddingManual(false)}>Cancel</button>
                    </div>
                  </div>
                ) : pointsRemaining > 0 ? (
                  <button type="button" className="btn-add" onClick={() => setAddingManual(true)}>
                    <Plus size={12} /> Add detachment manually
                  </button>
                ) : null}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">Create</button>
            <button type="button" className="btn-ghost" onClick={() => setCreating(false)}>Cancel</button>
          </div>
        </form>
      )}

      {store.armies.length === 0 && !creating && !showPaste && (
        <div className="empty-state">
          <Swords size={48} />
          <p>No armies yet. Paste a roster or create one manually.</p>
        </div>
      )}

      <div className="army-list">
        {store.armies.map((army) => (
          <div key={army.id} className="army-card card">
            <div className="army-info" onClick={() => navigate(`/army/${army.id}`)}>
              <h2 className="army-name">{army.name}</h2>
              <div className="army-meta">
                <span>{army.faction || 'Unknown faction'}</span>
                <span>{army.points} pts</span>
                <span>{army.units.length} units</span>
              </div>
              {army.detachments?.length > 0 && (
                <div className="army-detachments">
                  {army.detachments.map((d) => (
                    <span key={d.id} className="detachment-tag">{d.name}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="army-card-actions">
              <button className="btn-primary" onClick={() => navigate(`/battle/${army.id}`)} title="Battle view">
                <Swords size={14} /> Battle
              </button>
              {confirmDeleteId === army.id ? (
                <div className="confirm-delete">
                  <span className="confirm-label">Delete?</span>
                  <button className="btn-icon" title="Confirm" onClick={() => { store.deleteArmy(army.id); setConfirmDeleteId(null); }}>
                    <Check size={15} style={{ color: '#ef4444' }} />
                  </button>
                  <button className="btn-icon" title="Cancel" onClick={() => setConfirmDeleteId(null)}>
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <button className="btn-icon btn-danger" onClick={() => setConfirmDeleteId(army.id)} title="Delete army">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
