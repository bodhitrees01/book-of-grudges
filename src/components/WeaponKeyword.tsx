import { useState, useRef, useEffect } from 'react';

interface Props {
  keyword: string;
  rules: Record<string, string>;
}

function normalise(k: string): string {
  // Strip numeric suffix for parameterised keywords e.g. "RAPID FIRE 2" → "RAPID FIRE"
  return k.replace(/\s+\d+(\+)?$/, '').trim().toUpperCase();
}

export function WeaponKeyword({ keyword, rules }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  const key = normalise(keyword);
  const text = rules[key];

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!text) {
    return <span className="weapon-keyword weapon-keyword--plain">{keyword}</span>;
  }

  return (
    <span className="weapon-keyword weapon-keyword--link" ref={ref}>
      <button
        type="button"
        className="weapon-keyword-btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {keyword}
      </button>
      {open && (
        <span className="weapon-keyword-tooltip" role="tooltip">
          <strong>{keyword}</strong>
          <span className="weapon-keyword-tooltip-body">{text}</span>
        </span>
      )}
    </span>
  );
}
