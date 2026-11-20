import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { SelectedDetachment } from '../types';

interface Stratagem {
  name: string;
  cp: number;
  type: string;
  detachment: string;
  when: string;
  target: string;
  effect: string;
  restrictions: string;
}

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

function StratagemCard({ s }: { s: Stratagem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="strat-card">
      <button type="button" className="strat-header" onClick={() => setOpen((v) => !v)}>
        <span className="strat-cp">{s.cp}CP</span>
        <span className="strat-name">{s.name}</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div className="strat-body">
          <p><strong>When:</strong> {s.when}</p>
          <p><strong>Target:</strong> {s.target}</p>
          <p><strong>Effect:</strong> {s.effect}</p>
          {s.restrictions && <p><strong>Restrictions:</strong> {s.restrictions}</p>}
        </div>
      )}
    </div>
  );
}

export function Stratagems({ detachments }: { detachments: SelectedDetachment[] }) {
  const [all, setAll] = useState<Stratagem[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/stratagems.json`, { cache: 'no-cache' })
      .then((r) => r.json())
      .then(setAll)
      .catch(() => {});
  }, []);

  const groups: { title: string; items: Stratagem[] }[] = [];
  const core = all.filter((s) => s.detachment === 'Core');
  if (core.length) groups.push({ title: 'Core Stratagems', items: core });
  for (const d of detachments) {
    const key = norm(d.name);
    const items = all.filter((s) => s.detachment !== 'Core' && norm(s.detachment) === key);
    if (items.length) groups.push({ title: d.name, items });
  }

  if (!groups.length) return null;

  return (
    <div className="strat-section">
      <button type="button" className="strat-section-header" onClick={() => setOpen((v) => !v)}>
        <span>Stratagems</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && groups.map((g) => (
        <div key={g.title} className="strat-group">
          <h4 className="strat-group-title">{g.title}</h4>
          {g.items.map((s) => <StratagemCard key={s.name} s={s} />)}
        </div>
      ))}
    </div>
  );
}
