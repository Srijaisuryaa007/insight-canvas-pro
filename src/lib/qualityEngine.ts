// Local Data Quality Analysis Engine
// Runs entirely in the browser — no backend required

import { QualityReport, QualityIssue } from '@/lib/api';

export interface QualityFix {
  column: string;
  type: string;
  description: string;
  preview: { before: string; after: string; affectedRows: number };
  apply: (data: Record<string, unknown>[]) => Record<string, unknown>[];
}

export function runLocalQualityScan(
  datasetId: string,
  data: Record<string, unknown>[]
): QualityReport {
  if (!data || data.length === 0) {
    return {
      datasetId,
      overallScore: 100,
      issues: [],
      scannedAt: new Date().toISOString(),
      confidence: 1,
      reasoning: 'No data to analyze.',
      suggestedActions: [],
    };
  }

  const columns = Object.keys(data[0]);
  const issues: QualityIssue[] = [];
  let totalIssueCount = 0;

  columns.forEach(col => {
    const values = data.map(r => r[col]);
    const total = values.length;

    // 1. Missing values
    const missingCount = values.filter(v => v === null || v === undefined || v === '' || (typeof v === 'number' && isNaN(v))).length;
    if (missingCount > 0) {
      const pct = Math.round((missingCount / total) * 100);
      issues.push({
        column: col,
        type: 'missing',
        severity: pct > 20 ? 'high' : pct > 5 ? 'medium' : 'low',
        count: missingCount,
        percentage: pct,
        suggestion: `Impute with ${isNumericColumn(data, col) ? 'mean/median' : 'mode'} or remove rows.`,
        confidence: 0.95,
        reasoning: `${missingCount} of ${total} values are null/empty.`,
      });
      totalIssueCount += missingCount;
    }

    // 2. Duplicates
    const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
    const uniqueCount = new Set(nonNull.map(String)).size;
    const dupeCount = nonNull.length - uniqueCount;
    if (dupeCount > total * 0.5 && typeof values.find(v => v !== null && v !== undefined) !== 'boolean') {
      issues.push({
        column: col,
        type: 'duplicate',
        severity: 'medium',
        count: dupeCount,
        percentage: Math.round((dupeCount / total) * 100),
        suggestion: 'Verify if duplicates are valid or need deduplication.',
        confidence: 0.88,
        reasoning: `${dupeCount} duplicate values found across ${total} rows.`,
      });
    }

    // 3. Outliers (numeric only, IQR method)
    if (isNumericColumn(data, col)) {
      const nums = values.filter(v => typeof v === 'number' && !isNaN(v)) as number[];
      if (nums.length > 4) {
        const sorted = [...nums].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(sorted.length * 0.25)];
        const q3 = sorted[Math.floor(sorted.length * 0.75)];
        const iqr = q3 - q1;
        const lower = q1 - 1.5 * iqr;
        const upper = q3 + 1.5 * iqr;
        const outliers = nums.filter(v => v < lower || v > upper);
        if (outliers.length > 0) {
          issues.push({
            column: col,
            type: 'outlier',
            severity: outliers.length / total > 0.1 ? 'high' : 'low',
            count: outliers.length,
            percentage: Math.round((outliers.length / total) * 100),
            suggestion: `Cap values to [${lower.toFixed(1)}, ${upper.toFixed(1)}] or investigate.`,
            confidence: 0.85,
            reasoning: `IQR method: Q1=${q1.toFixed(1)}, Q3=${q3.toFixed(1)}, IQR=${iqr.toFixed(1)}. ${outliers.length} values outside bounds.`,
          });
          totalIssueCount += outliers.length;
        }
      }
    }

    // 4. Invalid format detection (e.g. numbers in string columns)
    if (!isNumericColumn(data, col)) {
      const numericLooking = nonNull.filter(v => typeof v === 'string' && !isNaN(Number(v)) && (v as string).trim() !== '');
      if (numericLooking.length > total * 0.8 && numericLooking.length > 5) {
        issues.push({
          column: col,
          type: 'invalid',
          severity: 'medium',
          count: numericLooking.length,
          percentage: Math.round((numericLooking.length / total) * 100),
          suggestion: `Column appears numeric but stored as text. Convert to number type.`,
          confidence: 0.9,
          reasoning: `${numericLooking.length} of ${nonNull.length} non-null values are parseable as numbers.`,
        });
      }
    }
  });

  const maxPossible = data.length * columns.length;
  const issueRatio = totalIssueCount / maxPossible;
  const overallScore = Math.max(0, Math.round((1 - issueRatio) * 100));

  return {
    datasetId,
    overallScore,
    issues,
    scannedAt: new Date().toISOString(),
    confidence: 0.92,
    reasoning: `Analyzed ${columns.length} columns across ${data.length} rows. Found ${issues.length} issue types affecting ${totalIssueCount} cells.`,
    suggestedActions: issues.slice(0, 3).map(i => `Fix ${i.type} in ${i.column}`),
  };
}

export function generateFix(
  data: Record<string, unknown>[],
  column: string,
  issueType: string
): QualityFix {
  const values = data.map(r => r[column]);

  switch (issueType) {
    case 'missing': {
      const isNum = isNumericColumn(data, column);
      if (isNum) {
        const nums = values.filter(v => typeof v === 'number' && !isNaN(v)) as number[];
        const median = getMedian(nums);
        return {
          column,
          type: 'missing',
          description: `Fill ${values.filter(v => v === null || v === undefined || v === '').length} missing values with median (${median.toFixed(2)})`,
          preview: {
            before: `${values.filter(v => v === null || v === undefined || v === '').length} missing`,
            after: `0 missing (filled with ${median.toFixed(2)})`,
            affectedRows: values.filter(v => v === null || v === undefined || v === '').length,
          },
          apply: (d) => d.map(row => {
            if (row[column] === null || row[column] === undefined || row[column] === '') {
              return { ...row, [column]: median };
            }
            return row;
          }),
        };
      } else {
        const mode = getMode(values.filter(v => v !== null && v !== undefined && v !== '').map(String));
        return {
          column,
          type: 'missing',
          description: `Fill missing values with mode ("${mode}")`,
          preview: {
            before: `${values.filter(v => v === null || v === undefined || v === '').length} missing`,
            after: `0 missing (filled with "${mode}")`,
            affectedRows: values.filter(v => v === null || v === undefined || v === '').length,
          },
          apply: (d) => d.map(row => {
            if (row[column] === null || row[column] === undefined || row[column] === '') {
              return { ...row, [column]: mode };
            }
            return row;
          }),
        };
      }
    }

    case 'outlier': {
      const nums = values.filter(v => typeof v === 'number' && !isNaN(v)) as number[];
      const sorted = [...nums].sort((a, b) => a - b);
      const q1 = sorted[Math.floor(sorted.length * 0.25)];
      const q3 = sorted[Math.floor(sorted.length * 0.75)];
      const iqr = q3 - q1;
      const lower = q1 - 1.5 * iqr;
      const upper = q3 + 1.5 * iqr;
      const outlierCount = nums.filter(v => v < lower || v > upper).length;

      return {
        column,
        type: 'outlier',
        description: `Cap ${outlierCount} outliers to [${lower.toFixed(1)}, ${upper.toFixed(1)}]`,
        preview: {
          before: `${outlierCount} outliers outside IQR bounds`,
          after: `0 outliers (capped to IQR bounds)`,
          affectedRows: outlierCount,
        },
        apply: (d) => d.map(row => {
          const v = row[column];
          if (typeof v === 'number') {
            if (v < lower) return { ...row, [column]: lower };
            if (v > upper) return { ...row, [column]: upper };
          }
          return row;
        }),
      };
    }

    case 'duplicate': {
      const seen = new Set<string>();
      let dupeCount = 0;
      data.forEach(row => {
        const key = String(row[column]);
        if (seen.has(key)) dupeCount++;
        seen.add(key);
      });

      return {
        column,
        type: 'duplicate',
        description: `Remove ${dupeCount} duplicate rows by "${column}"`,
        preview: {
          before: `${data.length} rows (${dupeCount} duplicates)`,
          after: `${data.length - dupeCount} rows`,
          affectedRows: dupeCount,
        },
        apply: (d) => {
          const seenKeys = new Set<string>();
          return d.filter(row => {
            const key = String(row[column]);
            if (seenKeys.has(key)) return false;
            seenKeys.add(key);
            return true;
          });
        },
      };
    }

    case 'invalid': {
      const convertible = values.filter(v => typeof v === 'string' && !isNaN(Number(v)) && (v as string).trim() !== '').length;
      return {
        column,
        type: 'invalid',
        description: `Convert ${convertible} text values to numbers`,
        preview: {
          before: `${convertible} values stored as text`,
          after: `${convertible} values converted to numbers`,
          affectedRows: convertible,
        },
        apply: (d) => d.map(row => {
          const v = row[column];
          if (typeof v === 'string' && !isNaN(Number(v)) && v.trim() !== '') {
            return { ...row, [column]: Number(v) };
          }
          return row;
        }),
      };
    }

    default:
      return {
        column,
        type: issueType,
        description: 'No automatic fix available.',
        preview: { before: '-', after: '-', affectedRows: 0 },
        apply: (d) => d,
      };
  }
}

// Helpers
function isNumericColumn(data: Record<string, unknown>[], col: string): boolean {
  const sample = data.find(r => r[col] !== null && r[col] !== undefined);
  return sample ? typeof sample[col] === 'number' : false;
}

function getMedian(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function getMode(values: string[]): string {
  const freq: Record<string, number> = {};
  values.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
}
