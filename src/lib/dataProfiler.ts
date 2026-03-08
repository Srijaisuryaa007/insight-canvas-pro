// Data Profiling Engine — Step 1 of the cleaning pipeline

export interface ColumnProfile {
  name: string;
  type: 'number' | 'string' | 'date' | 'boolean' | 'mixed';
  totalValues: number;
  missingCount: number;
  missingPct: number;
  uniqueCount: number;
  duplicateCount: number;
  // Numeric stats
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  stdDev?: number;
  // Date stats
  dateMin?: string;
  dateMax?: string;
  // Outlier count
  outlierCount?: number;
  // Sample values
  sampleValues?: string[];
}

export interface DataProfile {
  totalRows: number;
  totalColumns: number;
  totalMissing: number;
  totalMissingPct: number;
  duplicateRows: number;
  issuesFound: number;
  columns: ColumnProfile[];
  memoryEstimateKB: number;
  firstFiveRows: Record<string, unknown>[];
  lastFiveRows: Record<string, unknown>[];
}

export function profileData(data: Record<string, unknown>[]): DataProfile {
  if (!data || data.length === 0) {
    return { totalRows: 0, totalColumns: 0, totalMissing: 0, totalMissingPct: 0, duplicateRows: 0, issuesFound: 0, columns: [], memoryEstimateKB: 0, firstFiveRows: [], lastFiveRows: [] };
  }

  const keys = Object.keys(data[0]);
  const totalRows = data.length;
  const totalColumns = keys.length;
  let totalMissing = 0;
  let issuesFound = 0;
  const columns: ColumnProfile[] = [];

  // Memory estimate (rough: JSON string length as proxy)
  const sampleSize = Math.min(100, data.length);
  const sampleStr = JSON.stringify(data.slice(0, sampleSize));
  const memoryEstimateKB = Math.round((sampleStr.length / sampleSize) * data.length / 1024);

  // First/Last 5 rows
  const firstFiveRows = data.slice(0, 5);
  const lastFiveRows = data.slice(-5);

  // Duplicate rows
  const rowKeys = new Set<string>();
  let duplicateRows = 0;
  data.forEach(row => {
    const key = JSON.stringify(row);
    if (rowKeys.has(key)) duplicateRows++;
    rowKeys.add(key);
  });
  if (duplicateRows > 0) issuesFound++;

  keys.forEach(col => {
    const values = data.map(r => r[col]);
    const total = values.length;
    const missing = values.filter(v => v === null || v === undefined || v === '' || (typeof v === 'number' && isNaN(v))).length;
    totalMissing += missing;
    if (missing > 0) issuesFound++;

    const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
    const uniqueSet = new Set(nonNull.map(String));
    const duplicateCount = nonNull.length - uniqueSet.size;

    // Sample values (up to 5 unique)
    const sampleValues = [...uniqueSet].slice(0, 5);

    // Detect type
    const sampleNonNull = nonNull[0];
    let type: ColumnProfile['type'] = 'string';
    if (typeof sampleNonNull === 'number') type = 'number';
    else if (typeof sampleNonNull === 'boolean') type = 'boolean';
    else if (typeof sampleNonNull === 'string' && /^\d{4}-\d{2}-\d{2}/.test(sampleNonNull)) type = 'date';

    // Check for mixed types
    const types = new Set(nonNull.map(v => typeof v));
    if (types.size > 1) type = 'mixed';

    const profile: ColumnProfile = {
      name: col,
      type,
      totalValues: total,
      missingCount: missing,
      missingPct: Math.round((missing / total) * 100),
      uniqueCount: uniqueSet.size,
      duplicateCount,
      sampleValues,
    };

    if (type === 'number') {
      const nums = nonNull.filter(v => typeof v === 'number' && !isNaN(v)) as number[];
      if (nums.length > 0) {
        const sorted = [...nums].sort((a, b) => a - b);
        const sum = nums.reduce((a, b) => a + b, 0);
        const mean = sum / nums.length;
        const mid = Math.floor(sorted.length / 2);
        const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        const variance = nums.reduce((acc, v) => acc + (v - mean) ** 2, 0) / nums.length;

        // IQR outliers
        const q1 = sorted[Math.floor(sorted.length * 0.25)];
        const q3 = sorted[Math.floor(sorted.length * 0.75)];
        const iqr = q3 - q1;
        const lower = q1 - 1.5 * iqr;
        const upper = q3 + 1.5 * iqr;
        const outlierCount = nums.filter(v => v < lower || v > upper).length;
        if (outlierCount > 0) issuesFound++;

        profile.min = sorted[0];
        profile.max = sorted[sorted.length - 1];
        profile.mean = Math.round(mean * 100) / 100;
        profile.median = Math.round(median * 100) / 100;
        profile.stdDev = Math.round(Math.sqrt(variance) * 100) / 100;
        profile.outlierCount = outlierCount;
      }
    }

    if (type === 'date') {
      const dates = nonNull.map(v => new Date(v as string).getTime()).filter(d => !isNaN(d)).sort((a, b) => a - b);
      if (dates.length > 0) {
        profile.dateMin = new Date(dates[0]).toISOString().split('T')[0];
        profile.dateMax = new Date(dates[dates.length - 1]).toISOString().split('T')[0];
      }
    }

    columns.push(profile);
  });

  return {
    totalRows,
    totalColumns,
    totalMissing,
    totalMissingPct: Math.round((totalMissing / (totalRows * totalColumns)) * 100),
    duplicateRows,
    issuesFound,
    columns,
    memoryEstimateKB,
    firstFiveRows,
    lastFiveRows,
  };
}
