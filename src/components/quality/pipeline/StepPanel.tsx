import { useMemo, useState } from 'react';
import {
  CellMetaMap, type Row, type ImputeStrategy, type DateFormat, type CaseMode, type OutlierAction,
  imputeColumn, findMissingPerColumn, isNumericColumn, isDateColumn,
  standardizeDates, cleanNumbers, trimAll, applyCase, findFuzzyDuplicates, mergeFuzzy,
  findDuplicateRows, dedupeRows, flagOutliers, handleOutliers, computeFences,
  findTypeMismatches, applyTypeFix, standardizeName, renameColumns,
  findRuleViolations, suggestDerived, emptyMeta,
} from '@/lib/cleaningEngine';
import { Button } from '@/components/ui/button';
import { Check, ChevronRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const STEPS = [
  'Missing Values',
  'Date Formats',
  'Number Cleaning',
  'Text Standardization',
  'Duplicate Rows',
  'Outliers',
  'Column Types',
  'Column Names',
  'Business Rules',
  'Derived Columns',
  'Summary',
];

export interface StepPanelProps {
  data: Row[];
  meta: CellMetaMap;
  setData: (d: Row[]) => void;
  setMeta: (m: CellMetaMap) => void;
  onComplete?: () => void;
  currentStep: number;
  setCurrentStep: (n: number) => void;
  completed: Set<number>;
  setCompleted: (s: Set<number>) => void;
}

export function StepPanel(props: StepPanelProps) {
  const { data, meta, setData, setMeta, currentStep, setCurrentStep, completed, setCompleted, onComplete } = props;

  const markDone = (n: number) => { const s = new Set(completed); s.add(n); setCompleted(s); };
  const next = () => {
    markDone(currentStep);
    if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1);
    else onComplete?.();
  };

  return (
    <div className="grid grid-cols-[240px_1fr] gap-4">
      {/* Stepper */}
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="mb-3 text-xs text-muted-foreground">
          {completed.size} / {STEPS.length} complete
        </div>
        <div className="h-1.5 rounded-full bg-secondary mb-4 overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${(completed.size / STEPS.length) * 100}%` }} />
        </div>
        <ol className="space-y-1">
          {STEPS.map((label, i) => {
            const done = completed.has(i);
            const active = i === currentStep;
            return (
              <li key={i}>
                <button
                  onClick={() => setCurrentStep(i)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm transition-colors ${
                    active ? 'bg-primary/10 text-primary border border-primary/30' : 'hover:bg-accent text-muted-foreground'
                  }`}
                >
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${
                    done ? 'bg-emerald-500 text-white' : active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                  }`}>
                    {done ? <Check className="h-3 w-3" /> : i + 1}
                  </span>
                  <span className="truncate">{label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Active panel */}
      <div className="rounded-lg border border-border bg-card p-4 min-h-[420px] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">Step {currentStep + 1}: {STEPS[currentStep]}</h3>
          <Button size="sm" onClick={next}>
            {currentStep === STEPS.length - 1 ? 'Finish' : 'Next Step'}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        <div className="flex-1 overflow-auto">
          {currentStep === 0 && <Step1Missing data={data} meta={meta} setData={setData} setMeta={setMeta} />}
          {currentStep === 1 && <Step2Dates data={data} meta={meta} setData={setData} setMeta={setMeta} />}
          {currentStep === 2 && <Step3Numbers data={data} meta={meta} setData={setData} setMeta={setMeta} />}
          {currentStep === 3 && <Step4Text data={data} meta={meta} setData={setData} setMeta={setMeta} />}
          {currentStep === 4 && <Step5Dupes data={data} setData={setData} />}
          {currentStep === 5 && <Step6Outliers data={data} meta={meta} setData={setData} setMeta={setMeta} />}
          {currentStep === 6 && <Step7Types data={data} meta={meta} setData={setData} setMeta={setMeta} />}
          {currentStep === 7 && <Step8Names data={data} setData={setData} />}
          {currentStep === 8 && <Step9Rules data={data} setData={setData} />}
          {currentStep === 9 && <Step10Derived data={data} setData={setData} />}
          {currentStep === 10 && <Step11Done completed={completed.size + 1} />}
        </div>
      </div>
    </div>
  );
}

// ── STEP 1 ─────────────────────────────────────────────────────
function Step1Missing({ data, meta, setData, setMeta }: { data: Row[]; meta: CellMetaMap; setData: (d: Row[]) => void; setMeta: (m: CellMetaMap) => void }) {
  const missing = useMemo(() => findMissingPerColumn(data), [data]);
  const [strategy, setStrategy] = useState<Record<string, ImputeStrategy>>({});
  const cols = Object.keys(missing);

  const apply = (col: string, all = false) => {
    const targets = all ? cols : [col];
    const newMeta = new Map(meta);
    let next = data;
    let total = 0;
    for (const c of targets) {
      const s = strategy[c] || (isNumericColumn(next, c) ? 'median' : 'mode');
      const res = imputeColumn(next, c, s, newMeta);
      next = res.data;
      total += res.changedCells;
    }
    setData(next);
    setMeta(newMeta);
    toast({ title: 'Missing values filled', description: `${total} cell(s) updated.` });
  };

  if (!cols.length) return <EmptyPanel msg="No missing values detected. ✓" />;

  return (
    <div className="space-y-3">
      {cols.map((c) => {
        const isNum = isNumericColumn(data, c);
        const sel = strategy[c] || (isNum ? 'median' : 'mode');
        return (
          <div key={c} className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">Column: <span className="font-mono">{c}</span> · <span className="text-amber-400">{missing[c].length} missing</span></div>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {(['median', 'mean', 'mode', 'ffill', 'bfill', 'zero', 'interpolate'] as ImputeStrategy[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStrategy({ ...strategy, [c]: s })}
                  className={`px-2 py-1 rounded text-xs border transition-colors ${
                    sel === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent'
                  }`}
                >{s}</button>
              ))}
            </div>
            <div className="text-xs text-muted-foreground mb-2">
              Will fill rows {missing[c].slice(0, 5).map((i) => i + 1).join(', ')}{missing[c].length > 5 ? `, +${missing[c].length - 5} more` : ''}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => apply(c)}>Apply to this column</Button>
              <Button size="sm" variant="outline" onClick={() => apply(c, true)}>Apply to all</Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── STEP 2 ─────────────────────────────────────────────────────
function Step2Dates({ data, meta, setData, setMeta }: { data: Row[]; meta: CellMetaMap; setData: (d: Row[]) => void; setMeta: (m: CellMetaMap) => void }) {
  const cols = useMemo(() => (data.length ? Object.keys(data[0]).filter((c) => isDateColumn(data, c)) : []), [data]);
  const [fmt, setFmt] = useState<DateFormat>('iso');

  const apply = () => {
    const newMeta = new Map(meta);
    let next = data;
    let total = 0;
    for (const c of cols) { const r = standardizeDates(next, c, fmt, newMeta); next = r.data; total += r.changedCells; }
    setData(next); setMeta(newMeta);
    toast({ title: 'Dates standardized', description: `${total} date(s) updated.` });
  };

  if (!cols.length) return <EmptyPanel msg="No date columns detected." />;

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">Detected date columns: {cols.map((c) => <code key={c} className="mx-1 px-1 bg-secondary rounded">{c}</code>)}</div>
      <div className="rounded-md border border-border p-3">
        <div className="text-sm font-medium mb-2">Output format</div>
        <div className="flex flex-wrap gap-2">
          {([
            { v: 'iso', l: 'YYYY-MM-DD (ISO, recommended)' },
            { v: 'dmy', l: 'DD/MM/YYYY' },
            { v: 'mdy', l: 'MM/DD/YYYY' },
            { v: 'dmmmy', l: 'DD-MMM-YYYY' },
          ] as { v: DateFormat; l: string }[]).map((o) => (
            <button key={o.v} onClick={() => setFmt(o.v)}
              className={`px-3 py-1.5 rounded text-xs border ${fmt === o.v ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent'}`}>
              {o.l}
            </button>
          ))}
        </div>
      </div>
      <Button onClick={apply}>Apply to all date columns</Button>
    </div>
  );
}

// ── STEP 3 ─────────────────────────────────────────────────────
function Step3Numbers({ data, meta, setData, setMeta }: { data: Row[]; meta: CellMetaMap; setData: (d: Row[]) => void; setMeta: (m: CellMetaMap) => void }) {
  const apply = () => {
    const newMeta = new Map(meta);
    const r = cleanNumbers(data, newMeta);
    setData(r.data); setMeta(newMeta);
    toast({ title: 'Numbers cleaned', description: `${r.changedCells} cell(s) parsed.` });
  };
  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">Parses: <code>$1,234.56</code> → 1234.56 · <code>45.2%</code> → 0.452 · <code>1.2K</code> → 1200 · <code>(45)</code> → -45 · <code>N/A</code> → null</div>
      <Button onClick={apply}>Clean all numeric strings</Button>
    </div>
  );
}

// ── STEP 4 ─────────────────────────────────────────────────────
function Step4Text({ data, meta, setData, setMeta }: { data: Row[]; meta: CellMetaMap; setData: (d: Row[]) => void; setMeta: (m: CellMetaMap) => void }) {
  const [caseMode, setCaseMode] = useState<CaseMode>('title');
  const [fuzzyCol, setFuzzyCol] = useState('');
  const cols = data.length ? Object.keys(data[0]).filter((c) => typeof data[0][c] === 'string') : [];
  const groups = useMemo(() => (fuzzyCol ? findFuzzyDuplicates(data, fuzzyCol) : []), [data, fuzzyCol]);

  const applyTrim = () => {
    setData(trimAll(data));
    toast({ title: 'Whitespace trimmed' });
  };
  const applyCaseAll = () => {
    const newMeta = new Map(meta);
    let next = data;
    let total = 0;
    for (const c of cols) { const r = applyCase(next, c, caseMode, newMeta); next = r.data; total += r.changedCells; }
    setData(next); setMeta(newMeta);
    toast({ title: 'Case applied', description: `${total} cell(s).` });
  };
  const mergeAll = () => {
    const newMeta = new Map(meta);
    let next = data;
    let total = 0;
    for (const g of groups) { const r = mergeFuzzy(next, fuzzyCol, g.canonical, g.variants, newMeta); next = r.data; total += r.changedCells; }
    setData(next); setMeta(newMeta);
    toast({ title: 'Fuzzy duplicates merged', description: `${total} value(s) merged.` });
  };

  return (
    <div className="space-y-4">
      <Button variant="outline" size="sm" onClick={applyTrim}>Trim whitespace (all text cols)</Button>

      <div className="rounded-md border border-border p-3">
        <div className="text-sm font-medium mb-2">Capitalization</div>
        <div className="flex gap-2 mb-2">
          {(['title', 'upper', 'lower', 'keep'] as CaseMode[]).map((m) => (
            <button key={m} onClick={() => setCaseMode(m)}
              className={`px-2 py-1 rounded text-xs border ${caseMode === m ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent'}`}>
              {m}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={applyCaseAll}>Apply to all text columns</Button>
      </div>

      <div className="rounded-md border border-border p-3">
        <div className="text-sm font-medium mb-2">Fuzzy duplicate detection (Levenshtein ≤ 2)</div>
        <select value={fuzzyCol} onChange={(e) => setFuzzyCol(e.target.value)} className="bg-secondary border border-border rounded px-2 py-1 text-sm mb-2">
          <option value="">— select column —</option>
          {cols.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {fuzzyCol && (
          groups.length ? (
            <div className="space-y-2">
              {groups.slice(0, 10).map((g, i) => (
                <div key={i} className="text-xs">
                  <span className="text-muted-foreground">{g.variants.join(' / ')}</span> → <span className="font-medium">{g.canonical}</span>
                </div>
              ))}
              <Button size="sm" onClick={mergeAll}>Merge all groups</Button>
            </div>
          ) : <div className="text-xs text-muted-foreground">No fuzzy duplicates found.</div>
        )}
      </div>
    </div>
  );
}

// ── STEP 5 ─────────────────────────────────────────────────────
function Step5Dupes({ data, setData }: { data: Row[]; setData: (d: Row[]) => void }) {
  const dup = useMemo(() => findDuplicateRows(data), [data]);
  const remove = (keep: 'first' | 'last') => {
    const r = dedupeRows(data, keep);
    setData(r.data);
    toast({ title: 'Duplicates removed', description: r.message });
  };
  if (!dup.exact.length && !dup.near.length) return <EmptyPanel msg="No duplicate rows detected. ✓" />;
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
        Found <span className="font-semibold">{dup.exact.length}</span> exact and <span className="font-semibold">{dup.near.length}</span> near-duplicate group(s).
      </div>
      <div className="flex gap-2">
        <Button onClick={() => remove('first')}>Keep first occurrence</Button>
        <Button variant="outline" onClick={() => remove('last')}>Keep last occurrence</Button>
      </div>
    </div>
  );
}

// ── STEP 6 ─────────────────────────────────────────────────────
function Step6Outliers({ data, meta, setData, setMeta }: { data: Row[]; meta: CellMetaMap; setData: (d: Row[]) => void; setMeta: (m: CellMetaMap) => void }) {
  const cols = useMemo(() => (data.length ? Object.keys(data[0]).filter((c) => isNumericColumn(data, c)) : []), [data]);
  const [action, setAction] = useState<Record<string, OutlierAction>>({});

  const flagAll = () => {
    const newMeta = new Map(meta);
    let total = 0;
    for (const c of cols) total += flagOutliers(data, c, newMeta);
    setMeta(newMeta);
    toast({ title: 'Outliers flagged', description: `${total} cell(s) marked red.` });
  };
  const apply = (c: string) => {
    const a = action[c] || 'keep';
    const newMeta = new Map(meta);
    const r = handleOutliers(data, c, a, newMeta);
    setData(r.data); setMeta(newMeta);
    toast({ title: 'Outliers handled', description: r.message });
  };

  if (!cols.length) return <EmptyPanel msg="No numeric columns." />;
  return (
    <div className="space-y-3">
      <Button size="sm" onClick={flagAll}>Flag all outliers (IQR method)</Button>
      {cols.map((c) => {
        const f = computeFences(data, c);
        if (!f) return null;
        const a = action[c] || 'keep';
        return (
          <div key={c} className="rounded-md border border-border p-3">
            <div className="text-sm font-medium mb-1">{c}</div>
            <div className="text-xs text-muted-foreground mb-2">Fence: [{f.lower.toFixed(2)}, {f.upper.toFixed(2)}]</div>
            <div className="flex flex-wrap gap-2 mb-2">
              {([
                { v: 'keep', l: 'Keep as-is' },
                { v: 'cap', l: 'Cap at fences' },
                { v: 'median', l: 'Replace with median' },
                { v: 'flagcol', l: 'Add is_outlier flag column' },
              ] as { v: OutlierAction; l: string }[]).map((o) => (
                <button key={o.v} onClick={() => setAction({ ...action, [c]: o.v })}
                  className={`px-2 py-1 rounded text-xs border ${a === o.v ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent'}`}>{o.l}</button>
              ))}
            </div>
            <Button size="sm" onClick={() => apply(c)} disabled={a === 'keep'}>Apply</Button>
          </div>
        );
      })}
    </div>
  );
}

// ── STEP 7 ─────────────────────────────────────────────────────
function Step7Types({ data, meta, setData, setMeta }: { data: Row[]; meta: CellMetaMap; setData: (d: Row[]) => void; setMeta: (m: CellMetaMap) => void }) {
  const mismatches = useMemo(() => findTypeMismatches(data), [data]);
  if (!mismatches.length) return <EmptyPanel msg="All column types are consistent. ✓" />;
  const apply = (idx: number, action: 'convert' | 'null' | 'remove' | 'keep') => {
    const newMeta = new Map(meta);
    setData(applyTypeFix(data, mismatches[idx], action, newMeta));
    setMeta(newMeta);
  };
  return (
    <div className="space-y-2">
      <div className="text-sm text-muted-foreground">{mismatches.length} type mismatch(es) detected.</div>
      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-secondary"><tr><th className="px-2 py-1 text-left">Col</th><th className="px-2 py-1 text-left">Row</th><th className="px-2 py-1 text-left">Bad value</th><th className="px-2 py-1 text-left">Suggested</th><th className="px-2 py-1">Action</th></tr></thead>
          <tbody>
            {mismatches.slice(0, 50).map((m, i) => (
              <tr key={i} className="border-t border-border">
                <td className="px-2 py-1 font-mono">{m.col}</td>
                <td className="px-2 py-1">{m.row + 1}</td>
                <td className="px-2 py-1 text-red-400">{String(m.value)}</td>
                <td className="px-2 py-1 text-emerald-400">{m.suggested === null ? 'NULL' : String(m.suggested)}</td>
                <td className="px-2 py-1 flex gap-1">
                  <button onClick={() => apply(i, 'convert')} className="px-1 py-0.5 text-[10px] rounded bg-primary text-primary-foreground">Convert</button>
                  <button onClick={() => apply(i, 'null')} className="px-1 py-0.5 text-[10px] rounded border border-border">Null</button>
                  <button onClick={() => apply(i, 'remove')} className="px-1 py-0.5 text-[10px] rounded border border-red-500 text-red-400">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── STEP 8 ─────────────────────────────────────────────────────
function Step8Names({ data, setData }: { data: Row[]; setData: (d: Row[]) => void }) {
  const cols = data.length ? Object.keys(data[0]) : [];
  const [map, setMap] = useState<Record<string, string>>(() => Object.fromEntries(cols.map((c) => [c, standardizeName(c)])));
  const apply = () => { setData(renameColumns(data, map)); toast({ title: 'Columns renamed' }); };
  return (
    <div className="space-y-2">
      <table className="w-full text-xs">
        <thead><tr className="text-muted-foreground"><th className="text-left px-2 py-1">Original</th><th className="text-left px-2 py-1">New name</th></tr></thead>
        <tbody>
          {cols.map((c) => (
            <tr key={c} className="border-t border-border">
              <td className="px-2 py-1 font-mono">{c}</td>
              <td className="px-2 py-1"><input value={map[c] ?? ''} onChange={(e) => setMap({ ...map, [c]: e.target.value })} className="bg-secondary border border-border rounded px-2 py-0.5 font-mono w-full" /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button onClick={apply}>Apply all renames</Button>
    </div>
  );
}

// ── STEP 9 ─────────────────────────────────────────────────────
function Step9Rules({ data, setData }: { data: Row[]; setData: (d: Row[]) => void }) {
  const violations = useMemo(() => findRuleViolations(data), [data]);
  if (!violations.length) return <EmptyPanel msg="No business-rule violations detected. ✓" />;
  const remove = (idx: number) => setData(data.filter((_, i) => i !== violations[idx].row));
  return (
    <div className="space-y-2">
      <div className="text-sm text-muted-foreground">{violations.length} violation(s).</div>
      <div className="rounded-md border border-border overflow-hidden max-h-80 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-secondary sticky top-0"><tr><th className="px-2 py-1 text-left">Col</th><th className="px-2 py-1 text-left">Row</th><th className="px-2 py-1 text-left">Value</th><th className="px-2 py-1 text-left">Rule</th><th className="px-2 py-1">Action</th></tr></thead>
          <tbody>
            {violations.slice(0, 100).map((v, i) => (
              <tr key={i} className="border-t border-border">
                <td className="px-2 py-1 font-mono">{v.col}</td>
                <td className="px-2 py-1">{v.row + 1}</td>
                <td className="px-2 py-1 text-red-400">{String(v.value)}</td>
                <td className="px-2 py-1">{v.rule}</td>
                <td className="px-2 py-1"><button onClick={() => remove(i)} className="px-1 py-0.5 text-[10px] rounded border border-red-500 text-red-400">Remove Row</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── STEP 10 ────────────────────────────────────────────────────
function Step10Derived({ data, setData }: { data: Row[]; setData: (d: Row[]) => void }) {
  const suggestions = useMemo(() => suggestDerived(data), [data]);
  if (!suggestions.length) return <EmptyPanel msg="No derived-column suggestions for this dataset." />;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {suggestions.map((s) => (
        <div key={s.id} className="rounded-md border border-border p-3">
          <div className="text-sm font-medium mb-1">{s.label}</div>
          <div className="text-xs text-muted-foreground mb-2">Preview: {s.preview.map((v) => String(v ?? '—')).join(' · ')}</div>
          <Button size="sm" onClick={() => { setData(s.apply(data)); toast({ title: 'Column added', description: s.label }); }}>Add column</Button>
        </div>
      ))}
    </div>
  );
}

function Step11Done({ completed }: { completed: number }) {
  return <EmptyPanel msg={`Pipeline complete — ${completed}/${STEPS.length} steps run. See the Summary tab below for the report and downloads.`} />;
}

function EmptyPanel({ msg }: { msg: string }) {
  return <div className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground text-center">{msg}</div>;
}
