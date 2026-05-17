// 11-Step Data Cleaning Engine
// Pure functions — no UI. Each step takes data + options, returns
// { data, log, cellMeta } so the SpreadsheetGrid can color-code cells.

export type Row = Record<string, unknown>;
export type CellState = 'normal' | 'outlier' | 'missing' | 'cleaned' | 'edited';

export interface CellMeta {
  state: CellState;
  note?: string;
  original?: unknown;
}

// rowIdx → colName → meta
export type CellMetaMap = Map<number, Map<string, CellMeta>>;

export function emptyMeta(): CellMetaMap {
  return new Map();
}

export function setMeta(meta: CellMetaMap, row: number, col: string, m: CellMeta) {
  if (!meta.has(row)) meta.set(row, new Map());
  meta.get(row)!.set(col, m);
}

export function getMeta(meta: CellMetaMap, row: number, col: string): CellMeta | undefined {
  return meta.get(row)?.get(col);
}

// ── Detection helpers ──────────────────────────────────────────
const NULL_TOKENS = new Set(['', 'null', 'na', 'n/a', 'nan', '-', '—', 'none', 'undefined']);

export function isMissing(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'number' && isNaN(v)) return true;
  if (typeof v === 'string') return NULL_TOKENS.has(v.trim().toLowerCase());
  return false;
}

export function isNumericColumn(data: Row[], col: string): boolean {
  let hits = 0, total = 0;
  for (const r of data) {
    const v = r[col];
    if (isMissing(v)) continue;
    total++;
    if (typeof v === 'number') hits++;
    else if (typeof v === 'string' && !isNaN(Number(cleanNumberToken(v)))) hits++;
  }
  return total > 0 && hits / total > 0.7;
}

const DATE_RE = [
  /^\d{4}-\d{1,2}-\d{1,2}/,
  /^\d{1,2}\/\d{1,2}\/\d{2,4}/,
  /^\d{1,2}-\d{1,2}-\d{2,4}/,
  /^[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{2,4}/,
  /^\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4}/,
];

export function isDateString(v: unknown): boolean {
  if (typeof v !== 'string') return false;
  const t = v.trim();
  if (!t) return false;
  return DATE_RE.some((r) => r.test(t)) && !isNaN(Date.parse(t));
}

export function isDateColumn(data: Row[], col: string): boolean {
  let hits = 0, total = 0;
  for (const r of data) {
    const v = r[col];
    if (isMissing(v)) continue;
    total++;
    if (isDateString(v)) hits++;
  }
  return total > 0 && hits / total > 0.6;
}

// ── Number token cleaner (Step 3) ──────────────────────────────
export function cleanNumberToken(raw: string): string {
  let s = raw.trim();
  if (!s) return s;
  // (45) → -45
  const neg = /^\(.*\)$/.test(s);
  if (neg) s = s.slice(1, -1);
  // currency, commas, spaces
  s = s.replace(/[$£€¥₹,\s]/g, '');
  // percentage
  if (s.endsWith('%')) {
    const n = parseFloat(s.slice(0, -1));
    return isNaN(n) ? raw : String((neg ? -n : n) / 100);
  }
  // K/M/B/T suffix
  const suf = s.slice(-1).toUpperCase();
  const mult: Record<string, number> = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 };
  if (mult[suf]) {
    const n = parseFloat(s.slice(0, -1));
    if (!isNaN(n)) return String((neg ? -n : n) * mult[suf]);
  }
  const n = parseFloat(s);
  if (isNaN(n)) return raw;
  return String(neg ? -n : n);
}

// ── Levenshtein (Step 4) ───────────────────────────────────────
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}

// ── Step results ───────────────────────────────────────────────
export interface StepResult {
  data: Row[];
  changedCells: number;
  message: string;
}

// STEP 1 — Missing value imputation
export type ImputeStrategy = 'median' | 'mean' | 'mode' | 'ffill' | 'bfill' | 'zero' | 'interpolate';

export function findMissingPerColumn(data: Row[]): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  if (!data.length) return out;
  Object.keys(data[0]).forEach((c) => {
    const rows = data.map((r, i) => (isMissing(r[c]) ? i : -1)).filter((i) => i >= 0);
    if (rows.length) out[c] = rows;
  });
  return out;
}

export function imputeColumn(
  data: Row[],
  col: string,
  strategy: ImputeStrategy,
  meta: CellMetaMap,
): StepResult {
  const isNum = isNumericColumn(data, col);
  const present = data.map((r) => r[col]).filter((v) => !isMissing(v));
  let fillVal: unknown = null;

  if (strategy === 'median' || strategy === 'mean') {
    const nums = present.map((v) => Number(typeof v === 'string' ? cleanNumberToken(v) : v)).filter((n) => !isNaN(n));
    if (!nums.length) return { data, changedCells: 0, message: 'No numeric values to compute.' };
    if (strategy === 'mean') fillVal = nums.reduce((a, b) => a + b, 0) / nums.length;
    else {
      const s = [...nums].sort((a, b) => a - b);
      const mid = Math.floor(s.length / 2);
      fillVal = s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
    }
  } else if (strategy === 'mode') {
    const freq = new Map<string, number>();
    present.forEach((v) => freq.set(String(v), (freq.get(String(v)) || 0) + 1));
    const top = [...freq.entries()].sort((a, b) => b[1] - a[1])[0];
    fillVal = top ? (isNum ? Number(top[0]) : top[0]) : null;
  } else if (strategy === 'zero') {
    fillVal = 0;
  }

  let changed = 0;
  const next = data.map((row, i) => {
    if (!isMissing(row[col])) return row;
    let val: unknown = fillVal;
    if (strategy === 'ffill') {
      for (let k = i - 1; k >= 0; k--) {
        if (!isMissing(data[k][col])) { val = data[k][col]; break; }
      }
    } else if (strategy === 'bfill') {
      for (let k = i + 1; k < data.length; k++) {
        if (!isMissing(data[k][col])) { val = data[k][col]; break; }
      }
    } else if (strategy === 'interpolate' && isNum) {
      let prev: { i: number; v: number } | null = null;
      let nxt: { i: number; v: number } | null = null;
      for (let k = i - 1; k >= 0; k--) {
        const v = Number(data[k][col]);
        if (!isNaN(v) && !isMissing(data[k][col])) { prev = { i: k, v }; break; }
      }
      for (let k = i + 1; k < data.length; k++) {
        const v = Number(data[k][col]);
        if (!isNaN(v) && !isMissing(data[k][col])) { nxt = { i: k, v }; break; }
      }
      if (prev && nxt) val = prev.v + ((nxt.v - prev.v) * (i - prev.i)) / (nxt.i - prev.i);
      else if (prev) val = prev.v;
      else if (nxt) val = nxt.v;
    }
    if (val === null || val === undefined) return row;
    changed++;
    setMeta(meta, i, col, { state: 'cleaned', note: `Filled (${strategy})`, original: row[col] });
    return { ...row, [col]: typeof val === 'number' ? Math.round(val * 100) / 100 : val };
  });

  return { data: next, changedCells: changed, message: `Filled ${changed} cell(s) in "${col}" using ${strategy}.` };
}

// STEP 2 — Date standardization
export type DateFormat = 'iso' | 'dmy' | 'mdy' | 'dmmmy';

function pad(n: number) { return String(n).padStart(2, '0'); }
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function formatDateOut(d: Date, fmt: DateFormat): string {
  const y = d.getFullYear(), m = d.getMonth(), day = d.getDate();
  switch (fmt) {
    case 'iso': return `${y}-${pad(m + 1)}-${pad(day)}`;
    case 'dmy': return `${pad(day)}/${pad(m + 1)}/${y}`;
    case 'mdy': return `${pad(m + 1)}/${pad(day)}/${y}`;
    case 'dmmmy': return `${pad(day)}-${MONTHS[m]}-${y}`;
  }
}

export function standardizeDates(data: Row[], col: string, fmt: DateFormat, meta: CellMetaMap): StepResult {
  let changed = 0;
  const next = data.map((row, i) => {
    const v = row[col];
    if (!isDateString(v)) return row;
    const parsed = new Date(String(v));
    if (isNaN(parsed.getTime())) return row;
    const out = formatDateOut(parsed, fmt);
    if (out === String(v)) return row;
    changed++;
    setMeta(meta, i, col, { state: 'cleaned', note: `Date format → ${fmt}`, original: v });
    return { ...row, [col]: out };
  });
  return { data: next, changedCells: changed, message: `${changed} date(s) standardized in "${col}".` };
}

// STEP 3 — Number cleaning
export function cleanNumbers(data: Row[], meta: CellMetaMap): StepResult {
  let changed = 0;
  const cols = data.length ? Object.keys(data[0]) : [];
  const next = data.map((row, i) => {
    const out: Row = { ...row };
    for (const c of cols) {
      const v = row[c];
      if (typeof v !== 'string') continue;
      const t = v.trim();
      if (!t) continue;
      // null tokens
      if (NULL_TOKENS.has(t.toLowerCase())) { out[c] = null; changed++; setMeta(meta, i, c, { state: 'cleaned', note: 'Normalized null', original: v }); continue; }
      // try number cleaning if it looks numeric-ish
      if (/[$£€¥₹%,KMBT()]|^-?\d/.test(t)) {
        const cleaned = cleanNumberToken(t);
        const n = Number(cleaned);
        if (!isNaN(n) && cleaned !== t) {
          out[c] = n;
          changed++;
          setMeta(meta, i, c, { state: 'cleaned', note: `Parsed "${t}" → ${n}`, original: v });
        }
      }
    }
    return out;
  });
  return { data: next, changedCells: changed, message: `Cleaned ${changed} numeric cell(s).` };
}

// STEP 4 — Text standardization
export type CaseMode = 'title' | 'upper' | 'lower' | 'keep';

export function trimAll(data: Row[]): Row[] {
  return data.map((row) => {
    const out: Row = { ...row };
    for (const k of Object.keys(row)) {
      const v = row[k];
      if (typeof v === 'string') out[k] = v.replace(/\s+/g, ' ').trim();
    }
    return out;
  });
}

export function applyCase(data: Row[], col: string, mode: CaseMode, meta: CellMetaMap): StepResult {
  if (mode === 'keep') return { data, changedCells: 0, message: 'No case change.' };
  let changed = 0;
  const next = data.map((row, i) => {
    const v = row[col];
    if (typeof v !== 'string' || !v) return row;
    let out = v;
    if (mode === 'upper') out = v.toUpperCase();
    else if (mode === 'lower') out = v.toLowerCase();
    else if (mode === 'title') out = v.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
    if (out === v) return row;
    changed++;
    setMeta(meta, i, col, { state: 'cleaned', note: `Case → ${mode}`, original: v });
    return { ...row, [col]: out };
  });
  return { data: next, changedCells: changed, message: `Re-cased ${changed} cell(s) in "${col}".` };
}

export interface FuzzyGroup {
  canonical: string;
  variants: string[];
}

export function findFuzzyDuplicates(data: Row[], col: string, maxDist = 2): FuzzyGroup[] {
  const freq = new Map<string, number>();
  for (const r of data) {
    const v = r[col];
    if (typeof v !== 'string' || !v) continue;
    freq.set(v, (freq.get(v) || 0) + 1);
  }
  const keys = [...freq.keys()];
  const used = new Set<string>();
  const groups: FuzzyGroup[] = [];
  for (let i = 0; i < keys.length; i++) {
    if (used.has(keys[i])) continue;
    const variants = [keys[i]];
    used.add(keys[i]);
    for (let j = i + 1; j < keys.length; j++) {
      if (used.has(keys[j])) continue;
      if (keys[i].toLowerCase() === keys[j].toLowerCase() || levenshtein(keys[i].toLowerCase(), keys[j].toLowerCase()) <= maxDist) {
        variants.push(keys[j]);
        used.add(keys[j]);
      }
    }
    if (variants.length > 1) {
      const canonical = [...variants].sort((a, b) => (freq.get(b) || 0) - (freq.get(a) || 0))[0];
      groups.push({ canonical: canonical[0].toUpperCase() + canonical.slice(1).toLowerCase(), variants });
    }
  }
  return groups;
}

export function mergeFuzzy(data: Row[], col: string, canonical: string, variants: string[], meta: CellMetaMap): StepResult {
  let changed = 0;
  const set = new Set(variants);
  const next = data.map((row, i) => {
    const v = row[col];
    if (typeof v !== 'string' || !set.has(v) || v === canonical) return row;
    changed++;
    setMeta(meta, i, col, { state: 'cleaned', note: `Merged "${v}" → "${canonical}"`, original: v });
    return { ...row, [col]: canonical };
  });
  return { data: next, changedCells: changed, message: `Merged ${changed} variant(s) into "${canonical}".` };
}

// STEP 5 — Duplicate rows
export interface DupReport {
  exact: number[][];   // groups of row indices that are exact dupes
  near: number[][];    // ≥90% match groups
}

export function findDuplicateRows(data: Row[]): DupReport {
  const cols = data.length ? Object.keys(data[0]) : [];
  const exactMap = new Map<string, number[]>();
  data.forEach((r, i) => {
    const k = JSON.stringify(cols.map((c) => r[c] ?? null));
    if (!exactMap.has(k)) exactMap.set(k, []);
    exactMap.get(k)!.push(i);
  });
  const exact = [...exactMap.values()].filter((g) => g.length > 1);
  const exactRows = new Set(exact.flat());

  // Near-duplicate: ≥90% of columns match
  const near: number[][] = [];
  const usedNear = new Set<number>();
  const threshold = Math.max(1, Math.ceil(cols.length * 0.9));
  for (let i = 0; i < data.length; i++) {
    if (exactRows.has(i) || usedNear.has(i)) continue;
    const group = [i];
    for (let j = i + 1; j < data.length; j++) {
      if (exactRows.has(j) || usedNear.has(j)) continue;
      let matches = 0;
      for (const c of cols) if (String(data[i][c] ?? '') === String(data[j][c] ?? '')) matches++;
      if (matches >= threshold) { group.push(j); usedNear.add(j); }
    }
    if (group.length > 1) { near.push(group); usedNear.add(i); }
  }
  return { exact, near };
}

export function dedupeRows(data: Row[], keep: 'first' | 'last'): StepResult {
  const { exact, near } = findDuplicateRows(data);
  const toRemove = new Set<number>();
  for (const g of [...exact, ...near]) {
    const sorted = [...g].sort((a, b) => a - b);
    const keepIdx = keep === 'first' ? sorted[0] : sorted[sorted.length - 1];
    sorted.forEach((i) => { if (i !== keepIdx) toRemove.add(i); });
  }
  const next = data.filter((_, i) => !toRemove.has(i));
  return { data: next, changedCells: toRemove.size, message: `Removed ${toRemove.size} duplicate row(s).` };
}

// STEP 6 — Outliers (flag only)
export interface Fences { lower: number; upper: number; q1: number; q3: number; }

export function computeFences(data: Row[], col: string): Fences | null {
  const nums = data.map((r) => Number(r[col])).filter((n) => !isNaN(n));
  if (nums.length < 4) return null;
  const s = [...nums].sort((a, b) => a - b);
  const q1 = s[Math.floor(s.length * 0.25)];
  const q3 = s[Math.floor(s.length * 0.75)];
  const iqr = q3 - q1;
  return { lower: q1 - 1.5 * iqr, upper: q3 + 1.5 * iqr, q1, q3 };
}

export function flagOutliers(data: Row[], col: string, meta: CellMetaMap): number {
  const f = computeFences(data, col);
  if (!f) return 0;
  let count = 0;
  data.forEach((r, i) => {
    const v = Number(r[col]);
    if (!isNaN(v) && (v < f.lower || v > f.upper)) {
      count++;
      setMeta(meta, i, col, { state: 'outlier', note: `Outside IQR fence [${f.lower.toFixed(1)}, ${f.upper.toFixed(1)}]` });
    }
  });
  return count;
}

export type OutlierAction = 'keep' | 'cap' | 'median' | 'flagcol';

export function handleOutliers(data: Row[], col: string, action: OutlierAction, meta: CellMetaMap): StepResult {
  const f = computeFences(data, col);
  if (!f || action === 'keep') return { data, changedCells: 0, message: 'Kept as-is.' };
  let changed = 0;
  if (action === 'flagcol') {
    const flagName = `is_outlier_${col}`;
    const next = data.map((r) => {
      const v = Number(r[col]);
      const flag = !isNaN(v) && (v < f.lower || v > f.upper);
      if (flag) changed++;
      return { ...r, [flagName]: flag };
    });
    return { data: next, changedCells: changed, message: `Added "${flagName}" with ${changed} flag(s).` };
  }
  if (action === 'cap') {
    const next = data.map((r, i) => {
      const v = Number(r[col]);
      if (isNaN(v)) return r;
      if (v < f.lower) { changed++; setMeta(meta, i, col, { state: 'cleaned', note: `Capped to ${f.lower.toFixed(2)}`, original: v }); return { ...r, [col]: f.lower }; }
      if (v > f.upper) { changed++; setMeta(meta, i, col, { state: 'cleaned', note: `Capped to ${f.upper.toFixed(2)}`, original: v }); return { ...r, [col]: f.upper }; }
      return r;
    });
    return { data: next, changedCells: changed, message: `Capped ${changed} outlier(s) in "${col}".` };
  }
  // median replace
  const nums = data.map((r) => Number(r[col])).filter((n) => !isNaN(n));
  const s = [...nums].sort((a, b) => a - b);
  const median = s.length % 2 ? s[Math.floor(s.length / 2)] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
  const next = data.map((r, i) => {
    const v = Number(r[col]);
    if (!isNaN(v) && (v < f.lower || v > f.upper)) {
      changed++;
      setMeta(meta, i, col, { state: 'cleaned', note: `Replaced with median ${median.toFixed(2)}`, original: v });
      return { ...r, [col]: median };
    }
    return r;
  });
  return { data: next, changedCells: changed, message: `Replaced ${changed} outlier(s) with median.` };
}

// STEP 7 — Column type enforcement
export interface TypeMismatch { row: number; col: string; value: unknown; suggested: number | string | null; }

export function findTypeMismatches(data: Row[]): TypeMismatch[] {
  const out: TypeMismatch[] = [];
  if (!data.length) return out;
  const cols = Object.keys(data[0]);
  for (const c of cols) {
    if (!isNumericColumn(data, c)) continue;
    data.forEach((r, i) => {
      const v = r[c];
      if (isMissing(v)) return;
      if (typeof v === 'number') return;
      const cleaned = cleanNumberToken(String(v));
      const n = Number(cleaned);
      out.push({ row: i, col: c, value: v, suggested: isNaN(n) ? null : n });
    });
  }
  return out;
}

export function applyTypeFix(data: Row[], mismatch: TypeMismatch, action: 'convert' | 'null' | 'remove' | 'keep', meta: CellMetaMap): Row[] {
  if (action === 'keep') return data;
  if (action === 'remove') return data.filter((_, i) => i !== mismatch.row);
  return data.map((r, i) => {
    if (i !== mismatch.row) return r;
    const val = action === 'convert' ? mismatch.suggested : null;
    setMeta(meta, i, mismatch.col, { state: 'cleaned', note: `Type fix → ${val}`, original: r[mismatch.col] });
    return { ...r, [mismatch.col]: val };
  });
}

// STEP 8 — Column name standardization
export function standardizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function renameColumns(data: Row[], rename: Record<string, string>): Row[] {
  return data.map((r) => {
    const out: Row = {};
    for (const k of Object.keys(r)) out[rename[k] || k] = r[k];
    return out;
  });
}

// STEP 9 — Business rule validation
export interface RuleViolation { row: number; col: string; value: unknown; rule: string; }

const NEG_INVALID = /^(age|price|qty|quantity|weight|count|stock|amount|salary|revenue)$/i;
const FUTURE_INVALID = /(birth|dob|created|signup|joined|registered)/i;
const PCT_LIKE = /(percent|pct|rate|score|ratio)/i;

export function findRuleViolations(data: Row[]): RuleViolation[] {
  const out: RuleViolation[] = [];
  if (!data.length) return out;
  const cols = Object.keys(data[0]);
  const now = Date.now();
  data.forEach((r, i) => {
    for (const c of cols) {
      const v = r[c];
      if (isMissing(v)) continue;
      const n = Number(v);
      if (!isNaN(n)) {
        if (NEG_INVALID.test(c) && n < 0) out.push({ row: i, col: c, value: v, rule: 'Negative not allowed' });
        if (PCT_LIKE.test(c) && n > 100) out.push({ row: i, col: c, value: v, rule: 'Value > 100 for percentage' });
      }
      if (FUTURE_INVALID.test(c) && isDateString(v)) {
        if (Date.parse(String(v)) > now) out.push({ row: i, col: c, value: v, rule: 'Future date not allowed' });
      }
    }
  });
  return out;
}

// STEP 10 — Derived columns
export interface DerivedSuggestion {
  id: string;
  label: string;
  preview: unknown[];
  apply: (data: Row[]) => Row[];
}

export function suggestDerived(data: Row[]): DerivedSuggestion[] {
  if (!data.length) return [];
  const cols = Object.keys(data[0]);
  const out: DerivedSuggestion[] = [];

  for (const c of cols) {
    if (isDateColumn(data, c)) {
      out.push({
        id: `${c}_year`,
        label: `Add Year from "${c}"`,
        preview: data.slice(0, 3).map((r) => { const d = new Date(String(r[c])); return isNaN(d.getTime()) ? null : d.getFullYear(); }),
        apply: (d) => d.map((r) => { const dt = new Date(String(r[c])); return { ...r, [`${c}_year`]: isNaN(dt.getTime()) ? null : dt.getFullYear() }; }),
      });
      out.push({
        id: `${c}_month`,
        label: `Add Month from "${c}"`,
        preview: data.slice(0, 3).map((r) => { const d = new Date(String(r[c])); return isNaN(d.getTime()) ? null : d.getMonth() + 1; }),
        apply: (d) => d.map((r) => { const dt = new Date(String(r[c])); return { ...r, [`${c}_month`]: isNaN(dt.getTime()) ? null : dt.getMonth() + 1 }; }),
      });
      out.push({
        id: `${c}_quarter`,
        label: `Add Quarter from "${c}"`,
        preview: data.slice(0, 3).map((r) => { const d = new Date(String(r[c])); return isNaN(d.getTime()) ? null : 'Q' + (Math.floor(d.getMonth() / 3) + 1); }),
        apply: (d) => d.map((r) => { const dt = new Date(String(r[c])); return { ...r, [`${c}_quarter`]: isNaN(dt.getTime()) ? null : 'Q' + (Math.floor(dt.getMonth() / 3) + 1) }; }),
      });
    }
    if (/full.?name|customer.?name/i.test(c)) {
      out.push({
        id: `${c}_split`,
        label: `Split "${c}" into First / Last`,
        preview: data.slice(0, 3).map((r) => String(r[c] ?? '').split(' ').slice(0, 2).join(' / ')),
        apply: (d) => d.map((r) => {
          const parts = String(r[c] ?? '').trim().split(/\s+/);
          return { ...r, first_name: parts[0] || null, last_name: parts.slice(1).join(' ') || null };
        }),
      });
    }
  }
  const hasRev = cols.find((c) => /revenue|sales/i.test(c));
  const hasCost = cols.find((c) => /cost|expense/i.test(c));
  if (hasRev && hasCost) {
    out.push({
      id: 'profit',
      label: `Add Profit (${hasRev} − ${hasCost})`,
      preview: data.slice(0, 3).map((r) => Number(r[hasRev!]) - Number(r[hasCost!])),
      apply: (d) => d.map((r) => ({ ...r, profit: Number(r[hasRev!]) - Number(r[hasCost!]) })),
    });
    out.push({
      id: 'margin',
      label: `Add Margin % (Profit / ${hasRev})`,
      preview: data.slice(0, 3).map((r) => { const rev = Number(r[hasRev!]); return rev ? (((rev - Number(r[hasCost!])) / rev) * 100).toFixed(1) + '%' : '—'; }),
      apply: (d) => d.map((r) => { const rev = Number(r[hasRev!]); return { ...r, margin_pct: rev ? Math.round(((rev - Number(r[hasCost!])) / rev) * 1000) / 10 : null }; }),
    });
  }
  return out;
}

// STEP 11 — Quality score
export interface QualityScore { score: number; breakdown: Record<string, number>; }

export function computeQualityScore(data: Row[]): QualityScore {
  if (!data.length) return { score: 0, breakdown: {} };
  const cols = Object.keys(data[0]);
  let missingPenalty = 0;
  let typePenalty = 0;
  let outlierPenalty = 0;
  let dupePenalty = 0;
  let nameBonus = 0;

  for (const r of data) for (const c of cols) if (isMissing(r[c])) missingPenalty++;
  missingPenalty = Math.min(30, missingPenalty * 2);

  typePenalty = Math.min(15, findTypeMismatches(data).length * 3);

  for (const c of cols) {
    if (!isNumericColumn(data, c)) continue;
    const f = computeFences(data, c);
    if (!f) continue;
    const o = data.map((r) => Number(r[c])).filter((n) => !isNaN(n) && (n < f.lower || n > f.upper)).length;
    outlierPenalty += o;
  }
  outlierPenalty = Math.min(10, outlierPenalty);

  const dup = findDuplicateRows(data);
  dupePenalty = Math.min(20, (dup.exact.flat().length + dup.near.flat().length) * 5);

  if (cols.every((c) => /^[a-z0-9_]+$/.test(c))) nameBonus = 5;

  const score = Math.max(0, Math.min(100, 100 - missingPenalty - typePenalty - outlierPenalty - dupePenalty + nameBonus));
  return {
    score,
    breakdown: {
      missing: -missingPenalty,
      typeErrors: -typePenalty,
      outliers: -outlierPenalty,
      duplicates: -dupePenalty,
      cleanNames: nameBonus,
    },
  };
}

// CSV export
export function toCSV(data: Row[]): string {
  if (!data.length) return '';
  const cols = Object.keys(data[0]);
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...data.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
}
