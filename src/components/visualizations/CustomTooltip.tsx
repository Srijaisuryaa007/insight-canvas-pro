import React from 'react';
import { formatNum } from '@/lib/formatters';

export interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey?: string }>;
  label?: string | number;
  allData?: Array<Record<string, unknown>>;
  metricCol?: string;
}

export const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active, payload, label, allData = [], metricCol,
}) => {
  if (!active || !payload || !payload.length) return null;

  const primary = payload[0];
  const primaryKey = metricCol ?? primary.dataKey ?? primary.name;
  let rank: number | null = null;
  let totalRows = 0;
  let pct: number | null = null;

  if (primaryKey && allData.length) {
    const values = allData
      .map((r) => Number(r[primaryKey]))
      .filter((v) => Number.isFinite(v));
    totalRows = values.length;
    if (totalRows) {
      const sorted = [...values].sort((a, b) => b - a);
      const idx = sorted.findIndex((v) => v === Number(primary.value));
      rank = idx >= 0 ? idx + 1 : null;
      const total = sorted.reduce((s, v) => s + v, 0);
      pct = total ? (Number(primary.value) / total) * 100 : null;
    }
  }

  const total = payload.reduce((s, p) => s + (Number(p.value) || 0), 0);

  return (
    <div
      style={{
        background: 'rgba(13,25,48,0.97)',
        border: '1px solid rgba(148,163,184,0.25)',
        borderRadius: 8,
        padding: '10px 12px',
        minWidth: 180,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        color: '#E2E8F0',
        fontSize: 12,
      }}
    >
      <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 6 }}>{String(label ?? '')}</div>
      {payload.map((p) => (
        <div
          key={p.dataKey ?? p.name}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' }}
        >
          <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, flexShrink: 0 }} />
          <span style={{ flex: 1, color: '#CBD5E1' }}>{p.name}</span>
          <span style={{ fontVariantNumeric: 'tabular-nums', color: '#F1F5F9', fontWeight: 600 }}>
            {formatNum(Number(p.value))}
          </span>
        </div>
      ))}
      {payload.length > 1 && (
        <div
          style={{
            display: 'flex', justifyContent: 'space-between', marginTop: 6, paddingTop: 6,
            borderTop: '1px solid rgba(148,163,184,0.2)', fontSize: 11, color: '#94A3B8',
          }}
        >
          <span>Total</span>
          <span style={{ fontVariantNumeric: 'tabular-nums', color: '#F1F5F9' }}>{formatNum(total)}</span>
        </div>
      )}
      {rank !== null && pct !== null && (
        <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(148,163,184,0.2)', fontSize: 10, color: '#64748B' }}>
          Rank #{rank} of {totalRows} · {pct.toFixed(1)}% of total
        </div>
      )}
    </div>
  );
};

export default CustomTooltip;
