import React, { useEffect, useMemo, useState } from 'react';
import { X, Download, ChevronUp, ChevronDown } from 'lucide-react';
import { formatNum } from '@/lib/formatters';

export interface ContextMenuItem { label: string; onClick: () => void }

export interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export const ChartContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  useEffect(() => {
    const handler = () => onClose();
    window.addEventListener('click', handler);
    window.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Escape') onClose(); });
    return () => window.removeEventListener('click', handler);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed', top: y, left: x, zIndex: 9999,
        background: 'rgba(13,25,48,0.98)', border: '1px solid rgba(148,163,184,0.3)',
        borderRadius: 6, padding: 4, minWidth: 180, boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((it, i) => (
        <button
          key={i}
          onClick={() => { it.onClick(); onClose(); }}
          style={{
            display: 'block', width: '100%', textAlign: 'left',
            padding: '6px 10px', background: 'transparent', border: 'none',
            color: '#E2E8F0', fontSize: 12, cursor: 'pointer', borderRadius: 4,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(96,165,250,0.15)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
};

export interface DrillModalProps {
  open: boolean;
  title: string;
  breadcrumbs: string[];
  rows: Array<Record<string, unknown>>;
  columns: string[];
  onClose: () => void;
}

export const DrillThroughModal: React.FC<DrillModalProps> = ({
  open, title, breadcrumbs, rows, columns, onClose,
}) => {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const pageSize = 100;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const out = [...rows];
    out.sort((a, b) => {
      const av = a[sortKey]; const bv = b[sortKey];
      const an = Number(av); const bn = Number(bv);
      let cmp = 0;
      if (Number.isFinite(an) && Number.isFinite(bn)) cmp = an - bn;
      else cmp = String(av ?? '').localeCompare(String(bv ?? ''));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return out;
  }, [rows, sortKey, sortDir]);

  const pageRows = sorted.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));

  const exportCSV = () => {
    const header = columns.join(',');
    const body = sorted.map((r) =>
      columns.map((c) => {
        const v = r[c];
        const s = v == null ? '' : String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(','),
    ).join('\n');
    const blob = new Blob([`${header}\n${body}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `drill_${Date.now()}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 10000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '95vw', height: '90vh', background: '#0B1220',
          border: '1px solid rgba(148,163,184,0.25)', borderRadius: 10,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.2)' }}>
          <div>
            <div style={{ color: '#F1F5F9', fontWeight: 600, fontSize: 14 }}>{title}</div>
            <div style={{ color: '#94A3B8', fontSize: 11, marginTop: 4 }}>
              {breadcrumbs.length ? breadcrumbs.join(' › ') : 'All rows'} · {sorted.length.toLocaleString()} rows
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={exportCSV} style={btnStyle}><Download size={14} /> Export CSV</button>
            <button onClick={onClose} style={{ ...btnStyle, padding: 6 }}><X size={16} /></button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead style={{ position: 'sticky', top: 0, background: '#0F172A', zIndex: 1 }}>
              <tr>
                {columns.map((c) => (
                  <th
                    key={c}
                    onClick={() => {
                      if (sortKey === c) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                      else { setSortKey(c); setSortDir('desc'); }
                    }}
                    style={{
                      padding: '8px 10px', textAlign: 'left', color: '#CBD5E1',
                      borderBottom: '1px solid rgba(148,163,184,0.2)', cursor: 'pointer',
                      whiteSpace: 'nowrap', userSelect: 'none',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {c}
                      {sortKey === c && (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r, i) => (
                <tr key={i} style={{ background: i % 2 ? 'rgba(15,23,42,0.4)' : 'transparent' }}>
                  {columns.map((c) => {
                    const v = r[c];
                    const isNum = typeof v === 'number' || (!isNaN(Number(v)) && v !== null && v !== '');
                    return (
                      <td key={c} style={{ padding: '6px 10px', color: '#E2E8F0', borderBottom: '1px solid rgba(148,163,184,0.08)', whiteSpace: 'nowrap', textAlign: isNum ? 'right' : 'left', fontVariantNumeric: 'tabular-nums' }}>
                        {isNum && v !== '' && v != null ? formatNum(Number(v)) : String(v ?? '')}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 8, borderTop: '1px solid rgba(148,163,184,0.2)', color: '#94A3B8', fontSize: 12 }}>
            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} style={btnStyle}>‹ Prev</button>
            <span>Page {page + 1} of {totalPages}</span>
            <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} style={btnStyle}>Next ›</button>
          </div>
        )}
      </div>
    </div>
  );
};

const btnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '6px 10px', background: 'rgba(96,165,250,0.15)',
  border: '1px solid rgba(96,165,250,0.3)', borderRadius: 4,
  color: '#BFDBFE', fontSize: 11, cursor: 'pointer',
};

export default DrillThroughModal;
