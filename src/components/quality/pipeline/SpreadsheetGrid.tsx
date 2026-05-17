import { useEffect, useMemo, useRef, useState } from 'react';
import { CellMetaMap, getMeta, isMissing, type Row, type CellState } from '@/lib/cleaningEngine';

const STATE_BG: Record<CellState, string> = {
  normal: 'transparent',
  outlier: '#FEE2E2',
  missing: '#FEF3C7',
  cleaned: '#D1FAE5',
  edited: '#DBEAFE',
};
const STATE_FG: Record<CellState, string> = {
  normal: '#E5E7EB',
  outlier: '#7F1D1D',
  missing: '#78350F',
  cleaned: '#065F46',
  edited: '#1E3A8A',
};

export interface SpreadsheetGridProps {
  data: Row[];
  meta: CellMetaMap;
  onCellEdit?: (row: number, col: string, value: unknown) => void;
  onCellContext?: (row: number, col: string, x: number, y: number) => void;
  onColumnContext?: (col: string, x: number, y: number) => void;
  height?: number;
  maxRows?: number;
}

export function SpreadsheetGrid({
  data,
  meta,
  onCellEdit,
  onCellContext,
  onColumnContext,
  height = 480,
  maxRows = 500,
}: SpreadsheetGridProps) {
  const cols = useMemo(() => (data.length ? Object.keys(data[0]) : []), [data]);
  const view = useMemo(() => data.slice(0, maxRows), [data, maxRows]);
  const [editing, setEditing] = useState<{ row: number; col: string } | null>(null);
  const [draft, setDraft] = useState('');
  const [focus, setFocus] = useState<{ row: number; col: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const computeState = (row: number, col: string, raw: unknown): CellState => {
    const m = getMeta(meta, row, col);
    if (m) return m.state;
    if (isMissing(raw)) return 'missing';
    return 'normal';
  };

  const startEdit = (row: number, col: string, raw: unknown) => {
    setEditing({ row, col });
    setDraft(raw === null || raw === undefined ? '' : String(raw));
  };

  const commit = () => {
    if (!editing) return;
    let val: unknown = draft;
    if (draft === '') val = null;
    else if (!isNaN(Number(draft)) && draft.trim() !== '') val = Number(draft);
    onCellEdit?.(editing.row, editing.col, val);
    setEditing(null);
  };

  const focusedCell = focus ? { row: focus.row, col: focus.col, raw: view[focus.row]?.[focus.col], meta: getMeta(meta, focus.row, focus.col) } : null;

  if (!data.length) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        No data — upload a dataset to begin.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div style={{ height, overflow: 'auto' }} className="relative">
        <table className="w-full border-collapse text-xs" style={{ fontFamily: 'ui-monospace, monospace' }}>
          <thead className="sticky top-0 z-20 bg-[#0F172A]">
            <tr>
              <th className="sticky left-0 z-30 bg-[#0F172A] border-b border-r border-border px-2 py-2 w-12 text-right text-muted-foreground font-normal">#</th>
              {cols.map((c) => (
                <th
                  key={c}
                  onContextMenu={(e) => { e.preventDefault(); onColumnContext?.(c, e.clientX, e.clientY); }}
                  className="border-b border-r border-border px-3 py-2 text-left font-semibold text-foreground whitespace-nowrap cursor-context-menu hover:bg-accent"
                  title="Right-click for column actions"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.map((row, ri) => (
              <tr key={ri} className="hover:bg-accent/30">
                <td className="sticky left-0 z-10 bg-[#0F172A] border-b border-r border-border px-2 py-1 text-right text-muted-foreground">{ri + 1}</td>
                {cols.map((c) => {
                  const raw = row[c];
                  const state = computeState(ri, c, raw);
                  const isEdit = editing?.row === ri && editing?.col === c;
                  return (
                    <td
                      key={c}
                      onClick={() => { setFocus({ row: ri, col: c }); if (!isEdit) startEdit(ri, c, raw); }}
                      onContextMenu={(e) => { e.preventDefault(); setFocus({ row: ri, col: c }); onCellContext?.(ri, c, e.clientX, e.clientY); }}
                      style={{ background: STATE_BG[state], color: state === 'normal' ? undefined : STATE_FG[state] }}
                      className="border-b border-r border-border/50 px-3 py-1 cursor-pointer whitespace-nowrap max-w-[240px] overflow-hidden text-ellipsis"
                    >
                      {isEdit ? (
                        <input
                          ref={inputRef}
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={commit}
                          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(null); }}
                          className="w-full bg-blue-50 text-blue-900 px-1 outline-none"
                        />
                      ) : raw === null || raw === undefined || raw === '' ? (
                        <span className="opacity-60">NULL</span>
                      ) : (
                        String(raw)
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-border bg-[#0B1322] px-3 py-2 text-xs text-muted-foreground flex items-center justify-between">
        <div>
          {focusedCell ? (
            <>
              Row <span className="text-foreground font-mono">{focusedCell.row + 1}</span> · Col{' '}
              <span className="text-foreground font-mono">{focusedCell.col}</span>
              {focusedCell.meta?.note && (
                <>
                  {' · '}
                  <span className="text-emerald-400">{focusedCell.meta.note}</span>
                  {focusedCell.meta.original !== undefined && (
                    <> (original: <span className="font-mono">{String(focusedCell.meta.original ?? 'NULL')}</span>)</>
                  )}
                </>
              )}
            </>
          ) : (
            <>Click a cell to edit · Right-click for actions</>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span>Rows: <span className="text-foreground font-mono">{data.length.toLocaleString()}</span></span>
          {data.length > maxRows && <span className="text-amber-400">Showing first {maxRows.toLocaleString()}</span>}
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#FEE2E2' }} /> Outlier
            <span className="inline-block w-3 h-3 rounded-sm ml-2" style={{ background: '#FEF3C7' }} /> Missing
            <span className="inline-block w-3 h-3 rounded-sm ml-2" style={{ background: '#D1FAE5' }} /> Cleaned
            <span className="inline-block w-3 h-3 rounded-sm ml-2" style={{ background: '#DBEAFE' }} /> Edited
          </div>
        </div>
      </div>
    </div>
  );
}
