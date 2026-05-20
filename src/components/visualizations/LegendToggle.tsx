import React from 'react';

export interface LegendItem { name: string; color: string }

export interface LegendToggleProps {
  items: LegendItem[];
  hidden: string[];
  onToggle: (name: string) => void;
}

export const LegendToggle: React.FC<LegendToggleProps> = ({ items, hidden, onToggle }) => {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '8px 4px' }}>
      {items.map((it) => {
        const off = hidden.includes(it.name);
        return (
          <button
            key={it.name}
            type="button"
            onClick={() => onToggle(it.name)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 999,
              border: '1px solid rgba(148,163,184,0.25)',
              background: 'rgba(15,23,42,0.6)',
              color: off ? '#64748B' : '#E2E8F0',
              fontSize: 11,
              cursor: 'pointer',
              opacity: off ? 0.35 : 1,
              textDecoration: off ? 'line-through' : 'none',
              transition: 'all 200ms ease',
            }}
          >
            <span
              style={{
                width: 8, height: 8, borderRadius: '50%',
                background: off ? '#64748B' : it.color,
                transition: 'background 200ms ease',
              }}
            />
            {it.name}
          </button>
        );
      })}
    </div>
  );
};

export default LegendToggle;
