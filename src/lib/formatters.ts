// Reusable formatters — shared by Quality, Insights, Reports, GeoViz
import { format as dfFormat } from 'date-fns';

export function formatNum(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(Number(n))) return '—';
  const v = Number(n);
  const abs = Math.abs(v);
  if (abs >= 1e9) return (v / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'B';
  if (abs >= 1e6) return (v / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M';
  if (abs >= 1e3) return (v / 1e3).toFixed(1).replace(/\.?0+$/, '') + 'K';
  if (Number.isInteger(v)) return v.toLocaleString('en-US');
  return v.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export function formatPct(n: number, digits = 1): string {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return `${n.toFixed(digits)}%`;
}

export function formatDate(d: Date | string | number, fmt = 'yyyy-MM-dd'): string {
  try {
    const date = d instanceof Date ? d : new Date(d);
    if (isNaN(date.getTime())) return String(d);
    return dfFormat(date, fmt);
  } catch {
    return String(d);
  }
}

export function getRank(label: string | number, data: Array<Record<string, unknown>>, col: string): number {
  const sorted = [...data]
    .map((r, i) => ({ i, v: Number(r[col]) || 0 }))
    .sort((a, b) => b.v - a.v);
  const idx = sorted.findIndex((r) => String(data[r.i][col]) === String(label));
  return idx >= 0 ? idx + 1 : 0;
}

export function getPct(value: number, total: number): string {
  if (!total) return '0.0';
  return ((value / total) * 100).toFixed(1);
}
