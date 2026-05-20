import React, { useMemo, useState } from 'react';
import { ChevronDown, X, Search } from 'lucide-react';

export type ColType = 'string' | 'number' | 'date' | 'boolean';
export interface FilterColMeta { name: string; type: ColType }

export type FilterValue =
  | { kind: 'cat'; values: string[] }
  | { kind: 'num'; min: number | null; max: number | null }
  | { kind: 'date'; from: string | null; to: string | null };

export type FilterMap = Record<string, FilterValue>;

export interface ChartFiltersProps {
  data: Array<Record<string, unknown>>;
  columns: FilterColMeta[];
  filters: FilterMap;
  onChange: (next: FilterMap) => void;
}

export function applyFilters(
  data: Array<Record<string, unknown>>,
  filters: FilterMap,
): Array<Record<string, unknown>> {
  const keys = Object.keys(filters);
  if (!keys.length) return data;
  return data.filter((row) => {
    for (const k of keys) {
      const f = filters[k];
      const v = row[k];
      if (f.kind === 'cat') {
        if (!f.values.length) continue;
        if (!f.values.includes(String(v ?? ''))) return false;
      } else if (f.kind === 'num') {
        const n = Number(v);
        if (!Number.isFinite(n)) return false;
        if (f.min != null && n < f.min) return false;
        if (f.max != null && n > f.max) return false;
      } else if (f.kind === 'date') {
        const s = String(v ?? '');
        if (f.from && s < f.from) return false;
        if (f.to && s > f.to) return false;
      }
    }
    return true;
  });
}

export const ChartFilters: React.FC<ChartFiltersProps> = ({ data, columns, filters, onChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState<Record<string, string>>({});

  const totalRows = data.length;
  const filteredCount = useMemo(() => applyFilters(data, filters).length, [data, filters]);

  const uniqueValues = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const c of columns) {
      if (c.type !== 'string') continue;
      const set = new Set<string>();
      for (const r of data) set.add(String(r[c.name] ?? ''));
      out[c.name] = [...set].sort().slice(0, 200);
    }
    return out;
  }, [data, columns]);

  const update = (col: string, val: FilterValue | null) => {
    const next = { ...filters };
    if (val === null) delete next[col];
    else next[col] = val;
    onChange(next);
  };

  const activeChips = Object.entries(filters).flatMap(([col, f]) => {
    if (f.kind === 'cat') return f.values.map((v) => ({ col, label: `${col}: ${v}`, remove: () => {
      const rest = f.values.filter((x) => x !== v);
      update(col, rest.length ? { kind: 'cat', values: rest } : null);
    }}));
    if (f.kind === 'num') {
      const parts: string[] = [];
      if (f.min != null) parts.push(`≥ ${f.min}`);
      if (f.max != null) parts.push(`≤ ${f.max}`);
      if (!parts.length) return [];
      return [{ col, label: `${col}: ${parts.join(', ')}`, remove: () => update(col, null) }];
    }
    if (f.kind === 'date') {
      const parts: string[] = [];
      if (f.from) parts.push(`from ${f.from}`);
      if (f.to) parts.push(`to ${f.to}`);
      if (!parts.length) return [];
      return [{ col, label: `${col}: ${parts.join(' ')}`, remove: () => update(col, null) }];
    }
    return [];
  });

  return (
    <div style={{ border: '1px solid rgba(148,163,184,0.2)', borderRadius: 8, background: 'rgba(13,25,48,0.5)', marginBottom: 12 }}>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px', background: 'transparent', color: '#E2E8F0', border: 'none', cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600 }}>Filters</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: '#94A3B8' }}>
          <span>Filtered: {filteredCount.toLocaleString()} of {totalRows.toLocaleString()} rows</span>
          {Object.keys(filters).length > 0 && (
            <span
              onClick={(e) => { e.stopPropagation(); onChange({}); }}
              style={{ color: '#60A5FA', cursor: 'pointer' }}
            >
              Clear all
            </span>
          )}
          <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }} />
        </span>
      </button>

      <div style={{ maxHeight: open ? 600 : 0, overflow: 'hidden', transition: 'max-height 300ms ease' }}>
        <div style={{ padding: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {columns.map((c) => {
            const f = filters[c.name];
            if (c.type === 'string') {
              const selected = f?.kind === 'cat' ? f.values : [];
              const q = (search[c.name] ?? '').toLowerCase();
              const opts = uniqueValues[c.name]?.filter((v) => !q || v.toLowerCase().includes(q)) ?? [];
              return (
                <div key={c.name} style={{ background: 'rgba(15,23,42,0.6)', padding: 8, borderRadius: 6 }}>
                  <div style={{ fontSize: 11, color: '#CBD5E1', marginBottom: 6 }}>{c.name}</div>
                  <div style={{ position: 'relative', marginBottom: 6 }}>
                    <Search size={12} style={{ position: 'absolute', left: 6, top: 6, color: '#64748B' }} />
                    <input
                      value={search[c.name] ?? ''}
                      onChange={(e) => setSearch({ ...search, [c.name]: e.target.value })}
                      placeholder="Search..."
                      style={{ width: '100%', padding: '4px 6px 4px 22px', background: '#0F172A', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 4, color: '#E2E8F0', fontSize: 11 }}
                    />
                  </div>
                  <div style={{ maxHeight: 140, overflowY: 'auto' }}>
                    {opts.slice(0, 100).map((v) => (
                      <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0', fontSize: 11, color: '#E2E8F0', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selected.includes(v)}
                          onChange={() => {
                            const next = selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v];
                            update(c.name, next.length ? { kind: 'cat', values: next } : null);
                          }}
                        />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v || '(empty)'}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            }
            if (c.type === 'number') {
              const min = f?.kind === 'num' ? f.min : null;
              const max = f?.kind === 'num' ? f.max : null;
              return (
                <div key={c.name} style={{ background: 'rgba(15,23,42,0.6)', padding: 8, borderRadius: 6 }}>
                  <div style={{ fontSize: 11, color: '#CBD5E1', marginBottom: 6 }}>{c.name}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="number" placeholder="Min" value={min ?? ''}
                      onChange={(e) => {
                        const v = e.target.value === '' ? null : Number(e.target.value);
                        update(c.name, { kind: 'num', min: v, max });
                      }}
                      style={{ flex: 1, padding: 4, background: '#0F172A', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 4, color: '#E2E8F0', fontSize: 11 }}
                    />
                    <input
                      type="number" placeholder="Max" value={max ?? ''}
                      onChange={(e) => {
                        const v = e.target.value === '' ? null : Number(e.target.value);
                        update(c.name, { kind: 'num', min, max: v });
                      }}
                      style={{ flex: 1, padding: 4, background: '#0F172A', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 4, color: '#E2E8F0', fontSize: 11 }}
                    />
                  </div>
                </div>
              );
            }
            if (c.type === 'date') {
              const from = f?.kind === 'date' ? f.from : null;
              const to = f?.kind === 'date' ? f.to : null;
              return (
                <div key={c.name} style={{ background: 'rgba(15,23,42,0.6)', padding: 8, borderRadius: 6 }}>
                  <div style={{ fontSize: 11, color: '#CBD5E1', marginBottom: 6 }}>{c.name}</div>
                  <div style={{ display: 'flex', gap: 6, flexDirection: 'column' }}>
                    <input
                      type="date" value={from ?? ''}
                      onChange={(e) => update(c.name, { kind: 'date', from: e.target.value || null, to })}
                      style={{ padding: 4, background: '#0F172A', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 4, color: '#E2E8F0', fontSize: 11 }}
                    />
                    <input
                      type="date" value={to ?? ''}
                      onChange={(e) => update(c.name, { kind: 'date', from, to: e.target.value || null })}
                      style={{ padding: 4, background: '#0F172A', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 4, color: '#E2E8F0', fontSize: 11 }}
                    />
                  </div>
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>

      {activeChips.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 12px', borderTop: '1px solid rgba(148,163,184,0.15)' }}>
          {activeChips.map((c, i) => (
            <span
              key={`${c.col}-${i}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px',
                background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.3)',
                borderRadius: 999, fontSize: 11, color: '#BFDBFE',
              }}
            >
              {c.label}
              <button
                type="button" onClick={c.remove}
                style={{ background: 'none', border: 'none', color: '#BFDBFE', cursor: 'pointer', padding: 0, display: 'flex' }}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChartFilters;
