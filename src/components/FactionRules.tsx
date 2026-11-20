import { useState, type CSSProperties } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  faction: string;
}

export function FactionRules({ faction }: Props) {
  const [open, setOpen] = useState(false);

  if (!faction.toLowerCase().includes('votann')) return null;

  return (
    <div className="faction-rules-panel">
      <button
        type="button"
        className="faction-rules-toggle faction-rules-toggle--banner"
        style={{ '--banner': `url(${import.meta.env.BASE_URL}data/images/votann-banner.jpg)` } as CSSProperties}
        onClick={() => setOpen((v) => !v)}
      >
        <img
          className="faction-banner-mark"
          src={`${import.meta.env.BASE_URL}data/images/votann-mark-white.png`}
          alt=""
        />
        <span>Leagues of Votann — Prioritised Efficiency</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div className="faction-rules-body">

          {/* Ability switching */}
          <div className="fr-section">
            <div className="fr-section-title">Switching Abilities</div>
            <ul className="fr-list">
              <li>At the <strong>start of the battle</strong>: units have <span className="fr-tag fr-tag--hostile">Hostile Acquisition</span> until your next Command phase.</li>
              <li>End of Command phase, <strong>fewer than 7YP</strong>: units have <span className="fr-tag fr-tag--hostile">Hostile Acquisition</span> until your next Command phase.</li>
              <li>End of Command phase, <strong>7YP or more</strong>: units have <span className="fr-tag fr-tag--fortify">Fortify Takeover</span> until your next Command phase.</li>
            </ul>
          </div>

          {/* Hostile Acquisition */}
          <div className="fr-section fr-section--hostile">
            <div className="fr-section-title">Hostile Acquisition</div>
            <ul className="fr-list">
              <li>Each time a model makes an attack targeting an enemy unit <strong>within range of one or more objective markers</strong>, add 1 to the Hit roll.</li>
              <li>You can re-roll <strong>Advance</strong> and <strong>Charge</strong> rolls made for this unit.</li>
            </ul>
          </div>

          {/* Fortify Takeover */}
          <div className="fr-section fr-section--fortify">
            <div className="fr-section-title">Fortify Takeover</div>
            <ul className="fr-list">
              <li>Each time a model makes an attack targeting an enemy unit, if this unit is <strong>within range of one or more objective markers you control</strong>, add 1 to the Hit roll.</li>
              <li>Each time an attack targets this unit, if the attack's Strength is greater than this unit's Toughness and this unit is not a <strong>VEHICLE</strong>, subtract 1 from the Wound roll.</li>
            </ul>
          </div>

          {/* Yield Points */}
          <div className="fr-section">
            <div className="fr-section-title">Yield Points (YP)</div>
            <p className="fr-note">At the end of each player's Command phase, gain <strong>1YP</strong> if you control one or more objective markers within your deployment zone. From Round 2 onwards, gain 1 additional YP for each condition met:</p>
            <ul className="fr-list">
              <li>You control one or more objective markers <strong>not</strong> within your deployment zone.</li>
              <li>You control <strong>two or more</strong> objective markers not within your deployment zone.</li>
              <li>You control <strong>more</strong> objective markers than your opponent.</li>
            </ul>
            <p className="fr-note">YP is gained before checking which ability your units have. Spending YP reduces your total (cannot go below 0).</p>
          </div>

        </div>
      )}
    </div>
  );
}
