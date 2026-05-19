// Auto-dashboard builder: generates a structured, row-based dashboard layout
// with formula-driven KPIs, primary chart, secondary charts, tertiary charts, and a table.

export interface KPISpec {
  column: string;
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max';
  formula: string;
  precomputedValue: string;
  trend: number;
  title: string;
}

export interface ChartSpec {
  chartType: string;
  xAxis: string;
  yAxis: string;
  title: string;
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max';
}

export interface AutoLayoutWidget {
  type: 'kpi' | 'chart' | 'table';
  layout: { x: number; y: number; w: number; h: number };
  config: Record<string, unknown>;
}

const SUM_KEYWORDS = ['revenue', 'sales', 'amount', 'total', 'cost', 'profit', 'count', 'qty', 'quantity', 'sum', 'expense'];
const AVG_KEYWORDS = ['rate', 'ratio', 'pct', 'percent', 'score', 'rating', 'avg', 'average', 'index', 'efficiency'];

export function formatNum(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(2);
}

export function classifyColumns(data: Record<string, unknown>[]) {
  if (!data.length) return { numCols: [], strCols: [], dateCols: [] };
  const keys = Object.keys(data[0]);
  const sample = data.slice(0, Math.min(50, data.length));
  const numCols: string[] = [];
  const dateCols: string[] = [];
  const strCols: string[] = [];
  for (const k of keys) {
    const vals = sample.map(r => r[k]).filter(v => v !== null && v !== '' && v !== undefined);
    if (!vals.length) { strCols.push(k); continue; }
    const numHits = vals.filter(v => !isNaN(parseFloat(String(v)))).length;
    const dateHits = vals.filter(v => {
      const s = String(v);
      return s.length >= 6 && !isNaN(Date.parse(s)) && /[-/:]/.test(s);
    }).length;
    if (dateHits / vals.length > 0.7) dateCols.push(k);
    else if (numHits / vals.length > 0.7) numCols.push(k);
    else strCols.push(k);
  }
  return { numCols, strCols, dateCols };
}

export function buildKPI(col: string, data: Record<string, unknown>[]): KPISpec | null {
  const lower = col.toLowerCase();
  const isAvg = AVG_KEYWORDS.some(k => lower.includes(k));
  const isSum = SUM_KEYWORDS.some(k => lower.includes(k));
  const aggregation: KPISpec['aggregation'] = isAvg ? 'avg' : (isSum ? 'sum' : 'sum');
  const values = data.map(r => parseFloat(String(r[col]))).filter(v => !isNaN(v));
  if (!values.length) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / values.length;
  const result = aggregation === 'avg' ? avg : sum;

  const mid = Math.max(1, Math.floor(values.length / 2));
  const firstHalf = values.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
  const secondHalf = values.slice(mid).reduce((a, b) => a + b, 0) / Math.max(1, values.length - mid);
  const trend = firstHalf > 0 ? ((secondHalf - firstHalf) / Math.abs(firstHalf)) * 100 : 0;

  const fnName = aggregation === 'avg' ? 'AVERAGE' : 'SUM';
  return {
    column: col,
    aggregation,
    formula: `${fnName}(${col})`,
    precomputedValue: formatNum(result),
    trend: Math.round(trend * 10) / 10,
    title: col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
  };
}

function pickChartType(xType: 'date' | 'str' | 'num', yCount: number): string {
  if (xType === 'date') return 'line';
  if (yCount >= 2) return 'bar';
  return 'bar';
}

export function buildAutoLayout(data: Record<string, unknown>[]): AutoLayoutWidget[] {
  const widgets: AutoLayoutWidget[] = [];
  if (!data.length) return widgets;

  const { numCols, strCols, dateCols } = classifyColumns(data);

  // Pick top 4 numeric columns for KPIs (prefer revenue-like first)
  const ranked = [...numCols].sort((a, b) => {
    const score = (s: string) => {
      const l = s.toLowerCase();
      if (SUM_KEYWORDS.some(k => l.includes(k))) return 2;
      if (AVG_KEYWORDS.some(k => l.includes(k))) return 1;
      return 0;
    };
    return score(b) - score(a);
  });
  const kpiCols = ranked.slice(0, 4);

  // Row 1: KPIs (3 cols wide each, h=2)
  let y = 0;
  kpiCols.forEach((col, i) => {
    const kpi = buildKPI(col, data);
    widgets.push({
      type: 'kpi',
      layout: { x: i * 3, y, w: 3, h: 2 },
      config: {
        kpiColumn: col,
        aggregation: kpi.aggregation,
        title: kpi.title,
        formula: kpi.formula,
        trend: kpi.trend,
        isFormulaForge: true,
        precomputedValue: kpi.precomputedValue,
      },
    });
  });
  if (kpiCols.length) y += 2;

  // Row 2: 1 primary large chart (12 wide, h=5)
  const primaryX = dateCols[0] || strCols[0];
  const primaryY = ranked[0];
  if (primaryX && primaryY) {
    const xType = dateCols.includes(primaryX) ? 'date' : 'str';
    const chartType = pickChartType(xType as any, 1);
    widgets.push({
      type: 'chart',
      layout: { x: 0, y, w: 12, h: 5 },
      config: {
        chartType,
        xAxis: primaryX,
        yAxis: primaryY,
        aggregation: 'sum',
        title: `${primaryY.replace(/_/g, ' ')} by ${primaryX.replace(/_/g, ' ')}`,
        showLegend: true,
        showGrid: true,
      },
    });
    y += 5;
  }

  // Row 3: 2 secondary charts (6 wide each, h=4)
  const secondaryYs = ranked.slice(1, 3);
  const secondaryX = strCols[0] || dateCols[0] || primaryX;
  secondaryYs.forEach((yCol, i) => {
    if (!secondaryX || !yCol) return;
    widgets.push({
      type: 'chart',
      layout: { x: i * 6, y, w: 6, h: 4 },
      config: {
        chartType: i === 0 ? 'bar' : 'area',
        xAxis: secondaryX,
        yAxis: yCol,
        aggregation: 'sum',
        title: `${yCol.replace(/_/g, ' ')} by ${secondaryX.replace(/_/g, ' ')}`,
      },
    });
  });
  if (secondaryYs.length) y += 4;

  // Row 4: up to 3 tertiary charts (4 wide each, h=4)
  // Use a low-cardinality string column for a donut, plus more numeric breakdowns
  const lowCardStr = strCols.find(c => {
    const u = new Set(data.slice(0, 200).map(r => String(r[c])));
    return u.size > 1 && u.size <= 8;
  });
  const tertiarySpecs: ChartSpec[] = [];
  if (lowCardStr && primaryY) {
    tertiarySpecs.push({ chartType: 'pie', xAxis: lowCardStr, yAxis: primaryY, aggregation: 'sum', title: `${primaryY} by ${lowCardStr}` });
  }
  if (numCols.length >= 2) {
    tertiarySpecs.push({ chartType: 'scatter', xAxis: numCols[0], yAxis: numCols[1], aggregation: 'sum', title: `${numCols[0]} vs ${numCols[1]}` });
  }
  const extraY = ranked[3];
  const extraX = strCols[1] || strCols[0] || dateCols[0];
  if (extraY && extraX) {
    tertiarySpecs.push({ chartType: 'bar', xAxis: extraX, yAxis: extraY, aggregation: 'avg', title: `Avg ${extraY} by ${extraX}` });
  }
  tertiarySpecs.slice(0, 3).forEach((s, i) => {
    widgets.push({
      type: 'chart',
      layout: { x: i * 4, y, w: 4, h: 4 },
      config: { ...s },
    });
  });
  if (tertiarySpecs.length) y += 4;

  // Row 5: full-width data table
  widgets.push({
    type: 'table',
    layout: { x: 0, y, w: 12, h: 5 },
    config: { title: 'Data Preview', tableRowLimit: 50 },
  });

  return widgets;
}
