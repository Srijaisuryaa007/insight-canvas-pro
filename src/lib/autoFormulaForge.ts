// Auto Formula Forge — analyzes a dataset and auto-generates DAX, SQL, and Excel
// formulas with computed results. No user input required.

export type ForgeLang = 'dax' | 'sql' | 'excel';
export type ForgeComplexity = 'Basic' | 'Intermediate' | 'Advanced' | 'Expert';

export interface ForgeFormula {
  id: string;
  lang: ForgeLang;
  group: string;
  name: string;
  description?: string;
  formula: string;
  result: string;
  resultRaw?: number | string;
  columns: string[];
  complexity: ForgeComplexity;
  useCase: string;
  icon: string;
  color: string;
  badge?: string | null;
}

export interface ForgeResult {
  dax: ForgeFormula[];
  sql: ForgeFormula[];
  excel: ForgeFormula[];
  meta: {
    table: string;
    rows: number;
    cols: string[];
    numCols: string[];
    textCols: string[];
    dateCols: string[];
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────
const fmt = (s: string) =>
  String(s).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

const formatNum = (v: number): string => {
  if (!isFinite(v)) return '—';
  if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(2) + 'B';
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(2) + 'M';
  if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(2) + 'K';
  if (Number.isInteger(v)) return v.toLocaleString();
  return v.toFixed(2);
};

const calcMedian = (vals: number[]): number => {
  if (!vals.length) return 0;
  const sorted = [...vals].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const calcPercentile = (vals: number[], p: number): number => {
  if (!vals.length) return 0;
  const sorted = [...vals].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
};

const calcStdDev = (vals: number[]): number => {
  if (!vals.length) return 0;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
};

const calcCorrelation = (data: Record<string, unknown>[], c1: string, c2: string): number => {
  const pairs = data
    .map(r => [parseFloat(String(r[c1])), parseFloat(String(r[c2]))])
    .filter(([a, b]) => !isNaN(a) && !isNaN(b));
  if (pairs.length < 2) return 0;
  const n = pairs.length;
  const mx = pairs.reduce((s, p) => s + p[0], 0) / n;
  const my = pairs.reduce((s, p) => s + p[1], 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (const [x, y] of pairs) {
    num += (x - mx) * (y - my);
    dx += (x - mx) ** 2;
    dy += (y - my) ** 2;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? 0 : num / den;
};

const calcLinearRegression = (pts: { x: number; y: number }[]) => {
  const n = pts.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };
  const mx = pts.reduce((s, p) => s + p.x, 0) / n;
  const my = pts.reduce((s, p) => s + p.y, 0) / n;
  let num = 0, den = 0, ssTot = 0;
  for (const p of pts) {
    num += (p.x - mx) * (p.y - my);
    den += (p.x - mx) ** 2;
    ssTot += (p.y - my) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = my - slope * mx;
  let ssRes = 0;
  for (const p of pts) ssRes += (p.y - (slope * p.x + intercept)) ** 2;
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  return { slope, intercept, r2 };
};

const isDateCol = (data: Record<string, unknown>[], col: string): boolean => {
  const sample = data.slice(0, 30).map(r => r[col]).filter(v => v != null && v !== '');
  if (!sample.length) return false;
  const hits = sample.filter(v => {
    const s = String(v);
    if (s.length < 6) return false;
    const t = Date.parse(s);
    return !isNaN(t) && /\d{4}|\/|-/.test(s);
  });
  return hits.length / sample.length > 0.7;
};

const getMostCommon = (vals: unknown[]): string => {
  const map = new Map<string, number>();
  vals.forEach(v => map.set(String(v), (map.get(String(v)) || 0) + 1));
  let top = '', topN = 0;
  map.forEach((n, k) => { if (n > topN) { topN = n; top = k; } });
  return top;
};

const getTopN = (vals: unknown[], n: number): string[] => {
  const map = new Map<string, number>();
  vals.forEach(v => map.set(String(v), (map.get(String(v)) || 0) + 1));
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(e => e[0]);
};

interface ColStats {
  sum: number; avg: number; max: number; min: number; count: number;
  distinct: number; stddev: number; median: number; q1: number; q3: number;
  variance: number; nullCount: number; positiveCount: number; negativeCount: number;
}
interface TextStats {
  distinctCount: number; mostCommon: string; nullCount: number; topValues: string[];
}

// ── Main entry ───────────────────────────────────────────────────────────
export function generateAllFormulas(
  data: Record<string, unknown>[],
  tableName: string = 'data'
): ForgeResult {
  if (!data || data.length === 0) {
    return { dax: [], sql: [], excel: [], meta: { table: tableName, rows: 0, cols: [], numCols: [], textCols: [], dateCols: [] } };
  }

  const tbl = tableName.replace(/[^A-Za-z0-9_]/g, '_');
  const cols = Object.keys(data[0]);

  const numCols = cols.filter(col => {
    const sample = data.slice(0, 30).map(r => parseFloat(String(r[col]))).filter(v => !isNaN(v));
    return sample.length / Math.min(30, data.length) > 0.6;
  });
  const dateCols = cols.filter(col => isDateCol(data, col));
  const textCols = cols.filter(col => !numCols.includes(col) && !dateCols.includes(col));

  const numStats: Record<string, ColStats> = {};
  numCols.forEach(col => {
    const vals = data.map(r => parseFloat(String(r[col]))).filter(v => !isNaN(v));
    const sum = vals.reduce((a, b) => a + b, 0);
    const avg = vals.length ? sum / vals.length : 0;
    const variance = vals.length ? vals.reduce((a, b) => a + (b - avg) ** 2, 0) / vals.length : 0;
    numStats[col] = {
      sum, avg,
      max: vals.length ? Math.max(...vals) : 0,
      min: vals.length ? Math.min(...vals) : 0,
      count: vals.length,
      distinct: new Set(vals).size,
      stddev: Math.sqrt(variance),
      median: calcMedian(vals),
      q1: calcPercentile(vals, 0.25),
      q3: calcPercentile(vals, 0.75),
      variance,
      nullCount: data.length - vals.length,
      positiveCount: vals.filter(v => v > 0).length,
      negativeCount: vals.filter(v => v < 0).length,
    };
  });

  const textStats: Record<string, TextStats> = {};
  textCols.forEach(col => {
    const vals = data.map(r => r[col]).filter(v => v != null && v !== '');
    textStats[col] = {
      distinctCount: new Set(vals.map(v => String(v))).size,
      mostCommon: getMostCommon(vals),
      nullCount: data.length - vals.length,
      topValues: getTopN(vals, 5),
    };
  });

  return {
    dax: buildDAX(data, cols, numCols, textCols, dateCols, numStats, textStats, tbl),
    sql: buildSQL(data, cols, numCols, textCols, dateCols, numStats, textStats),
    excel: buildExcel(data, cols, numCols, textCols, numStats, textStats),
    meta: { table: tbl, rows: data.length, cols, numCols, textCols, dateCols },
  };
}

// ── DAX generator ────────────────────────────────────────────────────────
function buildDAX(
  data: Record<string, unknown>[],
  cols: string[],
  numCols: string[],
  textCols: string[],
  dateCols: string[],
  stats: Record<string, ColStats>,
  textStats: Record<string, TextStats>,
  tbl: string,
): ForgeFormula[] {
  const out: ForgeFormula[] = [];

  // Group 1: Basic Aggregations (per numeric col × 6)
  numCols.forEach(col => {
    const s = stats[col]; const c = fmt(col);
    out.push({ id: `dax_sum_${col}`, lang: 'dax', group: 'Basic Aggregations', name: `Total ${c}`, description: `Sum of all ${c} values`, formula: `Total ${c} =\nSUM(${tbl}[${col}])`, result: formatNum(s.sum), resultRaw: s.sum, columns: [col], complexity: 'Basic', useCase: 'KPI', icon: '∑', color: '#3B82F6' });
    out.push({ id: `dax_avg_${col}`, lang: 'dax', group: 'Basic Aggregations', name: `Average ${c}`, description: `Mean value of ${c}`, formula: `Avg ${c} =\nAVERAGEX(\n  ${tbl},\n  ${tbl}[${col}]\n)`, result: formatNum(s.avg), resultRaw: s.avg, columns: [col], complexity: 'Basic', useCase: 'KPI', icon: '~', color: '#10B981' });
    out.push({ id: `dax_max_${col}`, lang: 'dax', group: 'Basic Aggregations', name: `Max ${c}`, formula: `Max ${c} =\nMAX(${tbl}[${col}])`, result: formatNum(s.max), resultRaw: s.max, columns: [col], complexity: 'Basic', useCase: 'KPI', icon: '↑', color: '#F59E0B' });
    out.push({ id: `dax_min_${col}`, lang: 'dax', group: 'Basic Aggregations', name: `Min ${c}`, formula: `Min ${c} =\nMIN(${tbl}[${col}])`, result: formatNum(s.min), resultRaw: s.min, columns: [col], complexity: 'Basic', useCase: 'KPI', icon: '↓', color: '#EF4444' });
    out.push({ id: `dax_median_${col}`, lang: 'dax', group: 'Basic Aggregations', name: `Median ${c}`, formula: `Median ${c} =\nMEDIANX(\n  ${tbl},\n  ${tbl}[${col}]\n)`, result: formatNum(s.median), resultRaw: s.median, columns: [col], complexity: 'Intermediate', useCase: 'Statistical', icon: '⊕', color: '#8B5CF6' });
    out.push({ id: `dax_count_${col}`, lang: 'dax', group: 'Basic Aggregations', name: `Count ${c}`, formula: `Count ${c} =\nCOUNTA(${tbl}[${col}])`, result: formatNum(s.count), resultRaw: s.count, columns: [col], complexity: 'Basic', useCase: 'KPI', icon: '#', color: '#06B6D4' });
  });

  // Group 2: Statistical
  numCols.forEach(col => {
    const s = stats[col]; const c = fmt(col); const iqr = s.q3 - s.q1;
    out.push({ id: `dax_stddev_${col}`, lang: 'dax', group: 'Statistical Analysis', name: `${c} Std Deviation`, formula: `${c} StdDev =\nSTDEVX.P(\n  ${tbl},\n  ${tbl}[${col}]\n)`, result: formatNum(s.stddev), resultRaw: s.stddev, columns: [col], complexity: 'Intermediate', useCase: 'Statistical', icon: 'σ', color: '#8B5CF6' });
    out.push({ id: `dax_var_${col}`, lang: 'dax', group: 'Statistical Analysis', name: `${c} Variance`, formula: `${c} Variance =\nVARX.P(\n  ${tbl},\n  ${tbl}[${col}]\n)`, result: formatNum(s.variance), columns: [col], complexity: 'Intermediate', useCase: 'Statistical', icon: 'σ²', color: '#8B5CF6' });
    if (s.avg !== 0) {
      out.push({ id: `dax_cv_${col}`, lang: 'dax', group: 'Statistical Analysis', name: `${c} Coefficient of Variation`, formula: `${c} CV% =\nDIVIDE(\n  STDEVX.P(${tbl}, ${tbl}[${col}]),\n  AVERAGE(${tbl}[${col}]),\n  0\n) * 100`, result: formatNum((s.stddev / s.avg) * 100) + '%', columns: [col], complexity: 'Advanced', useCase: 'Statistical', icon: 'CV', color: '#8B5CF6' });
    }
    out.push({ id: `dax_iqr_${col}`, lang: 'dax', group: 'Statistical Analysis', name: `${c} IQR Range`, formula: `${c} IQR =\nPERCENTILE.INC(${tbl}[${col}], 0.75) -\nPERCENTILE.INC(${tbl}[${col}], 0.25)`, result: formatNum(iqr), columns: [col], complexity: 'Advanced', useCase: 'Statistical', icon: '⊞', color: '#EC4899' });

    const upper = s.q3 + 1.5 * iqr; const lower = s.q1 - 1.5 * iqr;
    const outliers = data.filter(r => { const v = parseFloat(String(r[col])); return !isNaN(v) && (v > upper || v < lower); }).length;
    out.push({ id: `dax_outlier_${col}`, lang: 'dax', group: 'Statistical Analysis', name: `${c} Outlier Count`, formula: `${c} Outliers =\nCALCULATE(\n  COUNTROWS(${tbl}),\n  FILTER(\n    ${tbl},\n    ${tbl}[${col}] > ${upper.toFixed(2)} ||\n    ${tbl}[${col}] < ${lower.toFixed(2)}\n  )\n)`, result: `${outliers} outliers`, resultRaw: outliers, columns: [col], complexity: 'Advanced', useCase: 'Data Quality', icon: '◎', color: '#EF4444', badge: outliers > 0 ? `${outliers} found` : 'None' });

    [10, 25, 50, 75, 90, 95].forEach(p => {
      const vals = data.map(r => parseFloat(String(r[col]))).filter(v => !isNaN(v));
      out.push({ id: `dax_p${p}_${col}`, lang: 'dax', group: 'Statistical Analysis', name: `${c} P${p} Percentile`, formula: `${c} P${p} =\nPERCENTILE.INC(\n  ${tbl}[${col}], ${p / 100}\n)`, result: formatNum(calcPercentile(vals, p / 100)), columns: [col], complexity: p === 50 ? 'Basic' : 'Intermediate', useCase: 'Statistical', icon: `P${p}`, color: '#8B5CF6' });
    });
  });

  // Group 3: Rankings (text × num)
  textCols.forEach(textCol => {
    numCols.forEach(numCol => {
      const tc = fmt(textCol); const nc = fmt(numCol);
      out.push({ id: `dax_rank_${textCol}_${numCol}`, lang: 'dax', group: 'Rankings', name: `${tc} Rank by ${nc}`, formula: `${tc} Rank =\nRANKX(\n  ALL(${tbl}[${textCol}]),\n  CALCULATE(SUM(${tbl}[${numCol}])),\n  ,\n  DESC,\n  DENSE\n)`, result: 'Row-level ranking', columns: [textCol, numCol], complexity: 'Intermediate', useCase: 'Ranking', icon: '★', color: '#F59E0B' });

      // Compute top-10 sum
      const grouped = new Map<string, number>();
      data.forEach(r => {
        const k = String(r[textCol] ?? '');
        const v = parseFloat(String(r[numCol]));
        if (!isNaN(v)) grouped.set(k, (grouped.get(k) || 0) + v);
      });
      const top10Sum = [...grouped.values()].sort((a, b) => b - a).slice(0, 10).reduce((a, b) => a + b, 0);
      out.push({ id: `dax_top10_${textCol}_${numCol}`, lang: 'dax', group: 'Rankings', name: `Top 10 ${tc} by ${nc}`, formula: `Top 10 ${nc} =\nCALCULATE(\n  SUM(${tbl}[${numCol}]),\n  TOPN(\n    10,\n    ALL(${tbl}[${textCol}]),\n    CALCULATE(SUM(${tbl}[${numCol}])),\n    DESC\n  )\n)`, result: formatNum(top10Sum), resultRaw: top10Sum, columns: [textCol, numCol], complexity: 'Advanced', useCase: 'Ranking', icon: '⭐', color: '#F59E0B' });

      out.push({ id: `dax_share_${textCol}_${numCol}`, lang: 'dax', group: 'Rankings', name: `${tc} % of Total ${nc}`, formula: `${tc} Share% =\nDIVIDE(\n  CALCULATE(SUM(${tbl}[${numCol}])),\n  CALCULATE(\n    SUM(${tbl}[${numCol}]),\n    ALL(${tbl}[${textCol}])\n  ),\n  0\n) * 100`, result: 'Row-level %', columns: [textCol, numCol], complexity: 'Advanced', useCase: 'Proportion', icon: '%', color: '#10B981' });
    });
  });

  // Group 4: Numeric Relationships (pairs)
  for (let i = 0; i < numCols.length; i++) {
    for (let j = i + 1; j < numCols.length; j++) {
      const c1 = numCols[i], c2 = numCols[j];
      const n1 = fmt(c1), n2 = fmt(c2);
      const s1 = stats[c1], s2 = stats[c2];

      if (s2.sum !== 0) {
        out.push({ id: `dax_ratio_${c1}_${c2}`, lang: 'dax', group: 'Numeric Relationships', name: `${n1} to ${n2} Ratio`, formula: `${n1}/${n2} Ratio =\nDIVIDE(\n  SUM(${tbl}[${c1}]),\n  SUM(${tbl}[${c2}]),\n  0\n)`, result: formatNum(s1.sum / s2.sum), columns: [c1, c2], complexity: 'Intermediate', useCase: 'Ratio', icon: '÷', color: '#06B6D4' });
      }
      out.push({ id: `dax_diff_${c1}_${c2}`, lang: 'dax', group: 'Numeric Relationships', name: `${n1} vs ${n2} Gap`, formula: `${n1} vs ${n2} =\nSUM(${tbl}[${c1}]) - SUM(${tbl}[${c2}])`, result: formatNum(s1.sum - s2.sum), columns: [c1, c2], complexity: 'Basic', useCase: 'Comparison', icon: '△', color: '#3B82F6' });

      const corr = calcCorrelation(data, c1, c2);
      const strength = Math.abs(corr) > 0.7 ? 'Strong' : Math.abs(corr) > 0.4 ? 'Moderate' : 'Weak';
      out.push({ id: `dax_corr_${c1}_${c2}`, lang: 'dax', group: 'Numeric Relationships', name: `${n1} × ${n2} Correlation`, formula: `/* Pearson r = ${corr.toFixed(3)} */\n${n1}×${n2} Corr =\nDIVIDE(\n  SUMX(${tbl},\n    (${tbl}[${c1}] - AVERAGE(${tbl}[${c1}])) *\n    (${tbl}[${c2}] - AVERAGE(${tbl}[${c2}]))\n  ),\n  SQRT(\n    SUMX(${tbl}, (${tbl}[${c1}] - AVERAGE(${tbl}[${c1}]))^2) *\n    SUMX(${tbl}, (${tbl}[${c2}] - AVERAGE(${tbl}[${c2}]))^2)\n  )\n)`, result: `r = ${corr.toFixed(3)} (${strength} ${corr >= 0 ? 'positive' : 'negative'})`, resultRaw: corr, columns: [c1, c2], complexity: 'Expert', useCase: 'Statistical', icon: '🔗', color: '#EC4899', badge: Math.abs(corr) > 0.7 ? 'Strong correlation' : null });
    }
  }

  // Group 5: Time Intelligence
  if (dateCols.length > 0) {
    const dateCol = dateCols[0];
    numCols.forEach(numCol => {
      const nc = fmt(numCol);
      out.push({ id: `dax_ytd_${numCol}`, lang: 'dax', group: 'Time Intelligence', name: `${nc} Year-to-Date`, formula: `${nc} YTD =\nTOTALYTD(\n  SUM(${tbl}[${numCol}]),\n  ${tbl}[${dateCol}]\n)`, result: 'Context-dependent', columns: [numCol, dateCol], complexity: 'Intermediate', useCase: 'Time Intelligence', icon: '📅', color: '#10B981' });
      out.push({ id: `dax_mtd_${numCol}`, lang: 'dax', group: 'Time Intelligence', name: `${nc} Month-to-Date`, formula: `${nc} MTD =\nTOTALMTD(\n  SUM(${tbl}[${numCol}]),\n  ${tbl}[${dateCol}]\n)`, result: 'Context-dependent', columns: [numCol, dateCol], complexity: 'Intermediate', useCase: 'Time Intelligence', icon: '📅', color: '#10B981' });
      out.push({ id: `dax_yoy_${numCol}`, lang: 'dax', group: 'Time Intelligence', name: `${nc} YoY Growth %`, formula: `${nc} YoY% =\nVAR Curr = SUM(${tbl}[${numCol}])\nVAR Prev = CALCULATE(\n  SUM(${tbl}[${numCol}]),\n  SAMEPERIODLASTYEAR(${tbl}[${dateCol}])\n)\nRETURN\nDIVIDE(Curr - Prev, ABS(Prev), 0) * 100`, result: 'Context-dependent', columns: [numCol, dateCol], complexity: 'Advanced', useCase: 'Time Intelligence', icon: '📈', color: '#10B981' });
      out.push({ id: `dax_rolling_${numCol}`, lang: 'dax', group: 'Time Intelligence', name: `${nc} 3-Month Rolling Avg`, formula: `${nc} 3M Avg =\nAVERAGEX(\n  DATESINPERIOD(\n    ${tbl}[${dateCol}],\n    LASTDATE(${tbl}[${dateCol}]),\n    -3, MONTH\n  ),\n  CALCULATE(SUM(${tbl}[${numCol}]))\n)`, result: 'Context-dependent', columns: [numCol, dateCol], complexity: 'Advanced', useCase: 'Time Intelligence', icon: '🔄', color: '#06B6D4' });
      out.push({ id: `dax_running_${numCol}`, lang: 'dax', group: 'Time Intelligence', name: `${nc} Running Total`, formula: `${nc} Cumulative =\nCALCULATE(\n  SUM(${tbl}[${numCol}]),\n  FILTER(\n    ALL(${tbl}[${dateCol}]),\n    ${tbl}[${dateCol}] <= MAX(${tbl}[${dateCol}])\n  )\n)`, result: 'Context-dependent', columns: [numCol, dateCol], complexity: 'Advanced', useCase: 'Time Intelligence', icon: '∫', color: '#06B6D4' });
    });
  }

  // Group 6: Data Quality
  cols.forEach(col => {
    const nullCount = data.filter(r => r[col] == null || r[col] === '').length;
    const pct = (nullCount / data.length) * 100;
    out.push({ id: `dax_complete_${col}`, lang: 'dax', group: 'Data Quality', name: `${fmt(col)} Completeness %`, formula: `${fmt(col)} Complete% =\nDIVIDE(\n  COUNTA(${tbl}[${col}]),\n  COUNTROWS(${tbl}),\n  0\n) * 100`, result: `${(100 - pct).toFixed(1)}%`, resultRaw: 100 - pct, columns: [col], complexity: 'Basic', useCase: 'Data Quality', icon: '✓', color: nullCount === 0 ? '#10B981' : '#EF4444', badge: nullCount > 0 ? `${pct.toFixed(1)}% missing` : '100% complete' });
  });

  // Group 7: Classification (numeric quartile + H/M/L)
  numCols.forEach(col => {
    const s = stats[col]; const c = fmt(col);
    out.push({ id: `dax_quartile_${col}`, lang: 'dax', group: 'Classification', name: `${c} Quartile Label`, formula: `${c} Quartile =\nSWITCH(\n  TRUE(),\n  ${tbl}[${col}] >= ${s.q3.toFixed(2)}, "Q4 Top 25%",\n  ${tbl}[${col}] >= ${s.median.toFixed(2)}, "Q3 Upper Mid",\n  ${tbl}[${col}] >= ${s.q1.toFixed(2)}, "Q2 Lower Mid",\n  "Q1 Bottom 25%"\n)`, result: 'Row-level classification', columns: [col], complexity: 'Intermediate', useCase: 'Classification', icon: '🏷', color: '#8B5CF6' });

    const vals = data.map(r => parseFloat(String(r[col]))).filter(v => !isNaN(v));
    const p33 = calcPercentile(vals, 0.33); const p66 = calcPercentile(vals, 0.66);
    out.push({ id: `dax_hml_${col}`, lang: 'dax', group: 'Classification', name: `${c} High/Medium/Low`, formula: `${c} Band =\nIF(\n  ${tbl}[${col}] >= ${p66.toFixed(2)},\n  "High",\n  IF(\n    ${tbl}[${col}] >= ${p33.toFixed(2)},\n    "Medium",\n    "Low"\n  )\n)`, result: 'Row-level band', columns: [col], complexity: 'Basic', useCase: 'Classification', icon: '🚦', color: '#10B981' });
  });

  // Group 8: Predictive
  numCols.forEach(col => {
    const c = fmt(col);
    const pts = data.map((r, i) => ({ x: i, y: parseFloat(String(r[col])) || 0 }));
    const { slope, intercept, r2 } = calcLinearRegression(pts);
    const next = slope * data.length + intercept;
    out.push({ id: `dax_forecast_${col}`, lang: 'dax', group: 'Predictive', name: `${c} Next Period Forecast`, formula: `/* Linear regression: slope=${slope.toFixed(4)}, R²=${r2.toFixed(3)} */\n${c} Forecast =\nVAR Slope = ${slope.toFixed(6)}\nVAR Intercept = ${intercept.toFixed(4)}\nVAR NextX = COUNTROWS(${tbl}) + 1\nRETURN\nSlope * NextX + Intercept`, result: `Predicted: ${formatNum(next)} (R²=${r2.toFixed(2)})`, resultRaw: next, columns: [col], complexity: 'Expert', useCase: 'Predictive', icon: '🔮', color: '#EC4899', badge: `R² = ${r2.toFixed(2)}` });
    out.push({ id: `dax_trend_${col}`, lang: 'dax', group: 'Predictive', name: `${c} Trend Direction`, formula: `${c} Trend =\nVAR Slope = ${slope.toFixed(6)}\nRETURN\nIF(Slope > 0.01, "Upward Trend",\n  IF(Slope < -0.01, "Downward Trend", "Stable"))`, result: slope > 0.01 ? 'Upward' : slope < -0.01 ? 'Downward' : 'Stable', columns: [col], complexity: 'Advanced', useCase: 'Predictive', icon: '📉', color: '#EC4899' });
  });

  return out;
}

// ── SQL generator ────────────────────────────────────────────────────────
function buildSQL(
  data: Record<string, unknown>[],
  cols: string[],
  numCols: string[],
  textCols: string[],
  dateCols: string[],
  stats: Record<string, ColStats>,
  textStats: Record<string, TextStats>,
): ForgeFormula[] {
  const out: ForgeFormula[] = [];

  // Group 1: Exploration
  out.push({ id: 'sql_preview', lang: 'sql', group: 'Data Exploration', name: 'Preview Dataset', description: 'First 10 rows of your data', formula: `SELECT *\nFROM data\nLIMIT 10;`, result: `${data.length} total rows`, columns: cols, complexity: 'Basic', useCase: 'Exploration', icon: '👁', color: '#3B82F6' });

  if (numCols.length) {
    out.push({ id: 'sql_summary', lang: 'sql', group: 'Data Exploration', name: 'Full Statistical Summary', description: 'Stats for all numeric columns', formula: `SELECT\n${numCols.map(col => `  COUNT(${col}) AS ${col}_count,\n  ROUND(AVG(${col}), 2) AS ${col}_avg,\n  ROUND(MIN(${col}), 2) AS ${col}_min,\n  ROUND(MAX(${col}), 2) AS ${col}_max,\n  ROUND(SUM(${col}), 2) AS ${col}_sum`).join(',\n')}\nFROM data;`, result: `${numCols.length} columns analyzed`, columns: numCols, complexity: 'Basic', useCase: 'Exploration', icon: '📊', color: '#3B82F6' });
  }

  // Group 2: Group & Aggregate
  textCols.forEach(textCol => {
    numCols.forEach(numCol => {
      const tc = fmt(textCol); const nc = fmt(numCol);
      out.push({ id: `sql_group_${textCol}_${numCol}`, lang: 'sql', group: 'Group & Aggregate', name: `${nc} by ${tc}`, description: `Aggregate ${nc} grouped by ${tc}`, formula: `SELECT\n  ${textCol},\n  COUNT(*) AS record_count,\n  ROUND(SUM(${numCol}), 2) AS total_${numCol},\n  ROUND(AVG(${numCol}), 2) AS avg_${numCol},\n  ROUND(MAX(${numCol}), 2) AS max_${numCol},\n  ROUND(MIN(${numCol}), 2) AS min_${numCol}\nFROM data\nGROUP BY ${textCol}\nORDER BY total_${numCol} DESC;`, result: `${textStats[textCol].distinctCount} groups`, columns: [textCol, numCol], complexity: 'Basic', useCase: 'Aggregation', icon: '📊', color: '#3B82F6' });

      out.push({ id: `sql_top10_${textCol}_${numCol}`, lang: 'sql', group: 'Rankings', name: `Top 10 ${tc} by ${nc}`, formula: `SELECT\n  ${textCol},\n  ROUND(SUM(${numCol}), 2) AS total,\n  RANK() OVER (ORDER BY SUM(${numCol}) DESC) AS rank\nFROM data\nGROUP BY ${textCol}\nORDER BY total DESC\nLIMIT 10;`, result: `Top 10 of ${textStats[textCol].distinctCount}`, columns: [textCol, numCol], complexity: 'Intermediate', useCase: 'Ranking', icon: '🏆', color: '#F59E0B' });

      out.push({ id: `sql_bot10_${textCol}_${numCol}`, lang: 'sql', group: 'Rankings', name: `Bottom 10 ${tc} by ${nc}`, formula: `SELECT\n  ${textCol},\n  ROUND(SUM(${numCol}), 2) AS total\nFROM data\nGROUP BY ${textCol}\nORDER BY total ASC\nLIMIT 10;`, result: 'Bottom 10', columns: [textCol, numCol], complexity: 'Basic', useCase: 'Ranking', icon: '📉', color: '#EF4444' });
    });
  });

  // Group 3: Window Functions
  numCols.forEach(col => {
    const c = fmt(col);
    out.push({ id: `sql_window_${col}`, lang: 'sql', group: 'Window Functions', name: `${c} with Rankings & %`, formula: `SELECT\n  *,\n  RANK() OVER (ORDER BY ${col} DESC) AS rank_desc,\n  DENSE_RANK() OVER (ORDER BY ${col} DESC) AS dense_rank,\n  NTILE(4) OVER (ORDER BY ${col} DESC) AS quartile,\n  ROUND(${col} * 100.0 / SUM(${col}) OVER (), 3) AS pct_of_total,\n  ROUND(SUM(${col}) OVER (ORDER BY ROWID ROWS UNBOUNDED PRECEDING), 2) AS running_total,\n  ROUND(AVG(${col}) OVER (ORDER BY ROWID ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS moving_avg_3\nFROM data\nORDER BY ${col} DESC;`, result: `${data.length} rows ranked`, columns: [col], complexity: 'Advanced', useCase: 'Window Functions', icon: '▦', color: '#8B5CF6' });

    out.push({ id: `sql_lag_${col}`, lang: 'sql', group: 'Window Functions', name: `${c} Period-over-Period`, formula: `SELECT\n  ${col},\n  LAG(${col}, 1) OVER (ORDER BY ROWID) AS prev_value,\n  LEAD(${col}, 1) OVER (ORDER BY ROWID) AS next_value,\n  ${col} - LAG(${col}, 1) OVER (ORDER BY ROWID) AS change,\n  ROUND(\n    (${col} - LAG(${col}, 1) OVER (ORDER BY ROWID)) * 100.0 /\n    NULLIF(LAG(${col}, 1) OVER (ORDER BY ROWID), 0),\n  2) AS pct_change\nFROM data;`, result: `${data.length} rows`, columns: [col], complexity: 'Advanced', useCase: 'Time Series', icon: '⏱', color: '#06B6D4' });
  });

  // Group 4: Statistical SQL
  numCols.forEach(col => {
    const s = stats[col]; const c = fmt(col);
    const iqr = s.q3 - s.q1; const upper = s.q3 + 1.5 * iqr; const lower = s.q1 - 1.5 * iqr;
    out.push({ id: `sql_outliers_${col}`, lang: 'sql', group: 'Statistical Analysis', name: `${c} Outlier Detection`, description: `Flags ${c} values beyond IQR fences`, formula: `/* IQR Method: Q1=${s.q1.toFixed(2)}, Q3=${s.q3.toFixed(2)}, IQR=${iqr.toFixed(2)} */\nSELECT\n  *,\n  CASE\n    WHEN ${col} > ${upper.toFixed(4)} THEN 'High Outlier'\n    WHEN ${col} < ${lower.toFixed(4)} THEN 'Low Outlier'\n    ELSE 'Normal'\n  END AS outlier_status\nFROM data\nORDER BY ${col} DESC;`, result: `Upper: ${upper.toFixed(2)}, Lower: ${lower.toFixed(2)}`, columns: [col], complexity: 'Advanced', useCase: 'Outlier Detection', icon: '🔍', color: '#EF4444' });

    out.push({ id: `sql_zscore_${col}`, lang: 'sql', group: 'Statistical Analysis', name: `${c} Z-Score Normalization`, formula: `WITH stats AS (\n  SELECT\n    AVG(${col}) AS mean_val,\n    SQRT(AVG(${col}*${col}) - AVG(${col})*AVG(${col})) AS std_val\n  FROM data\n)\nSELECT\n  d.*,\n  ROUND((d.${col} - s.mean_val) / NULLIF(s.std_val, 0), 4) AS z_score\nFROM data d, stats s\nORDER BY ABS((d.${col} - s.mean_val) / NULLIF(s.std_val, 0)) DESC;`, result: `μ=${s.avg.toFixed(2)}, σ=${s.stddev.toFixed(2)}`, columns: [col], complexity: 'Advanced', useCase: 'Statistical', icon: 'Z', color: '#8B5CF6' });
  });

  // Group 5: Data Quality
  out.push({ id: 'sql_quality_full', lang: 'sql', group: 'Data Quality', name: 'Complete Data Quality Report', formula: `SELECT 'Total Rows' AS metric, COUNT(*) AS value FROM data\n${numCols.map(col => `UNION ALL\nSELECT 'Null: ${col}', SUM(CASE WHEN ${col} IS NULL THEN 1 ELSE 0 END) FROM data`).join('\n')};`, result: 'Full quality audit', columns: cols, complexity: 'Advanced', useCase: 'Data Quality', icon: '🛡', color: '#10B981' });

  // Group 6: Forecasting
  numCols.forEach(col => {
    const c = fmt(col);
    const pts = data.map((r, i) => ({ x: i, y: parseFloat(String(r[col])) || 0 }));
    const { slope, intercept } = calcLinearRegression(pts);
    out.push({ id: `sql_forecast_${col}`, lang: 'sql', group: 'Forecasting', name: `${c} Next 5 Predictions`, formula: `/* Linear regression on ${c}\n   Slope: ${slope.toFixed(6)}, Intercept: ${intercept.toFixed(4)} */\nWITH regression AS (\n  SELECT\n    ${slope.toFixed(6)} AS slope,\n    ${intercept.toFixed(4)} AS intercept,\n    ${data.length} AS n\n)\nSELECT\n  'Forecast +' || seq AS period,\n  ROUND(r.slope * (r.n + seq) + r.intercept, 4) AS predicted_${col}\nFROM regression r,\n  (SELECT 1 AS seq UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5);`, result: `Next: ${formatNum(slope * data.length + intercept)}`, columns: [col], complexity: 'Expert', useCase: 'Forecasting', icon: '🔮', color: '#EC4899' });
  });

  return out;
}

// ── Excel generator ──────────────────────────────────────────────────────
function buildExcel(
  data: Record<string, unknown>[],
  cols: string[],
  numCols: string[],
  textCols: string[],
  stats: Record<string, ColStats>,
  textStats: Record<string, TextStats>,
): ForgeFormula[] {
  const out: ForgeFormula[] = [];
  const colLetter = (i: number): string => {
    let s = ''; let n = i;
    do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } while (n >= 0);
    return s;
  };
  const letters: Record<string, string> = {};
  cols.forEach((c, i) => { letters[c] = colLetter(i); });
  const lastRow = data.length + 1;

  numCols.forEach((col, idx) => {
    const s = stats[col]; const c = fmt(col);
    const L = letters[col]; const range = `${L}2:${L}${lastRow}`;

    out.push({ id: `xl_sum_${col}`, lang: 'excel', group: 'Basic Aggregations', name: `Total ${c}`, formula: `=SUM(${range})`, result: formatNum(s.sum), resultRaw: s.sum, columns: [col], complexity: 'Basic', useCase: 'KPI', icon: '∑', color: '#3B82F6' });
    out.push({ id: `xl_avg_${col}`, lang: 'excel', group: 'Basic Aggregations', name: `Average ${c}`, formula: `=AVERAGE(${range})`, result: formatNum(s.avg), columns: [col], complexity: 'Basic', useCase: 'KPI', icon: '~', color: '#10B981' });
    out.push({ id: `xl_median_${col}`, lang: 'excel', group: 'Basic Aggregations', name: `Median ${c}`, formula: `=MEDIAN(${range})`, result: formatNum(s.median), columns: [col], complexity: 'Basic', useCase: 'Statistical', icon: '⊕', color: '#8B5CF6' });
    out.push({ id: `xl_max_${col}`, lang: 'excel', group: 'Basic Aggregations', name: `Max ${c}`, formula: `=MAX(${range})`, result: formatNum(s.max), columns: [col], complexity: 'Basic', useCase: 'KPI', icon: '↑', color: '#F59E0B' });
    out.push({ id: `xl_min_${col}`, lang: 'excel', group: 'Basic Aggregations', name: `Min ${c}`, formula: `=MIN(${range})`, result: formatNum(s.min), columns: [col], complexity: 'Basic', useCase: 'KPI', icon: '↓', color: '#EF4444' });

    out.push({ id: `xl_std_${col}`, lang: 'excel', group: 'Statistical', name: `${c} Std Dev`, formula: `=STDEV.P(${range})`, result: formatNum(s.stddev), columns: [col], complexity: 'Intermediate', useCase: 'Statistical', icon: 'σ', color: '#8B5CF6' });
    if (s.avg !== 0) {
      out.push({ id: `xl_cv_${col}`, lang: 'excel', group: 'Statistical', name: `${c} Coefficient of Variation`, formula: `=STDEV.P(${range})/AVERAGE(${range})`, result: formatNum((s.stddev / s.avg) * 100) + '%', columns: [col], complexity: 'Intermediate', useCase: 'Statistical', icon: 'CV', color: '#8B5CF6' });
    }

    [25, 50, 75, 90].forEach(p => {
      const vals = data.map(r => parseFloat(String(r[col]))).filter(v => !isNaN(v));
      out.push({ id: `xl_p${p}_${col}`, lang: 'excel', group: 'Statistical', name: `${c} ${p}th Percentile`, formula: `=PERCENTILE.INC(${range},${p / 100})`, result: formatNum(calcPercentile(vals, p / 100)), columns: [col], complexity: 'Intermediate', useCase: 'Statistical', icon: `P${p}`, color: '#8B5CF6' });
    });

    out.push({ id: `xl_z_${col}`, lang: 'excel', group: 'Statistical', name: `${c} Z-Score (row)`, formula: `=STANDARDIZE(${L}2,AVERAGE(${range}),STDEV.P(${range}))`, result: 'Row-level value', columns: [col], complexity: 'Intermediate', useCase: 'Statistical', icon: 'Z', color: '#8B5CF6' });

    // Conditional with text columns
    textCols.forEach(textCol => {
      const TL = letters[textCol];
      const tRange = `${TL}2:${TL}${lastRow}`;
      const tc = fmt(textCol);
      const topVal = textStats[textCol].mostCommon;
      if (!topVal) return;
      const condSum = data.filter(r => String(r[textCol]) === topVal).reduce((sum, r) => sum + (parseFloat(String(r[col])) || 0), 0);
      out.push({ id: `xl_sumif_${col}_${textCol}`, lang: 'excel', group: 'Conditional', name: `${c} where ${tc} = "${topVal}"`, formula: `=SUMIF(${tRange},"${topVal}",${range})`, result: formatNum(condSum), resultRaw: condSum, columns: [col, textCol], complexity: 'Basic', useCase: 'Conditional', icon: 'Σif', color: '#06B6D4' });
      out.push({ id: `xl_countif_${textCol}_${col}`, lang: 'excel', group: 'Conditional', name: `Count ${tc} = "${topVal}"`, formula: `=COUNTIF(${tRange},"${topVal}")`, result: formatNum(data.filter(r => String(r[textCol]) === topVal).length), columns: [textCol], complexity: 'Basic', useCase: 'Conditional', icon: '#if', color: '#06B6D4' });
    });

    // Forecasting
    out.push({ id: `xl_slope_${col}`, lang: 'excel', group: 'Forecasting', name: `${c} Trend Slope`, formula: `=SLOPE(${range},ROW(${range})-1)`, result: formatNum(calcLinearRegression(data.map((r, i) => ({ x: i, y: parseFloat(String(r[col])) || 0 }))).slope), columns: [col], complexity: 'Advanced', useCase: 'Forecasting', icon: 'm', color: '#EC4899' });

    // Dynamic Arrays
    out.push({ id: `xl_unique_${col}`, lang: 'excel', group: 'Dynamic Arrays', name: `Unique ${c} values`, formula: `=UNIQUE(${range})`, result: `${s.distinct} unique values`, columns: [col], complexity: 'Basic', useCase: 'Exploration', icon: '⚡', color: '#3B82F6', badge: 'Excel 365' });
  });

  // Cross-column
  for (let i = 0; i < numCols.length - 1; i++) {
    for (let j = i + 1; j < numCols.length; j++) {
      const c1 = numCols[i], c2 = numCols[j];
      const L1 = letters[c1], L2 = letters[c2];
      const r1 = `${L1}2:${L1}${lastRow}`, r2 = `${L2}2:${L2}${lastRow}`;
      const corr = calcCorrelation(data, c1, c2);
      out.push({ id: `xl_corr_${c1}_${c2}`, lang: 'excel', group: 'Relationships', name: `${fmt(c1)} × ${fmt(c2)} Correlation`, formula: `=CORREL(${r1},${r2})`, result: corr.toFixed(3), resultRaw: corr, columns: [c1, c2], complexity: 'Intermediate', useCase: 'Correlation', icon: '🔗', color: '#EC4899', badge: Math.abs(corr) > 0.7 ? 'Strong' : null });
      out.push({ id: `xl_ratio_${c1}_${c2}`, lang: 'excel', group: 'Relationships', name: `${fmt(c1)} / ${fmt(c2)} ratio (row)`, formula: `=IFERROR(${L1}2/${L2}2, 0)`, result: 'Row-level ratio', columns: [c1, c2], complexity: 'Basic', useCase: 'Ratio', icon: '÷', color: '#06B6D4' });
    }
  }

  return out;
}
