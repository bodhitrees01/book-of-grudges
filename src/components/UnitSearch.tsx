import { useState, useEffect } from 'react';
import { Search, Plus, RefreshCw, AlertCircle } from 'lucide-react';
import type { ApiUnit } from '../types';
import { searchVotannUnits, clearCache } from '../api/openHammer';

interface Props {
  onSelect: (unit: ApiUnit) => void;
}

export function UnitSearch({ onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ApiUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const run = async (q: string) => {
    setLoading(true);
    const { units, error: err } = await searchVotannUnits(q);
    setResults(units);
    setError(err ?? '');
    setLoading(false);
  };

  useEffect(() => {
    const t = setTimeout(() => run(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  const handleRefresh = () => {
    clearCache();
    run(query);
  };

  return (
    <div className="unit-search">
      <div className="search-input-wrap">
        <Search size={16} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search units…"
          autoFocus
        />
        <button
          type="button"
          className="btn-icon"
          onClick={handleRefresh}
          title="Refresh from API"
          style={{ marginLeft: 'auto' }}
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {loading && <p className="search-hint">Loading units from OpenHammer…</p>}

      {error && (
        <div className="api-error">
          <AlertCircle size={14} />
          <span>{error}</span>
          <button type="button" className="btn-ghost" onClick={handleRefresh} style={{ padding: '2px 8px', fontSize: '.78rem' }}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && results.length === 0 && (
        <p className="search-empty">No units found.</p>
      )}

      <ul className="search-results">
        {results.map((unit) => (
          <li key={unit.id} className="search-result-item">
            <div className="result-info">
              <span className="result-name">{unit.name}</span>
              <span className="result-meta">
                {unit.points} pts
                {unit.isLeader && <span className="leader-tag">Leader</span>}
                {unit.keywords.slice(0, 3).map((k) => (
                  <span key={k} className="kw-tag">{k}</span>
                ))}
              </span>
            </div>
            <button
              type="button"
              className="btn-icon"
              onClick={() => onSelect(unit)}
              title="Add to army"
            >
              <Plus size={16} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
