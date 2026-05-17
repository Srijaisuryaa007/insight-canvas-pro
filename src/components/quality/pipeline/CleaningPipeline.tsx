import { useEffect, useRef, useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { SpreadsheetGrid } from './SpreadsheetGrid';
import { StepPanel } from './StepPanel';
import { CleaningSummary } from './CleaningSummary';
import { CellMetaMap, emptyMeta, setMeta as setCellMeta, isMissing, type Row } from '@/lib/cleaningEngine';
import { toast } from '@/hooks/use-toast';

interface MenuState { x: number; y: number; type: 'cell' | 'col'; row?: number; col: string; }

export function CleaningPipeline() {
  const { currentData, updateCurrentData, currentDataset } = useData();
  const originalRef = useRef<Row[] | null>(null);
  const [meta, setMeta] = useState<CellMetaMap>(() => emptyMeta());
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [menu, setMenu] = useState<MenuState | null>(null);

  useEffect(() => {
    if (currentData.length && !originalRef.current) originalRef.current = currentData;
  }, [currentData]);

  // close menu on outside click / escape
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(null); };
    window.addEventListener('click', close);
    window.addEventListener('keydown', esc);
    return () => { window.removeEventListener('click', close); window.removeEventListener('keydown', esc); };
  }, [menu]);

  const setData = (d: Row[]) => updateCurrentData(d);

  const onCellEdit = (row: number, col: string, value: unknown) => {
    const next = currentData.map((r, i) => (i === row ? { ...r, [col]: value } : r));
    const newMeta = new Map(meta);
    setCellMeta(newMeta, row, col, { state: 'edited', note: 'Manual edit', original: currentData[row][col] });
    setMeta(newMeta);
    updateCurrentData(next);
  };

  // cell context actions
  const cellAction = (action: string) => {
    if (!menu || menu.row === undefined) return;
    const { row, col } = menu;
    const newMeta = new Map(meta);
    let next = currentData;
    switch (action) {
      case 'fillDown': {
        const src = currentData[row][col];
        next = currentData.map((r, i) => i > row && isMissing(r[col]) ? { ...r, [col]: src } : r);
        break;
      }
      case 'fillUp': {
        const src = currentData[row][col];
        next = currentData.map((r, i) => i < row && isMissing(r[col]) ? { ...r, [col]: src } : r);
        break;
      }
      case 'clear':
        next = currentData.map((r, i) => i === row ? { ...r, [col]: null } : r);
        break;
      case 'flagOutlier':
        setCellMeta(newMeta, row, col, { state: 'outlier', note: 'Flagged manually' });
        setMeta(newMeta);
        setMenu(null);
        return;
      case 'ignoreIssue':
        setCellMeta(newMeta, row, col, { state: 'normal' });
        setMeta(newMeta);
        setMenu(null);
        return;
    }
    updateCurrentData(next);
    setMenu(null);
  };

  // column context actions
  const colAction = (action: string) => {
    if (!menu) return;
    const { col } = menu;
    let next = currentData;
    switch (action) {
      case 'fillMissing': {
        const present = currentData.find((r) => !isMissing(r[col]))?.[col];
        next = currentData.map((r) => isMissing(r[col]) ? { ...r, [col]: present ?? null } : r);
        break;
      }
      case 'rename': {
        const nn = prompt(`Rename column "${col}" to:`, col);
        if (!nn || nn === col) { setMenu(null); return; }
        next = currentData.map((r) => { const out: Row = {}; for (const k of Object.keys(r)) out[k === col ? nn : k] = r[k]; return out; });
        break;
      }
      case 'hide': {
        next = currentData.map((r) => { const out: Row = {}; for (const k of Object.keys(r)) if (k !== col) out[k] = r[k]; return out; });
        break;
      }
      case 'toString':
        next = currentData.map((r) => ({ ...r, [col]: r[col] === null || r[col] === undefined ? r[col] : String(r[col]) }));
        break;
      case 'toNumber':
        next = currentData.map((r) => { const n = Number(r[col]); return { ...r, [col]: isNaN(n) ? null : n }; });
        break;
    }
    updateCurrentData(next);
    toast({ title: 'Column updated' });
    setMenu(null);
  };

  const onUndoAll = () => {
    if (!originalRef.current) return;
    updateCurrentData(originalRef.current);
    setMeta(emptyMeta());
    setCompleted(new Set());
    setStep(0);
    toast({ title: 'All cleaning changes reverted' });
  };

  if (!currentData.length) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Upload a dataset to start the 11-step cleaning pipeline.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SpreadsheetGrid
        data={currentData}
        meta={meta}
        onCellEdit={onCellEdit}
        onCellContext={(row, col, x, y) => setMenu({ row, col, x, y, type: 'cell' })}
        onColumnContext={(col, x, y) => setMenu({ col, x, y, type: 'col' })}
      />

      <StepPanel
        data={currentData}
        meta={meta}
        setData={setData}
        setMeta={setMeta}
        currentStep={step}
        setCurrentStep={setStep}
        completed={completed}
        setCompleted={setCompleted}
      />

      <CleaningSummary
        original={originalRef.current || currentData}
        cleaned={currentData}
        datasetName={currentDataset?.name || 'dataset'}
        onUndo={onUndoAll}
      />

      {menu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ left: Math.min(menu.x, window.innerWidth - 200), top: Math.min(menu.y, window.innerHeight - 240) }}
          className="fixed z-50 w-48 rounded-md border border-border bg-popover shadow-xl py-1 text-sm"
        >
          {menu.type === 'cell' ? (
            <>
              <MenuItem onClick={() => cellAction('fillDown')}>Fill Down</MenuItem>
              <MenuItem onClick={() => cellAction('fillUp')}>Fill Up</MenuItem>
              <MenuItem onClick={() => cellAction('clear')}>Clear</MenuItem>
              <div className="my-1 border-t border-border" />
              <MenuItem onClick={() => cellAction('flagOutlier')}>Flag as Outlier</MenuItem>
              <MenuItem onClick={() => cellAction('ignoreIssue')}>Ignore Issue</MenuItem>
            </>
          ) : (
            <>
              <MenuItem onClick={() => colAction('fillMissing')}>Fill All Missing</MenuItem>
              <MenuItem onClick={() => colAction('rename')}>Rename Column</MenuItem>
              <MenuItem onClick={() => colAction('toString')}>Change Type → Text</MenuItem>
              <MenuItem onClick={() => colAction('toNumber')}>Change Type → Number</MenuItem>
              <div className="my-1 border-t border-border" />
              <MenuItem onClick={() => colAction('hide')}>Hide Column</MenuItem>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full text-left px-3 py-1.5 hover:bg-accent">
      {children}
    </button>
  );
}
