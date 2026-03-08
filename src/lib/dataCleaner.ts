// Full 8-Step Data Cleaning Pipeline
// Based on expert data cleaning methodology

export interface CleaningStep {
  step: number;
  name: string;
  icon: string;
  actions: string[];
  rowsBefore: number;
  rowsAfter: number;
  changesMade: number;
}

export interface CleaningSummary {
  steps: CleaningStep[];
  rowsBefore: number;
  rowsAfter: number;
  duplicatesRemoved: number;
  missingFixed: number;
  outliersCapped: number;
  typesFixed: number;
  textStandardized: number;
  featuresAdded: string[];
  healthScore: number;
  warnings: string[];
  recommendations: string[];
}

export function runFullCleaningPipeline(
  data: Record<string, unknown>[]
): { cleanedData: Record<string, unknown>[]; summary: CleaningSummary } {
  const steps: CleaningStep[] = [];
  let current = data.map(r => ({ ...r }));
  const initialRows = current.length;
  let duplicatesRemoved = 0;
  let missingFixed = 0;
  let outliersCapped = 0;
  let typesFixed = 0;
  let textStandardized = 0;
  const featuresAdded: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  const keys = Object.keys(current[0] || {});
  const numCols = keys.filter(k => current.some(r => typeof r[k] === 'number'));
  const strCols = keys.filter(k => current.some(r => typeof r[k] === 'string' && !/^\d{4}-\d{2}-\d{2}/.test(r[k] as string)));
  const dateCols = keys.filter(k => current.some(r => typeof r[k] === 'string' && /^\d{4}-\d{2}-\d{2}/.test(r[k] as string)));

  // STEP 2: Handle Missing Values
  {
    const actions: string[] = [];
    let changes = 0;
    const before = current.length;

    // Drop columns with >40% missing
    const colsToDrop: string[] = [];
    keys.forEach(col => {
      const missingPct = current.filter(r => r[col] === null || r[col] === undefined || r[col] === '').length / current.length;
      if (missingPct > 0.4) {
        colsToDrop.push(col);
        actions.push(`⚠️ Column "${col}" has ${Math.round(missingPct * 100)}% missing — flagged for review`);
        warnings.push(`Column "${col}" has >${Math.round(missingPct * 100)}% missing values`);
      }
    });

    // Fill numeric with median
    numCols.forEach(col => {
      if (colsToDrop.includes(col)) return;
      const vals = current.map(r => r[col]).filter(v => typeof v === 'number' && !isNaN(v)) as number[];
      if (vals.length === 0) return;
      const sorted = [...vals].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      let count = 0;
      current = current.map(r => {
        if (r[col] === null || r[col] === undefined || r[col] === '') {
          count++;
          return { ...r, [col]: Math.round(median * 100) / 100 };
        }
        return r;
      });
      if (count > 0) {
        actions.push(`Filled ${count} missing in "${col}" with median (${median.toFixed(2)})`);
        changes += count;
        missingFixed += count;
      }
    });

    // Fill categorical with mode
    strCols.forEach(col => {
      if (colsToDrop.includes(col)) return;
      const vals = current.map(r => r[col]).filter(v => v !== null && v !== undefined && v !== '') as string[];
      if (vals.length === 0) return;
      const freq: Record<string, number> = {};
      vals.forEach(v => { freq[String(v)] = (freq[String(v)] || 0) + 1; });
      const mode = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
      let count = 0;
      current = current.map(r => {
        if (r[col] === null || r[col] === undefined || r[col] === '') {
          count++;
          return { ...r, [col]: mode };
        }
        return r;
      });
      if (count > 0) {
        actions.push(`Filled ${count} missing in "${col}" with mode ("${mode}")`);
        changes += count;
        missingFixed += count;
      }
    });

    if (actions.length === 0) actions.push('No missing values found');
    steps.push({ step: 2, name: 'Handle Missing Values', icon: '🔧', actions, rowsBefore: before, rowsAfter: current.length, changesMade: changes });
  }

  // STEP 3: Remove Duplicates
  {
    const before = current.length;
    const seen = new Set<string>();
    const deduped: Record<string, unknown>[] = [];
    current.forEach(row => {
      const key = JSON.stringify(row);
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(row);
      }
    });
    duplicatesRemoved = before - deduped.length;
    current = deduped;

    // Standardize text casing for near-duplicates
    strCols.forEach(col => {
      current = current.map(r => {
        const v = r[col];
        if (typeof v === 'string') {
          return { ...r, [col]: v.trim() };
        }
        return r;
      });
    });

    const actions = duplicatesRemoved > 0
      ? [`Removed ${duplicatesRemoved} exact duplicate rows`, 'Trimmed whitespace in text columns']
      : ['No duplicate rows found', 'Trimmed whitespace in text columns'];
    steps.push({ step: 3, name: 'Remove Duplicates', icon: '🗑️', actions, rowsBefore: before, rowsAfter: current.length, changesMade: duplicatesRemoved });
  }

  // STEP 4: Fix Data Types
  {
    const actions: string[] = [];
    let changes = 0;

    // Numbers stored as text
    strCols.forEach(col => {
      const nonNull = current.filter(r => r[col] !== null && r[col] !== undefined && r[col] !== '');
      const numericLooking = nonNull.filter(r => typeof r[col] === 'string' && !isNaN(Number((r[col] as string).replace(/[$,]/g, ''))) && (r[col] as string).trim() !== '');
      if (numericLooking.length > nonNull.length * 0.8 && numericLooking.length > 3) {
        let count = 0;
        current = current.map(r => {
          if (typeof r[col] === 'string' && !isNaN(Number((r[col] as string).replace(/[$,]/g, ''))) && (r[col] as string).trim() !== '') {
            count++;
            return { ...r, [col]: Number((r[col] as string).replace(/[$,]/g, '')) };
          }
          return r;
        });
        if (count > 0) {
          actions.push(`Converted ${count} text values in "${col}" to numbers`);
          changes += count;
          typesFixed += count;
        }
      }
    });

    // Boolean stored as Yes/No
    strCols.forEach(col => {
      const vals = current.map(r => r[col]).filter(v => typeof v === 'string');
      const boolLike = vals.filter(v => ['yes', 'no', 'true', 'false', 'y', 'n'].includes((v as string).toLowerCase()));
      if (boolLike.length > vals.length * 0.9 && boolLike.length > 3) {
        let count = 0;
        current = current.map(r => {
          if (typeof r[col] === 'string') {
            const lower = (r[col] as string).toLowerCase();
            if (['yes', 'true', 'y'].includes(lower)) { count++; return { ...r, [col]: true }; }
            if (['no', 'false', 'n'].includes(lower)) { count++; return { ...r, [col]: false }; }
          }
          return r;
        });
        if (count > 0) {
          actions.push(`Converted ${count} Yes/No values in "${col}" to boolean`);
          changes += count;
          typesFixed += count;
        }
      }
    });

    if (actions.length === 0) actions.push('All data types are correct');
    steps.push({ step: 4, name: 'Fix Data Types', icon: '🔄', actions, rowsBefore: current.length, rowsAfter: current.length, changesMade: changes });
  }

  // STEP 5: Handle Outliers (IQR, cap not delete)
  {
    const actions: string[] = [];
    let changes = 0;

    numCols.forEach(col => {
      const nums = current.map(r => r[col]).filter(v => typeof v === 'number' && !isNaN(v)) as number[];
      if (nums.length < 5) return;
      const sorted = [...nums].sort((a, b) => a - b);
      const q1 = sorted[Math.floor(sorted.length * 0.25)];
      const q3 = sorted[Math.floor(sorted.length * 0.75)];
      const iqr = q3 - q1;
      if (iqr === 0) return;
      const lower = q1 - 1.5 * iqr;
      const upper = q3 + 1.5 * iqr;
      let count = 0;
      current = current.map(r => {
        const v = r[col];
        if (typeof v === 'number') {
          if (v < lower) { count++; return { ...r, [col]: Math.round(lower * 100) / 100 }; }
          if (v > upper) { count++; return { ...r, [col]: Math.round(upper * 100) / 100 }; }
        }
        return r;
      });
      if (count > 0) {
        actions.push(`Capped ${count} outliers in "${col}" to [${lower.toFixed(1)}, ${upper.toFixed(1)}]`);
        changes += count;
        outliersCapped += count;
      }
    });

    if (actions.length === 0) actions.push('No outliers detected');
    steps.push({ step: 5, name: 'Handle Outliers', icon: '📊', actions, rowsBefore: current.length, rowsAfter: current.length, changesMade: changes });
  }

  // STEP 6: Standardize Text
  {
    const actions: string[] = [];
    let changes = 0;

    strCols.forEach(col => {
      let count = 0;
      current = current.map(r => {
        const v = r[col];
        if (typeof v === 'string' && v.length > 0) {
          // Title case & strip special chars from names
          const cleaned = v.trim().replace(/\s+/g, ' ');
          if (cleaned !== v) {
            count++;
            return { ...r, [col]: cleaned };
          }
        }
        return r;
      });
      if (count > 0) {
        actions.push(`Standardized ${count} values in "${col}"`);
        changes += count;
        textStandardized += count;
      }
    });

    // Email standardization
    const emailCol = keys.find(k => k.toLowerCase().includes('email'));
    if (emailCol) {
      let count = 0;
      current = current.map(r => {
        if (typeof r[emailCol] === 'string') {
          const lower = (r[emailCol] as string).toLowerCase().trim();
          if (lower !== r[emailCol]) { count++; return { ...r, [emailCol]: lower }; }
        }
        return r;
      });
      if (count > 0) {
        actions.push(`Standardized ${count} email addresses`);
        changes += count;
        textStandardized += count;
      }
    }

    if (actions.length === 0) actions.push('Text data is already clean');
    steps.push({ step: 6, name: 'Standardize Text', icon: '📝', actions, rowsBefore: current.length, rowsAfter: current.length, changesMade: changes });
  }

  // STEP 7: Feature Engineering
  {
    const actions: string[] = [];

    // Extract year/month from date columns
    dateCols.forEach(col => {
      const yearKey = `${col}_year`;
      const monthKey = `${col}_month`;
      if (!keys.includes(yearKey)) {
        current = current.map(r => {
          const d = new Date(r[col] as string);
          if (!isNaN(d.getTime())) {
            return { ...r, [yearKey]: d.getFullYear(), [monthKey]: d.getMonth() + 1 };
          }
          return r;
        });
        actions.push(`Extracted year & month from "${col}"`);
        featuresAdded.push(yearKey, monthKey);
      }
    });

    // Revenue per unit
    const revCol = keys.find(k => /revenue|sales|amount/i.test(k));
    const qtyCol = keys.find(k => /quantity|qty|units/i.test(k));
    if (revCol && qtyCol) {
      const rpu = `${revCol}_per_unit`;
      current = current.map(r => {
        const rev = Number(r[revCol]);
        const qty = Number(r[qtyCol]);
        if (qty > 0 && !isNaN(rev)) {
          return { ...r, [rpu]: Math.round((rev / qty) * 100) / 100 };
        }
        return r;
      });
      actions.push(`Created "${rpu}" from ${revCol}/${qtyCol}`);
      featuresAdded.push(rpu);
    }

    if (actions.length === 0) actions.push('No additional features to extract');
    steps.push({ step: 7, name: 'Feature Engineering', icon: '⚡', actions, rowsBefore: current.length, rowsAfter: current.length, changesMade: featuresAdded.length });
  }

  // Calculate health score
  const totalCells = current.length * Object.keys(current[0] || {}).length;
  const remainingMissing = current.reduce((acc, r) => acc + Object.values(r).filter(v => v === null || v === undefined || v === '').length, 0);
  const missingRatio = totalCells > 0 ? remainingMissing / totalCells : 0;
  const healthScore = Math.max(0, Math.min(100, Math.round((1 - missingRatio) * 100)));

  // Recommendations
  if (current.length < 50) recommendations.push('Dataset is small — consider collecting more data for reliable analysis');
  if (numCols.length > 0) recommendations.push('Run correlation analysis to identify relationships between numeric columns');
  if (dateCols.length > 0) recommendations.push('Explore time-series trends using the date columns');
  if (strCols.length > 3) recommendations.push('Consider encoding categorical variables for ML models');
  if (featuresAdded.length > 0) recommendations.push('Review engineered features for business relevance');

  const summary: CleaningSummary = {
    steps,
    rowsBefore: initialRows,
    rowsAfter: current.length,
    duplicatesRemoved,
    missingFixed,
    outliersCapped,
    typesFixed,
    textStandardized,
    featuresAdded,
    healthScore,
    warnings,
    recommendations,
  };

  return { cleanedData: current, summary };
}
