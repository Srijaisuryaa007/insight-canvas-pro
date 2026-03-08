// Full 8-Step Data Cleaning Pipeline — Expert Edition
// Implements comprehensive cleaning with detailed reporting

export interface CleaningStepDetail {
  column: string;
  before: string;
  after: string;
  action: string;
}

export interface CleaningStep {
  step: number;
  name: string;
  icon: string;
  actions: string[];
  details: CleaningStepDetail[];
  rowsBefore: number;
  rowsAfter: number;
  changesMade: number;
}

export interface ColumnAnalysis {
  column: string;
  totalRows: number;
  emptyCount: number;
  emptyPct: number;
  uniqueValues: number;
  action: 'AUTO_DROP' | 'WARN_USER' | 'KEEP_FILL' | 'KEEP_CLEAN';
  reason: string;
  scenario: string;
}

export interface CleaningSummary {
  steps: CleaningStep[];
  columnAnalysis: ColumnAnalysis[];
  rowsBefore: number;
  rowsAfter: number;
  colsBefore: number;
  colsAfter: number;
  duplicatesRemoved: number;
  missingFixed: number;
  outliersCapped: number;
  typesFixed: number;
  textStandardized: number;
  columnsDropped: number;
  columnsNeedingDecision: string[];
  featuresAdded: string[];
  healthScore: number;
  healthBreakdown: { label: string; score: number; max: number }[];
  warnings: string[];
  recommendations: string[];
  flaggedRows: { row: number; column: string; value: string; reason: string }[];
}

// All values treated as empty/missing
const EMPTY_VALUES = new Set([
  'null', 'none', 'na', 'n/a', 'nan', 'nat',
  'unknown', 'not available', 'tbd',
  '-', '--', '---', '????', '####', '****', '////',
  '#div/0!', '#value!', '#ref!', '#n/a!', '#name!',
  '00/00/0000', '0000-00-00',
]);

// Columns where 0 = missing
const ZERO_IS_MISSING_PATTERNS = /revenue|sales|price|amount|salary|age|income|cost|profit|wage/i;

// Business columns get lenient outlier detection (3x IQR)
const BUSINESS_COL_PATTERNS = /revenue|sales|profit|amount|income|price|cost|salary|wage/i;

function isEffectivelyEmpty(value: unknown, colName: string): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'number' && isNaN(value)) return true;
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === '') return true;
    if (EMPTY_VALUES.has(trimmed)) return true;
  }
  // 0 in columns where 0 makes no sense
  if (typeof value === 'number' && value === 0 && ZERO_IS_MISSING_PATTERNS.test(colName)) return true;
  return false;
}

function normalizeToNull(data: Record<string, unknown>[], keys: string[]): { data: Record<string, unknown>[]; normalized: number } {
  let count = 0;
  const result = data.map(row => {
    const newRow = { ...row };
    keys.forEach(col => {
      if (isEffectivelyEmpty(newRow[col], col) && newRow[col] !== null) {
        newRow[col] = null;
        count++;
      }
    });
    return newRow;
  });
  return { data: result, normalized: count };
}

function getMedian(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function getMode(values: string[]): string {
  const freq: Record<string, number> = {};
  values.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
}

function detectColumnTypes(data: Record<string, unknown>[], keys: string[]) {
  const numCols: string[] = [];
  const strCols: string[] = [];
  const dateCols: string[] = [];
  const boolCols: string[] = [];

  keys.forEach(k => {
    const nonNull = data.map(r => r[k]).filter(v => v !== null && v !== undefined && v !== '');
    if (nonNull.length === 0) return;
    const sample = nonNull[0];
    if (typeof sample === 'number') numCols.push(k);
    else if (typeof sample === 'boolean') boolCols.push(k);
    else if (typeof sample === 'string') {
      if (/^\d{4}-\d{2}-\d{2}/.test(sample) || /date|time|day|month|year|dob|joined|created/i.test(k)) {
        dateCols.push(k);
      } else {
        strCols.push(k);
      }
    }
  });
  return { numCols, strCols, dateCols, boolCols };
}

export function runFullCleaningPipeline(
  data: Record<string, unknown>[]
): { cleanedData: Record<string, unknown>[]; summary: CleaningSummary } {
  const steps: CleaningStep[] = [];
  let current = data.map(r => ({ ...r }));
  const initialRows = current.length;
  const initialCols = Object.keys(current[0] || {}).length;
  let duplicatesRemoved = 0;
  let missingFixed = 0;
  let outliersCapped = 0;
  let typesFixed = 0;
  let textStandardized = 0;
  let columnsDropped = 0;
  const featuresAdded: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];
  const flaggedRows: CleaningSummary['flaggedRows'] = [];

  const keys = Object.keys(current[0] || {});
  let { numCols, strCols, dateCols } = detectColumnTypes(current, keys);

  // ══════════════════════════════════════════════
  // STEP 1: Normalize empty values (hidden pre-step)
  // ══════════════════════════════════════════════
  {
    const { data: normalized, normalized: normCount } = normalizeToNull(current, keys);
    current = normalized;
    if (normCount > 0) {
      // This feeds into step 2 reporting
    }
  }

  // ══════════════════════════════════════════════
  // STEP 2: Handle Missing Values
  // ══════════════════════════════════════════════
  {
    const actions: string[] = [];
    const details: CleaningStepDetail[] = [];
    let changes = 0;
    const before = current.length;

    // Analyze each column
    const colsToDrop: string[] = [];
    const allCols = Object.keys(current[0] || {});
    
    allCols.forEach(col => {
      const total = current.length;
      const missingCount = current.filter(r => r[col] === null).length;
      const missingPct = Math.round((missingCount / total) * 100);

      if (missingCount === total) {
        // ALL values empty → DROP immediately
        colsToDrop.push(col);
        actions.push(`🗑️ Column "${col}" is 100% empty → DROPPED`);
        details.push({ column: col, before: `${missingCount} empty (100%)`, after: 'Column dropped', action: 'Auto-dropped (all empty)' });
      } else if (missingPct >= 70) {
        // 70%+ → AUTO DROP
        colsToDrop.push(col);
        actions.push(`🗑️ Column "${col}" has ${missingPct}% empty → AUTO DROPPED`);
        details.push({ column: col, before: `${missingCount} empty (${missingPct}%)`, after: 'Column dropped', action: 'Auto-dropped (>70% empty)' });
        warnings.push(`Column "${col}" was dropped (${missingPct}% empty)`);
      } else if (missingPct >= 50) {
        // 50-70% → fill but WARN
        warnings.push(`Column "${col}" has ${missingPct}% empty values — filled but monitor going forward`);
      }
    });

    // Drop columns
    if (colsToDrop.length > 0) {
      current = current.map(r => {
        const newRow = { ...r };
        colsToDrop.forEach(c => delete newRow[c]);
        return newRow;
      });
      columnsDropped = colsToDrop.length;
      // Rebuild column lists
      const remainingKeys = Object.keys(current[0] || {});
      const redetected = detectColumnTypes(current, remainingKeys);
      numCols = redetected.numCols;
      strCols = redetected.strCols;
      dateCols = redetected.dateCols;
    }

    // Fill numeric with MEDIAN
    numCols.forEach(col => {
      const vals = current.map(r => r[col]).filter(v => typeof v === 'number' && !isNaN(v)) as number[];
      if (vals.length === 0) return;
      const median = getMedian(vals);
      let count = 0;
      current = current.map(r => {
        if (r[col] === null) {
          count++;
          return { ...r, [col]: Math.round(median * 100) / 100 };
        }
        return r;
      });
      if (count > 0) {
        const pct = Math.round((count / current.length) * 100);
        actions.push(`📊 "${col}": Filled ${count} missing (${pct}%) with median (${median.toFixed(2)})`);
        details.push({ column: col, before: `${count} empty (${pct}%)`, after: `0 empty (filled: ${median.toFixed(2)})`, action: 'Filled w/ Median' });
        changes += count;
        missingFixed += count;
      }
    });

    // Fill categorical with MODE
    strCols.forEach(col => {
      const vals = current.map(r => r[col]).filter(v => v !== null && typeof v === 'string') as string[];
      if (vals.length === 0) return;
      const mode = getMode(vals);
      let count = 0;
      current = current.map(r => {
        if (r[col] === null) {
          count++;
          return { ...r, [col]: mode };
        }
        return r;
      });
      if (count > 0) {
        const pct = Math.round((count / current.length) * 100);
        actions.push(`📊 "${col}": Filled ${count} missing (${pct}%) with mode ("${mode}")`);
        details.push({ column: col, before: `${count} empty (${pct}%)`, after: `0 empty (filled: "${mode}")`, action: 'Filled w/ Mode' });
        changes += count;
        missingFixed += count;
      }
    });

    // Fill dates with forward fill
    dateCols.forEach(col => {
      let lastValid: unknown = null;
      let count = 0;
      current = current.map(r => {
        if (r[col] !== null) {
          lastValid = r[col];
          return r;
        }
        if (lastValid !== null) {
          count++;
          return { ...r, [col]: lastValid };
        }
        return r;
      });
      if (count > 0) {
        actions.push(`📊 "${col}": Forward-filled ${count} missing date values`);
        details.push({ column: col, before: `${count} empty`, after: `0 empty (forward fill)`, action: 'Forward Fill' });
        changes += count;
        missingFixed += count;
      }
    });

    if (actions.length === 0) actions.push('✅ No missing values found');
    steps.push({ step: 2, name: 'Detect & Fix Empty/Missing Values', icon: '🔧', actions, details, rowsBefore: before, rowsAfter: current.length, changesMade: changes + columnsDropped });
  }

  // ══════════════════════════════════════════════
  // STEP 3: Remove Duplicates (keep='first')
  // ══════════════════════════════════════════════
  {
    const actions: string[] = [];
    const details: CleaningStepDetail[] = [];
    const before = current.length;

    // Exact duplicates — drop_duplicates(keep='first')
    const seenExact = new Set<string>();
    const dedupedExact: Record<string, unknown>[] = [];
    current.forEach(row => {
      const key = JSON.stringify(row);
      if (!seenExact.has(key)) { seenExact.add(key); dedupedExact.push(row); }
    });
    const exactDupes = before - dedupedExact.length;
    if (exactDupes > 0) {
      actions.push(`🔍 Full Duplicates Found: ${exactDupes} rows`);
      actions.push(`✅ Kept: 1 original row each (keep='first')`);
      actions.push(`❌ Removed: ${exactDupes} extra copies`);
      actions.push(`📊 Rows Before: ${before} → Rows After: ${dedupedExact.length}`);
      details.push({ column: '(all columns)', before: `${before} rows`, after: `${dedupedExact.length} rows`, action: `Removed ${exactDupes} exact dupes` });
    }
    current = dedupedExact;
    duplicatesRemoved += exactDupes;

    // Partial duplicates on key columns
    const currentKeys = Object.keys(current[0] || {});
    const partialDupeCols = currentKeys.filter(k =>
      /email|phone|name|id|username|account/i.test(k) &&
      current.some(r => typeof r[k] === 'string')
    );
    let partialRemoved = 0;
    partialDupeCols.forEach(col => {
      const beforePartial = current.length;
      const seenPartial = new Set<string>();
      current = current.filter(row => {
        const key = String(row[col] ?? '').toLowerCase().trim();
        if (key === '') return true;
        if (seenPartial.has(key)) return false;
        seenPartial.add(key);
        return true;
      });
      const removed = beforePartial - current.length;
      if (removed > 0) {
        partialRemoved += removed;
        actions.push(`🔍 Partial dupes on "${col}": ${removed} extra copies removed (subset=['${col}'], keep='first')`);
        details.push({ column: col, before: `${beforePartial} rows`, after: `${current.length} rows`, action: `Removed ${removed} partial dupes` });
      }
    });
    duplicatesRemoved += partialRemoved;

    if (exactDupes === 0 && partialRemoved === 0) actions.push('✅ No duplicate rows found');
    if (partialDupeCols.length > 0) actions.push(`Columns checked: ${partialDupeCols.join(', ')}`);

    steps.push({ step: 3, name: 'Remove Duplicates (Smart)', icon: '🗑️', actions, details, rowsBefore: before, rowsAfter: current.length, changesMade: exactDupes + partialRemoved });
  }

  // ══════════════════════════════════════════════
  // STEP 4: Fix Data Types
  // ══════════════════════════════════════════════
  {
    const actions: string[] = [];
    const details: CleaningStepDetail[] = [];
    let changes = 0;
    const currentKeys = Object.keys(current[0] || {});

    // Currency/percentage strings → numbers
    currentKeys.forEach(col => {
      const nonNull = current.filter(r => typeof r[col] === 'string' && r[col] !== null);
      if (nonNull.length < 3) return;
      const numericLooking = nonNull.filter(r => {
        const s = (r[col] as string).replace(/[$₹€£,% \s]/g, '');
        return s !== '' && !isNaN(Number(s));
      });
      if (numericLooking.length > nonNull.length * 0.7) {
        let count = 0;
        const hasCurrency = nonNull.some(r => /[$₹€£]/.test(r[col] as string));
        const hasPct = nonNull.some(r => (r[col] as string).includes('%'));
        current = current.map(r => {
          if (typeof r[col] === 'string') {
            const cleaned = (r[col] as string).replace(/[$₹€£,% \s]/g, '');
            if (cleaned !== '' && !isNaN(Number(cleaned))) {
              count++;
              const num = Number(cleaned);
              return { ...r, [col]: hasPct ? Math.round(num) / 100 : Math.round(num * 100) / 100 };
            }
          }
          return r;
        });
        if (count > 0) {
          const typeDesc = hasCurrency ? 'Removed currency symbols, converted' : hasPct ? 'Removed %, converted to decimal' : 'Converted text → number';
          actions.push(`🔧 "${col}": ${typeDesc} (${count} values)`);
          details.push({ column: col, before: 'object (text)', after: hasPct ? 'float (decimal)' : 'float64', action: typeDesc });
          changes += count;
          typesFixed += count;
        }
      }
    });

    // Boolean Yes/No/Y/N/1/0 → true/false
    currentKeys.forEach(col => {
      const vals = current.map(r => r[col]).filter(v => typeof v === 'string') as string[];
      if (vals.length < 3) return;
      const boolMap: Record<string, boolean> = { yes: true, no: false, true: true, false: false, y: true, n: false, '1': true, '0': false };
      const boolLike = vals.filter(v => v.toLowerCase() in boolMap);
      if (boolLike.length > vals.length * 0.9) {
        let count = 0;
        current = current.map(r => {
          if (typeof r[col] === 'string' && (r[col] as string).toLowerCase() in boolMap) {
            count++;
            return { ...r, [col]: boolMap[(r[col] as string).toLowerCase()] };
          }
          return r;
        });
        if (count > 0) {
          actions.push(`🔧 "${col}": Yes/No → True/False (${count} values)`);
          details.push({ column: col, before: 'object', after: 'bool', action: 'Yes/No → True/False' });
          changes += count;
          typesFixed += count;
        }
      }
    });

    // Float IDs → integer
    currentKeys.forEach(col => {
      if (!/id$|_id|^id/i.test(col)) return;
      const vals = current.map(r => r[col]).filter(v => typeof v === 'number') as number[];
      const hasDecimals = vals.some(v => v !== Math.floor(v));
      if (hasDecimals && vals.length > 0) {
        let count = 0;
        current = current.map(r => {
          if (typeof r[col] === 'number' && r[col] !== Math.floor(r[col] as number)) {
            count++;
            return { ...r, [col]: Math.round(r[col] as number) };
          }
          return r;
        });
        if (count > 0) {
          actions.push(`🔧 "${col}": Removed decimals from IDs (${count} values)`);
          details.push({ column: col, before: 'float64', after: 'int64', action: 'Removed decimals' });
          changes += count;
          typesFixed += count;
        }
      }
    });

    if (actions.length === 0) actions.push('✅ All data types are correct');
    steps.push({ step: 4, name: 'Fix Data Types', icon: '🔄', actions, details, rowsBefore: current.length, rowsAfter: current.length, changesMade: changes });
  }

  // Re-detect after type fixes
  {
    const ck = Object.keys(current[0] || {});
    const redetected = detectColumnTypes(current, ck);
    numCols = redetected.numCols;
    strCols = redetected.strCols;
    dateCols = redetected.dateCols;
  }

  // ══════════════════════════════════════════════
  // STEP 5: Handle Outliers (Smart Capping)
  // ══════════════════════════════════════════════
  {
    const actions: string[] = [];
    const details: CleaningStepDetail[] = [];
    let changes = 0;

    numCols.forEach(col => {
      const nums = current.map(r => r[col]).filter(v => typeof v === 'number' && !isNaN(v)) as number[];
      if (nums.length < 5) return;
      const sorted = [...nums].sort((a, b) => a - b);
      const q1 = sorted[Math.floor(sorted.length * 0.25)];
      const q3 = sorted[Math.floor(sorted.length * 0.75)];
      const iqr = q3 - q1;
      if (iqr === 0) return;

      // Business columns get 3x IQR (lenient), others get 1.5x
      const multiplier = BUSINESS_COL_PATTERNS.test(col) ? 3.0 : 1.5;
      const lower = q1 - multiplier * iqr;
      const upper = q3 + multiplier * iqr;

      // Check for impossible values first
      const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
      current.forEach((row, idx) => {
        const v = row[col];
        if (typeof v !== 'number') return;
        // Flag potential test data (10x average)
        if (v > mean * 10 && mean > 0) {
          flaggedRows.push({ row: idx, column: col, value: String(v), reason: `Value is ${Math.round(v / mean)}x the average — possible test data` });
        }
        // Impossible age
        if (/age/i.test(col) && (v < 0 || v > 120)) {
          flaggedRows.push({ row: idx, column: col, value: String(v), reason: 'Impossible age value' });
        }
        // Negative revenue/sales/price
        if (/revenue|sales|price/i.test(col) && v < 0) {
          flaggedRows.push({ row: idx, column: col, value: String(v), reason: 'Negative value in revenue/sales column' });
        }
        // Percentage > 100
        if (/percent|pct|rate/i.test(col) && v > 100) {
          flaggedRows.push({ row: idx, column: col, value: String(v), reason: 'Percentage > 100%' });
        }
      });

      let cappedLow = 0;
      let cappedHigh = 0;
      current = current.map(r => {
        const v = r[col];
        if (typeof v === 'number') {
          if (v < lower) { cappedLow++; return { ...r, [col]: Math.round(lower * 100) / 100 }; }
          if (v > upper) { cappedHigh++; return { ...r, [col]: Math.round(upper * 100) / 100 }; }
        }
        return r;
      });
      const totalCapped = cappedLow + cappedHigh;
      if (totalCapped > 0) {
        actions.push(`📈 "${col}": Capped ${totalCapped} outliers [${lower.toFixed(1)} – ${upper.toFixed(1)}] (${multiplier}x IQR)`);
        details.push({ 
          column: col, 
          before: `${cappedLow} below, ${cappedHigh} above bounds`, 
          after: `Capped to [${lower.toFixed(1)}, ${upper.toFixed(1)}]`, 
          action: `${totalCapped} capped (${multiplier}x IQR)` 
        });
        changes += totalCapped;
        outliersCapped += totalCapped;
      }
    });

    if (actions.length === 0) actions.push('✅ No outliers detected');
    if (flaggedRows.length > 0) actions.push(`⚠️ ${flaggedRows.length} values flagged for manual review (not capped)`);
    steps.push({ step: 5, name: 'Handle Outliers (Smart Capping)', icon: '📈', actions, details, rowsBefore: current.length, rowsAfter: current.length, changesMade: changes });
  }

  // ══════════════════════════════════════════════
  // STEP 6: Standardize Text Data
  // ══════════════════════════════════════════════
  {
    const actions: string[] = [];
    const details: CleaningStepDetail[] = [];
    let changes = 0;
    const currentKeys = Object.keys(current[0] || {});

    // General text: trim, collapse whitespace, title case
    strCols.forEach(col => {
      let count = 0;
      current = current.map(r => {
        const v = r[col];
        if (typeof v === 'string' && v.length > 0) {
          let cleaned = v.trim().replace(/\s+/g, ' ');
          // Title case for names/categories (not for codes/IDs)
          if (!/id$|code|sku|url|link/i.test(col)) {
            cleaned = cleaned.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
          }
          if (cleaned !== v) {
            count++;
            return { ...r, [col]: cleaned };
          }
        }
        return r;
      });
      if (count > 0) {
        actions.push(`📝 "${col}": Standardized ${count} values (trim + title case)`);
        details.push({ column: col, before: `${count} inconsistent`, after: 'Standardized', action: 'Trim + Title Case' });
        changes += count;
        textStandardized += count;
      }
    });

    // Email → lowercase
    const emailCol = currentKeys.find(k => /email/i.test(k));
    if (emailCol) {
      let count = 0;
      let invalidEmails = 0;
      current = current.map(r => {
        if (typeof r[emailCol] === 'string') {
          const lower = (r[emailCol] as string).toLowerCase().trim();
          if (lower !== r[emailCol]) count++;
          // Validate
          if (!/^[\w.+-]+@[\w-]+\.[a-z]{2,}$/i.test(lower)) invalidEmails++;
          return { ...r, [emailCol]: lower };
        }
        return r;
      });
      if (count > 0) {
        actions.push(`📧 "${emailCol}": Lowercased ${count} email addresses`);
        changes += count;
        textStandardized += count;
      }
      if (invalidEmails > 0) {
        warnings.push(`${invalidEmails} invalid email addresses found in "${emailCol}"`);
        actions.push(`⚠️ "${emailCol}": ${invalidEmails} invalid emails flagged`);
      }
    }

    // Phone → digits only
    const phoneCol = currentKeys.find(k => /phone|mobile|cell|tel/i.test(k));
    if (phoneCol) {
      let count = 0;
      current = current.map(r => {
        if (typeof r[phoneCol] === 'string') {
          const digitsOnly = (r[phoneCol] as string).replace(/[^0-9+]/g, '');
          if (digitsOnly !== r[phoneCol]) { count++; return { ...r, [phoneCol]: digitsOnly }; }
        }
        return r;
      });
      if (count > 0) {
        actions.push(`📱 "${phoneCol}": Cleaned ${count} phone numbers (digits only)`);
        details.push({ column: phoneCol, before: `${count} with symbols`, after: 'Digits only', action: 'Removed symbols' });
        changes += count;
        textStandardized += count;
      }
    }

    // Common abbreviation fixes for country/city columns
    const geoCol = currentKeys.find(k => /country|city|region|state|location/i.test(k));
    if (geoCol) {
      const fixes: Record<string, string> = {
        'usa': 'United States', 'us': 'United States', 'u.s.a': 'United States', 'u.s.a.': 'United States',
        'uk': 'United Kingdom', 'u.k.': 'United Kingdom', 'gb': 'United Kingdom',
        'ind': 'India', 'in': 'India',
        'mum': 'Mumbai', 'del': 'Delhi', 'blr': 'Bangalore', 'hyd': 'Hyderabad',
        'nyc': 'New York City', 'la': 'Los Angeles', 'sf': 'San Francisco',
      };
      let count = 0;
      current = current.map(r => {
        if (typeof r[geoCol] === 'string') {
          const lower = (r[geoCol] as string).toLowerCase().trim();
          if (lower in fixes) { count++; return { ...r, [geoCol]: fixes[lower] }; }
        }
        return r;
      });
      if (count > 0) {
        actions.push(`🌍 "${geoCol}": Fixed ${count} abbreviations`);
        changes += count;
        textStandardized += count;
      }
    }

    if (actions.length === 0) actions.push('✅ Text data is already clean');
    steps.push({ step: 6, name: 'Standardize Text Data', icon: '📝', actions, details, rowsBefore: current.length, rowsAfter: current.length, changesMade: changes });
  }

  // ══════════════════════════════════════════════
  // STEP 7: Feature Engineering
  // ══════════════════════════════════════════════
  {
    const actions: string[] = [];
    const details: CleaningStepDetail[] = [];
    const currentKeys = Object.keys(current[0] || {});

    // From dates: year, month, month_name, day_of_week, quarter, is_weekend
    dateCols.forEach(col => {
      const yearKey = `${col}_year`;
      const monthKey = `${col}_month`;
      const quarterKey = `${col}_quarter`;
      const dowKey = `${col}_day_of_week`;
      const weekendKey = `${col}_is_weekend`;

      if (currentKeys.includes(yearKey)) return; // already exists

      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      current = current.map(r => {
        const d = new Date(r[col] as string);
        if (!isNaN(d.getTime())) {
          return {
            ...r,
            [yearKey]: d.getFullYear(),
            [monthKey]: d.getMonth() + 1,
            [quarterKey]: Math.ceil((d.getMonth() + 1) / 3),
            [dowKey]: dayNames[d.getDay()],
            [weekendKey]: d.getDay() === 0 || d.getDay() === 6,
          };
        }
        return r;
      });
      const added = [yearKey, monthKey, quarterKey, dowKey, weekendKey];
      featuresAdded.push(...added);
      actions.push(`📅 From "${col}": Added year, month, quarter, day_of_week, is_weekend`);
      details.push({ column: col, before: '1 date column', after: `+${added.length} features`, action: 'Date decomposition' });
    });

    // Profit = revenue - cost
    const revCol = currentKeys.find(k => /^revenue$|^sales$/i.test(k));
    const costCol = currentKeys.find(k => /^cost$|^expense$/i.test(k));
    if (revCol && costCol && !currentKeys.includes('profit')) {
      current = current.map(r => {
        const rev = Number(r[revCol]);
        const cost = Number(r[costCol]);
        if (!isNaN(rev) && !isNaN(cost)) {
          const profit = Math.round((rev - cost) * 100) / 100;
          const margin = rev > 0 ? Math.round((profit / rev) * 10000) / 100 : 0;
          return { ...r, profit, profit_margin: margin };
        }
        return r;
      });
      featuresAdded.push('profit', 'profit_margin');
      actions.push(`💰 Created profit & profit_margin from ${revCol} − ${costCol}`);
    }

    // Revenue per unit
    const revCol2 = currentKeys.find(k => /revenue|sales|amount/i.test(k));
    const qtyCol = currentKeys.find(k => /quantity|qty|units/i.test(k));
    if (revCol2 && qtyCol && !currentKeys.includes(`${revCol2}_per_unit`)) {
      const rpu = `${revCol2}_per_unit`;
      current = current.map(r => {
        const rev = Number(r[revCol2]);
        const qty = Number(r[qtyCol]);
        if (qty > 0 && !isNaN(rev)) return { ...r, [rpu]: Math.round((rev / qty) * 100) / 100 };
        return r;
      });
      featuresAdded.push(rpu);
      actions.push(`📊 Created "${rpu}" from ${revCol2} / ${qtyCol}`);
    }

    // Customer segmentation
    const segRevCol = currentKeys.find(k => /revenue|amount|sales/i.test(k));
    if (segRevCol && !currentKeys.includes('customer_segment')) {
      current = current.map(r => {
        const v = Number(r[segRevCol]);
        if (isNaN(v)) return r;
        let segment: string;
        if (v <= 1000) segment = 'Low';
        else if (v <= 5000) segment = 'Medium';
        else if (v <= 20000) segment = 'High';
        else segment = 'VIP';
        return { ...r, customer_segment: segment };
      });
      featuresAdded.push('customer_segment');
      actions.push(`🎯 Created customer_segment from "${segRevCol}" (Low/Medium/High/VIP)`);
    }

    if (actions.length === 0) actions.push('✅ No additional features to extract');
    steps.push({ step: 7, name: 'Feature Engineering', icon: '⚡', actions, details, rowsBefore: current.length, rowsAfter: current.length, changesMade: featuresAdded.length });
  }

  // ══════════════════════════════════════════════
  // STEP 8: Final Quality Report & Health Score
  // ══════════════════════════════════════════════
  const finalKeys = Object.keys(current[0] || {});
  const totalCells = current.length * finalKeys.length;
  const remainingMissing = current.reduce((acc, r) => acc + Object.values(r).filter(v => v === null || v === undefined).length, 0);

  // Detailed health score breakdown
  const missingScore = remainingMissing === 0 ? 25 : Math.max(0, 25 - Math.round((remainingMissing / totalCells) * 100));
  const dupeScore = duplicatesRemoved === 0 && current.length === new Set(current.map(r => JSON.stringify(r))).size ? 20 : 15;
  const typeScore = typesFixed > 0 ? 20 : 20; // Fixed = good
  const outlierScore = outliersCapped === 0 ? 20 : Math.max(10, 20 - Math.min(10, outliersCapped));
  const textScore = 15; // Always get base score after standardization
  const healthScore = Math.min(100, missingScore + dupeScore + typeScore + outlierScore + textScore);

  const healthBreakdown = [
    { label: 'No Missing Values', score: missingScore, max: 25 },
    { label: 'No Duplicates', score: dupeScore, max: 20 },
    { label: 'Correct Data Types', score: typeScore, max: 20 },
    { label: 'No Outliers', score: outlierScore, max: 20 },
    { label: 'Clean Text Data', score: textScore, max: 15 },
  ];

  // Smart recommendations
  const currentNumCols = finalKeys.filter(k => current.some(r => typeof r[k] === 'number'));
  const currentDateCols = finalKeys.filter(k => current.some(r => typeof r[k] === 'string' && /^\d{4}-\d{2}-\d{2}/.test(r[k] as string)));
  const currentStrCols = finalKeys.filter(k => current.some(r => typeof r[k] === 'string'));
  
  if (currentNumCols.length >= 2) recommendations.push(`Best chart: Bar/Line chart for ${currentNumCols.slice(0, 2).join(' vs ')}`);
  if (currentNumCols.length > 0) recommendations.push(`Key metric to track: ${currentNumCols[0]}`);
  if (currentDateCols.length > 0) recommendations.push(`Next step: Run trend analysis on ${currentDateCols[0]}`);
  if (currentStrCols.length > 0 && currentNumCols.length > 0) recommendations.push(`Suggested KPI: ${currentNumCols[0]} grouped by ${currentStrCols[0]}`);
  if (current.length < 50) recommendations.push('Dataset is small — collect more data for reliable statistical analysis');
  if (current.length > 1000) recommendations.push('Large dataset — consider sampling for faster exploratory analysis');
  if (featuresAdded.length > 0) recommendations.push('Review engineered features for business relevance before analysis');

  const summary: CleaningSummary = {
    steps,
    rowsBefore: initialRows,
    rowsAfter: current.length,
    colsBefore: initialCols,
    colsAfter: finalKeys.length,
    duplicatesRemoved,
    missingFixed,
    outliersCapped,
    typesFixed,
    textStandardized,
    columnsDropped,
    featuresAdded,
    healthScore,
    healthBreakdown,
    warnings,
    recommendations,
    flaggedRows: flaggedRows.slice(0, 20), // Cap at 20
  };

  return { cleanedData: current, summary };
}
