import { useState, useRef, useEffect } from 'react';

interface Props {
  keyword: string;
  rules: Record<string, string>;
}

function normalise(k: string): string {
  return k.replace(/\s+\d+(\+)?$/, '').trim().toUpperCase();
}

const TOOLTIP_WIDTH = 260;
const MARGIN = 8;

export function WeaponKeyword({ keyword, rules }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const ref = useRef<HTMLSpanElement>(null);

  const key = normalise(keyword);
  const text = rules[key];

  function openTooltip() {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const vw = window.innerWidth;

    // Prefer centred above the button
    let left = r.left + r.width / 2 - TOOLTIP_WIDTH / 2;
    // Clamp so tooltip stays inside the viewport
    left = Math.max(MARGIN, Math.min(left, vw - TOOLTIP_WIDTH - MARGIN));

    setPos({ top: r.top - 6, left });
    setOpen(true);
  }

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
        ref={btnRef}
        type="button"
        className="weapon-keyword-btn"
        onClick={() => (open ? setOpen(false) : openTooltip())}
        aria-expanded={open}
      >
        {keyword}
      </button>
      {open && (
        <span
          className="weapon-keyword-tooltip"
          role="tooltip"
          style={{ top: pos.top, left: pos.left }}
        >
          <strong>{keyword}</strong>
          <span className="weapon-keyword-tooltip-body">{text}</span>
        </span>
      )}
    </span>
  );
}
