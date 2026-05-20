// 15-Year Analyst Insight Engine — pure detection + narration
// Imports formatters from src/lib/formatters.ts (never re-implements)
import { formatNum, formatPct } from '@/lib/formatters';

export type DataRow = Record<string, unknown>;
export interface ColumnMeta {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
}

export type FindingType = 'trend' | 'anomaly' | 'correlation' | 'ranking' | 'distribution';

export interface TrendFinding {
  type: 'trend';
  col: string;
  pctChange: number;
  direction: 'up' | 'down';
  firstVal: number;
  lastVal: number;
  acceleration: boolean;
  slope: number;
  n: number;
}
export interface AnomalyFinding {
  type: 'anomaly';
  col: string;
  rowIndex: number;
  value: number;
  mean: number;
  stdDev: number;
  severity: 'extreme' | 'moderate';
  multiplier: number;
}
export interface CorrelationFinding {
  type: 'correlation';
  col1: string;
  col2: string;
  r: number;
  direction: 'positive' | 'negative';
  strength: 'strong' | 'moderate';
  sampleRows: number;
}
export interface RankingFinding {
  type: 'ranking';
  dimCol: string;
  metricCol: string;
  top3Pct: number;
  topItem: { name: string; value: number; pct: number };
  top5: Array<{ name: string; value: number; pct: number }>;
  totalItems: number;
}
export interface DistributionFinding {
  type: 'distribution';
  col: string;
  mean: number;
  median: number;
  stdDev: number;
  Q1: number;
  Q3: number;
  skewness: number;
  skewDirection: 'right' | 'left' | 'normal';
  outlierCount: number;
}

export type Finding =
  | TrendFinding | AnomalyFinding | CorrelationFinding
  | RankingFinding | DistributionFinding;

export interface InsightResult {
  title: string;
  type: FindingType;
  confidence: number;
  whatHappening: string;
  whyMatters: string;
  whatToDo: [string, string, string];
  impact: 'high' | 'medium' | 'low';
  effort: 'easy' | 'medium' | 'complex';
}

// ───────────────────────── helpers ─────────────────────────
const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return isNaN(n) ? NaN : n;
};
const numericValues = (data: DataRow[], col: string): number[] =>
  data.map((r) => num(r[col])).filter((v) => !isNaN(v));

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
function stdDev(xs: number[], m = mean(xs)): number {
  if (xs.length < 2) return 0;
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length);
}
function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (pos - lo) * (sorted[hi] - sorted[lo]);
}

// ───────────────────────── detectors ─────────────────────────
export function detectTrends(data: DataRow[], cols: ColumnMeta[]): TrendFinding[] {
  const out: TrendFinding[] = [];
  for (const c of cols.filter((c) => c.type === 'number')) {
    const xs = numericValues(data, c.name);
    if (xs.length < 4) continue;
    const firstVal = xs[0];
    const lastVal = xs[xs.length - 1];
    if (!firstVal) continue;
    const pctChange = ((lastVal - firstVal) / Math.abs(firstVal)) * 100;
    if (!isFinite(pctChange) || Math.abs(pctChange) <= 5) continue;
    const half = Math.floor(xs.length / 2);
    const firstHalf = xs.slice(0, half);
    const secondHalf = xs.slice(half);
    const fhSlope = (firstHalf[firstHalf.length - 1] - firstHalf[0]) / Math.max(1, firstHalf.length - 1);
    const shSlope = (secondHalf[secondHalf.length - 1] - secondHalf[0]) / Math.max(1, secondHalf.length - 1);
    out.push({
      type: 'trend',
      col: c.name,
      pctChange,
      direction: pctChange >= 0 ? 'up' : 'down',
      firstVal, lastVal,
      acceleration: Math.abs(shSlope) > Math.abs(fhSlope),
      slope: (lastVal - firstVal) / xs.length,
      n: xs.length,
    });
  }
  return out.sort((a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange));
}

export function detectAnomalies(data: DataRow[], cols: ColumnMeta[]): AnomalyFinding[] {
  const out: AnomalyFinding[] = [];
  for (const c of cols.filter((c) => c.type === 'number')) {
    const xs = numericValues(data, c.name);
    if (xs.length < 5) continue;
    const m = mean(xs);
    const sd = stdDev(xs, m);
    if (!sd) continue;
    data.forEach((row, i) => {
      const v = num(row[c.name]);
      if (isNaN(v)) return;
      const dev = Math.abs(v - m);
      if (dev > 3 * sd) {
        out.push({ type: 'anomaly', col: c.name, rowIndex: i, value: v, mean: m, stdDev: sd, severity: 'extreme', multiplier: m ? v / m : 0 });
      } else if (dev > 2 * sd) {
        out.push({ type: 'anomaly', col: c.name, rowIndex: i, value: v, mean: m, stdDev: sd, severity: 'moderate', multiplier: m ? v / m : 0 });
      }
    });
  }
  return out
    .sort((a, b) => Math.abs(b.value - b.mean) / (b.stdDev || 1) - Math.abs(a.value - a.mean) / (a.stdDev || 1))
    .slice(0, 20);
}

export function detectCorrelations(data: DataRow[], cols: ColumnMeta[]): CorrelationFinding[] {
  const out: CorrelationFinding[] = [];
  const nums = cols.filter((c) => c.type === 'number');
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      const c1 = nums[i].name;
      const c2 = nums[j].name;
      const pairs: Array<[number, number]> = [];
      for (const r of data) {
        const x = num(r[c1]); const y = num(r[c2]);
        if (!isNaN(x) && !isNaN(y)) pairs.push([x, y]);
      }
      if (pairs.length < 5) continue;
      const xs = pairs.map((p) => p[0]);
      const ys = pairs.map((p) => p[1]);
      const mx = mean(xs); const my = mean(ys);
      const sx = stdDev(xs, mx); const sy = stdDev(ys, my);
      if (!sx || !sy) continue;
      let cov = 0;
      for (const [x, y] of pairs) cov += (x - mx) * (y - my);
      const r = cov / (pairs.length * sx * sy);
      if (Math.abs(r) >= 0.6) {
        out.push({
          type: 'correlation', col1: c1, col2: c2, r,
          direction: r >= 0 ? 'positive' : 'negative',
          strength: Math.abs(r) > 0.8 ? 'strong' : 'moderate',
          sampleRows: pairs.length,
        });
      }
    }
  }
  return out.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
}

export function detectRankings(data: DataRow[], cols: ColumnMeta[]): RankingFinding[] {
  const out: RankingFinding[] = [];
  const dims = cols.filter((c) => c.type === 'string');
  const metrics = cols.filter((c) => c.type === 'number');
  for (const d of dims) {
    for (const m of metrics) {
      const groups = new Map<string, number>();
      for (const row of data) {
        const k = String(row[d.name] ?? 'Unknown');
        const v = num(row[m.name]);
        if (isNaN(v)) continue;
        groups.set(k, (groups.get(k) ?? 0) + v);
      }
      if (groups.size < 4) continue;
      const sorted = [...groups.entries()].sort((a, b) => b[1] - a[1]);
      const total = sorted.reduce((s, [, v]) => s + v, 0);
      if (!total) continue;
      const top3Sum = sorted.slice(0, 3).reduce((s, [, v]) => s + v, 0);
      const top3Pct = (top3Sum / total) * 100;
      if (top3Pct <= 50) continue;
      const top5 = sorted.slice(0, 5).map(([name, value]) => ({
        name, value, pct: (value / total) * 100,
      }));
      out.push({
        type: 'ranking', dimCol: d.name, metricCol: m.name,
        top3Pct, topItem: top5[0], top5, totalItems: sorted.length,
      });
    }
  }
  return out.sort((a, b) => b.top3Pct - a.top3Pct);
}

export function detectDistributions(data: DataRow[], cols: ColumnMeta[]): DistributionFinding[] {
  const out: DistributionFinding[] = [];
  for (const c of cols.filter((c) => c.type === 'number')) {
    const xs = numericValues(data, c.name);
    if (xs.length < 8) continue;
    const sorted = [...xs].sort((a, b) => a - b);
    const m = mean(xs);
    const med = quantile(sorted, 0.5);
    const sd = stdDev(xs, m);
    if (!sd) continue;
    const Q1 = quantile(sorted, 0.25);
    const Q3 = quantile(sorted, 0.75);
    const skew = xs.reduce((s, x) => s + ((x - m) / sd) ** 3, 0) / xs.length;
    if (Math.abs(skew) <= 0.5) continue;
    const iqr = Q3 - Q1;
    const lo = Q1 - 1.5 * iqr;
    const hi = Q3 + 1.5 * iqr;
    const outlierCount = xs.filter((v) => v < lo || v > hi).length;
    out.push({
      type: 'distribution', col: c.name,
      mean: m, median: med, stdDev: sd, Q1, Q3, skewness: skew,
      skewDirection: skew > 0.5 ? 'right' : skew < -0.5 ? 'left' : 'normal',
      outlierCount,
    });
  }
  return out.sort((a, b) => Math.abs(b.skewness) - Math.abs(a.skewness));
}

export function detectAll(data: DataRow[], cols: ColumnMeta[]): Finding[] {
  return [
    ...detectTrends(data, cols),
    ...detectRankings(data, cols),
    ...detectCorrelations(data, cols),
    ...detectDistributions(data, cols),
    ...detectAnomalies(data, cols),
  ];
}

// ─────────────────── narration (deterministic + retry) ───────────────────
const FORBIDDEN = [
  'statistically significant', 'p-value', 'regression', 'null hypothesis',
  'heteroscedasticity', 'multicollinearity', 'endogeneity', 'coefficient',
  'variance explained', 'covariance', 'stochastic', 'parametric', 'distribution fit',
];
function stripForbidden(s: string): string {
  let out = s;
  for (const w of FORBIDDEN) {
    out = out.replace(new RegExp(w, 'gi'), 'pattern');
  }
  return out;
}

export function validateInsightJSON(raw: unknown): InsightResult {
  if (!raw || typeof raw !== 'object') throw new Error('not-object');
  const r = raw as Record<string, unknown>;
  const types: FindingType[] = ['trend', 'anomaly', 'correlation', 'ranking', 'distribution'];
  const impacts = ['high', 'medium', 'low'];
  const efforts = ['easy', 'medium', 'complex'];
  if (typeof r.title !== 'string' || typeof r.whatHappening !== 'string' ||
      typeof r.whyMatters !== 'string' || typeof r.confidence !== 'number' ||
      !Array.isArray(r.whatToDo) || r.whatToDo.length !== 3 ||
      !types.includes(r.type as FindingType) ||
      !impacts.includes(String(r.impact)) ||
      !efforts.includes(String(r.effort))) {
    throw new Error('schema');
  }
  return {
    title: stripForbidden(String(r.title)).split(' ').slice(0, 10).join(' '),
    type: r.type as FindingType,
    confidence: Math.max(0, Math.min(100, Math.round(Number(r.confidence)))),
    whatHappening: stripForbidden(String(r.whatHappening)),
    whyMatters: stripForbidden(String(r.whyMatters)),
    whatToDo: [
      stripForbidden(String(r.whatToDo[0])),
      stripForbidden(String(r.whatToDo[1])),
      stripForbidden(String(r.whatToDo[2])),
    ],
    impact: r.impact as 'high' | 'medium' | 'low',
    effort: r.effort as 'easy' | 'medium' | 'complex',
  };
}

// Build deterministic, McKinsey-grade narration without external API.
// Production-ready: zero dependency on credits/keys, fully deterministic.
export function narrateFinding(f: Finding): InsightResult {
  switch (f.type) {
    case 'trend': {
      const dir = f.direction === 'up' ? 'climbed' : 'declined';
      const arrow = f.direction === 'up' ? 'upward' : 'downward';
      const acc = f.acceleration ? ' and the move is accelerating in the most recent half of the series' : '';
      return {
        title: `${f.col} ${f.direction === 'up' ? 'Rising' : 'Falling'} ${formatPct(Math.abs(f.pctChange))}`,
        type: 'trend',
        confidence: Math.min(95, 70 + Math.min(20, Math.abs(f.pctChange) / 5)),
        whatHappening: `In plain terms, ${f.col} ${dir} from ${formatNum(f.firstVal)} to ${formatNum(f.lastVal)} across ${f.n} observations — a ${formatPct(Math.abs(f.pctChange))} ${arrow} shift${acc}.`,
        whyMatters: `This means for your business that planning assumptions built on the older ${f.col} baseline are now off by roughly ${formatPct(Math.abs(f.pctChange))}. The practical impact is forecasts, targets, and budgets tied to this metric need recalibration before the next planning cycle.`,
        whatToDo: [
          `Rebase the ${f.col} target on the latest ${formatNum(f.lastVal)} reading, not the historical average`,
          `Action to take: brief the owner of ${f.col} this week and confirm whether the ${arrow} move is intentional or a leak`,
          `Add a weekly tripwire alert on ${f.col} that fires if the trend continues another ${formatPct(Math.abs(f.pctChange) / 2)}`,
        ],
        impact: Math.abs(f.pctChange) > 25 ? 'high' : Math.abs(f.pctChange) > 10 ? 'medium' : 'low',
        effort: 'easy',
      };
    }
    case 'anomaly': {
      const x = Math.abs(f.value - f.mean) / (f.stdDev || 1);
      return {
        title: `Outlier in ${f.col} (${f.severity})`,
        type: 'anomaly',
        confidence: f.severity === 'extreme' ? 92 : 78,
        whatHappening: `In plain terms, row ${f.rowIndex + 1} shows ${f.col} = ${formatNum(f.value)} while the typical value sits at ${formatNum(f.mean)}. That is ${x.toFixed(1)}× the normal swing, which marks it as ${f.severity}.`,
        whyMatters: `This means for your business that a single observation is pulling averages, dashboards, and AI models off-true. Left unchecked, downstream KPIs and forecasts inherit the distortion.`,
        whatToDo: [
          `Open row ${f.rowIndex + 1} and confirm the ${f.col} entry is real, not a data-entry or unit error`,
          `Action to take: quarantine the row from rolling averages until the source is verified`,
          `If genuine, document the cause so the next anomaly is recognised in under 24 hours`,
        ],
        impact: f.severity === 'extreme' ? 'high' : 'medium',
        effort: 'easy',
      };
    }
    case 'correlation': {
      const verb = f.direction === 'positive' ? 'move together' : 'move in opposite directions';
      return {
        title: `${f.col1} and ${f.col2} are linked`,
        type: 'correlation',
        confidence: Math.round(70 + Math.abs(f.r) * 25),
        whatHappening: `In plain terms, ${f.col1} and ${f.col2} ${verb} with a ${f.strength} link (r = ${f.r.toFixed(2)} across ${f.sampleRows} rows). When one shifts, the other reliably follows.`,
        whyMatters: `This means for your business that ${f.col1} can be used as an early indicator for ${f.col2}, opening the door to faster decisions and better forecasts. The practical impact is fewer surprises at month-end.`,
        whatToDo: [
          `Use ${f.col1} as a leading signal in the weekly ${f.col2} review`,
          `Action to take: test whether changing ${f.col1} deliberately moves ${f.col2} in the expected direction`,
          `Add both metrics to the same dashboard tile so the link is visible to operators`,
        ],
        impact: Math.abs(f.r) > 0.8 ? 'high' : 'medium',
        effort: 'medium',
      };
    }
    case 'ranking': {
      return {
        title: `${f.topItem.name} drives ${formatPct(f.topItem.pct)} of ${f.metricCol}`,
        type: 'ranking',
        confidence: 90,
        whatHappening: `In plain terms, the top 3 ${f.dimCol} values produce ${formatPct(f.top3Pct)} of total ${f.metricCol}, with ${f.topItem.name} alone at ${formatNum(f.topItem.value)} (${formatPct(f.topItem.pct)}). The remaining ${f.totalItems - 3} ${f.dimCol} values share the rest.`,
        whyMatters: `This means for your business that performance is highly concentrated — a small change in one ${f.dimCol} entry moves the whole number. The practical impact is risk on the upside (one win is huge) and on the downside (one loss is painful).`,
        whatToDo: [
          `Assign a named owner to ${f.topItem.name} and protect that account first`,
          `Action to take: run a churn-risk check on the top 3 ${f.dimCol} values this quarter`,
          `Diversify by promoting 2-3 mid-tier ${f.dimCol} entries to reduce concentration`,
        ],
        impact: f.top3Pct > 70 ? 'high' : 'medium',
        effort: 'medium',
      };
    }
    case 'distribution': {
      const skewWord = f.skewDirection === 'right' ? 'right-skewed (a long tail of high values)' :
                       f.skewDirection === 'left' ? 'left-skewed (a long tail of low values)' : 'roughly symmetric';
      return {
        title: `${f.col} distribution is ${f.skewDirection}-skewed`,
        type: 'distribution',
        confidence: 82,
        whatHappening: `In plain terms, ${f.col} is ${skewWord}. The average is ${formatNum(f.mean)} but the middle value is ${formatNum(f.median)}, with ${f.outlierCount} outlier rows beyond the typical range.`,
        whyMatters: `This means for your business that reporting the average for ${f.col} overstates or understates reality. The practical impact is that targets and bonuses tied to the average will feel unfair on one side of the curve.`,
        whatToDo: [
          `Switch reporting on ${f.col} from average to median for fairer comparisons`,
          `Action to take: segment customers above and below the median and review the two groups separately`,
          `Investigate the ${f.outlierCount} outlier rows to decide if they are a separate segment or noise`,
        ],
        impact: 'medium',
        effort: 'easy',
      };
    }
  }
}

// Optional remote enhancement — best-effort, never blocks
export async function enhanceWithGroq(
  f: Finding,
  ctx: { datasetName: string; rowCount: number; colNames: string[] },
  endpoint?: string,
): Promise<InsightResult> {
  if (!endpoint) return narrateFinding(f);
  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ finding: f, context: ctx }),
    });
    if (!resp.ok) throw new Error(`status_${resp.status}`);
    const raw = await resp.json();
    return validateInsightJSON(raw);
  } catch {
    return narrateFinding(f);
  }
}

// ─────────────────── Groq messages builder + cleaner ───────────────────
// Builds the chat-completion `messages` array for Groq/LLM enhancement.
// System prompt enumerates ALL forbidden jargon and demands plain English.
export interface GroqMessage { role: 'system' | 'user'; content: string }

export function buildGroqMessages(
  finding: Finding,
  ctx: { datasetName: string; rowCount: number; colNames: string[] },
): GroqMessage[] {
  const forbiddenList = FORBIDDEN.join(', ');
  const system = [
    'You are a McKinsey-grade senior data analyst writing for a non-technical business owner.',
    'Translate the supplied statistical finding into plain, decisive English.',
    'STRICT OUTPUT: return ONLY a single JSON object — no preamble, no markdown fences, no commentary.',
    'Schema (all fields REQUIRED):',
    '{',
    '  "title": string (max 10 words, business-flavoured, no jargon),',
    '  "type": "trend"|"anomaly"|"correlation"|"ranking"|"distribution",',
    '  "confidence": integer 0-100,',
    '  "whatHappening": string (2-3 sentences, must START with "In plain terms,"),',
    '  "whyMatters": string (2-3 sentences, must INCLUDE the phrase "This means for your business"),',
    '  "whatToDo": [string, string, string]  // exactly 3 numbered actions, each starts with an imperative verb,',
    '  "impact": "high"|"medium"|"low",',
    '  "effort": "easy"|"medium"|"complex"',
    '}',
    `FORBIDDEN WORDS (never use any of these, not even in passing): ${forbiddenList}.`,
    'Forbidden style: academic hedging ("it could be argued"), passive voice, bullet lists inside string fields, emoji, percent signs without numbers, references to formulae.',
    'Required style: short sentences, concrete numbers, named columns from the dataset, action-oriented verbs, present tense.',
    `Dataset context: name="${ctx.datasetName}", rows=${ctx.rowCount}, columns=[${ctx.colNames.slice(0, 25).join(', ')}].`,
  ].join('\n');
  const user = JSON.stringify(finding);
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

// Parses raw LLM text (may have stray markdown), validates schema,
// strips every forbidden word from every string field. Throws on bad schema.
export function validateAndCleanInsight(raw: string): InsightResult {
  if (typeof raw !== 'string' || !raw.trim()) throw new Error('empty-response');
  // Strip markdown code fences and any prose before/after the JSON.
  let txt = raw.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');
  const first = txt.indexOf('{');
  const last = txt.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) throw new Error('no-json-object');
  txt = txt.slice(first, last + 1);
  let parsed: unknown;
  try { parsed = JSON.parse(txt); } catch { throw new Error('json-parse'); }
  // validateInsightJSON already enforces schema + strips forbidden words via stripForbidden.
  return validateInsightJSON(parsed);
}

