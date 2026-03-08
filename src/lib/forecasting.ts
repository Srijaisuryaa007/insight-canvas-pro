// DataPulse Forecasting & Anomaly Detection Engine

export interface ForecastPoint {
  period: string;
  predicted_value: number;
  lower_bound: number;
  upper_bound: number;
}

export interface AnomalyPoint {
  index: number;
  value: number;
  expected: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high';
  label: string;
}

function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  values.forEach((y, x) => { num += (x - xMean) * (y - yMean); den += (x - xMean) ** 2; });
  const slope = den === 0 ? 0 : num / den;
  return { slope, intercept: yMean - slope * xMean };
}

function movingAverage(values: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return result;
}

export function forecast(
  data: Record<string, unknown>[],
  timeCol: string,
  valueCol: string,
  periods: number,
  method: 'linear' | 'moving_average' = 'linear'
): ForecastPoint[] {
  const values = data.map(r => Number(r[valueCol]) || 0);
  const labels = data.map(r => String(r[timeCol]));
  if (values.length < 3) return [];

  const std = Math.sqrt(values.reduce((s, v) => s + (v - values.reduce((a, b) => a + b, 0) / values.length) ** 2, 0) / values.length);
  const results: ForecastPoint[] = [];

  if (method === 'linear') {
    const { slope, intercept } = linearRegression(values);
    for (let i = 1; i <= periods; i++) {
      const idx = values.length + i - 1;
      const predicted = Math.round((intercept + slope * idx) * 100) / 100;
      results.push({
        period: `Period +${i}`,
        predicted_value: predicted,
        lower_bound: Math.round((predicted - 1.96 * std) * 100) / 100,
        upper_bound: Math.round((predicted + 1.96 * std) * 100) / 100,
      });
    }
  } else {
    const window = Math.min(3, Math.floor(values.length / 2));
    const ma = movingAverage(values, window);
    const lastMa = ma[ma.length - 1];
    const trend = ma.length >= 2 ? ma[ma.length - 1] - ma[ma.length - 2] : 0;
    for (let i = 1; i <= periods; i++) {
      const predicted = Math.round((lastMa + trend * i) * 100) / 100;
      results.push({
        period: `Period +${i}`,
        predicted_value: predicted,
        lower_bound: Math.round((predicted - 1.5 * std) * 100) / 100,
        upper_bound: Math.round((predicted + 1.5 * std) * 100) / 100,
      });
    }
  }
  return results;
}

export function detectAnomalies(
  data: Record<string, unknown>[],
  valueCol: string,
  labelCol: string,
  method: 'zscore' | 'iqr' = 'zscore',
  threshold: number = 3
): AnomalyPoint[] {
  const values = data.map(r => Number(r[valueCol]) || 0);
  if (values.length < 5) return [];

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
  const anomalies: AnomalyPoint[] = [];

  if (method === 'zscore') {
    values.forEach((v, i) => {
      const z = std === 0 ? 0 : Math.abs(v - mean) / std;
      if (z > threshold) {
        anomalies.push({
          index: i,
          value: v,
          expected: Math.round(mean * 100) / 100,
          deviation: Math.round(z * 100) / 100,
          severity: z > threshold + 2 ? 'high' : z > threshold + 1 ? 'medium' : 'low',
          label: String(data[i][labelCol] || `Row ${i + 1}`),
        });
      }
    });
  } else {
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lower = q1 - 1.5 * iqr;
    const upper = q3 + 1.5 * iqr;
    values.forEach((v, i) => {
      if (v < lower || v > upper) {
        const dev = v < lower ? (lower - v) / iqr : (v - upper) / iqr;
        anomalies.push({
          index: i,
          value: v,
          expected: Math.round(mean * 100) / 100,
          deviation: Math.round(dev * 100) / 100,
          severity: dev > 3 ? 'high' : dev > 2 ? 'medium' : 'low',
          label: String(data[i][labelCol] || `Row ${i + 1}`),
        });
      }
    });
  }
  return anomalies;
}

export function detectTimeColumn(columns: string[], data: Record<string, unknown>[]): string | null {
  const timePatterns = /^(date|time|timestamp|month|year|quarter|period|day|week)/i;
  for (const col of columns) {
    if (timePatterns.test(col)) return col;
    if (data.length > 0) {
      const val = String(data[0][col]);
      if (!isNaN(Date.parse(val)) && val.length > 6) return col;
    }
  }
  return null;
}

export function detectNumericColumns(columns: string[], data: Record<string, unknown>[]): string[] {
  if (!data.length) return [];
  return columns.filter(c => typeof data[0][c] === 'number');
}
