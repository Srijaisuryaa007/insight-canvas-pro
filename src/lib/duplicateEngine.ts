// Comprehensive Duplicate Detection & Removal Engine
// Handles all 8 duplicate scenarios with keep='first' strategy

export interface DuplicateReport {
  fullDuplicates: number;
  partialDuplicates: Record<string, number>;
  caseDuplicates: number;
  whitespaceDuplicates: number;
  typoDuplicates: { column: string; groups: { original: string; similar: string[]; score: number }[] }[];
  formatDuplicates: number;
  duplicateColumns: { col1: string; col2: string }[];
  nearDuplicates: { row1: number; row2: number; similarity: number }[];
  totalIssues: number;
  actions: string[];
  details: { column: string; before: string; after: string; action: string }[];
}

// Levenshtein distance for fuzzy matching
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function similarityScore(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 100;
  return Math.round((1 - levenshtein(a, b) / maxLen) * 100);
}

export function runFullDuplicateCheck(
  data: Record<string, unknown>[]
): {
  cleanedData: Record<string, unknown>[];
  report: DuplicateReport;
  rowsBefore: number;
  rowsAfter: number;
  colsBefore: number;
  colsAfter: number;
} {
  let current = data.map(r => ({ ...r }));
  const rowsBefore = current.length;
  const colsBefore = Object.keys(current[0] || {}).length;
  const actions: string[] = [];
  const details: DuplicateReport['details'] = [];
  let totalRemoved = 0;

  // ─── SCENARIO 1: Full Duplicate Rows ───
  const seenExact = new Set<string>();
  const beforeFull = current.length;
  current = current.filter(row => {
    const key = JSON.stringify(row);
    if (seenExact.has(key)) return false;
    seenExact.add(key);
    return true;
  });
  const fullDuplicates = beforeFull - current.length;
  totalRemoved += fullDuplicates;
  if (fullDuplicates > 0) {
    actions.push(`🔴 Full Duplicate Rows: ${fullDuplicates} rows removed (kept 1 original each)`);
    details.push({ column: '(all columns)', before: `${beforeFull} rows`, after: `${current.length} rows`, action: `Removed ${fullDuplicates} exact copies` });
  }

  // ─── SCENARIO 4: Whitespace Duplicates ───
  // Normalize whitespace BEFORE checking further duplicates
  const keys = Object.keys(current[0] || {});
  let whitespaceFixed = 0;
  keys.forEach(col => {
    current.forEach(row => {
      if (typeof row[col] === 'string') {
        const v = row[col] as string;
        const cleaned = v.trim().replace(/\s+/g, ' ');
        if (cleaned !== v) {
          row[col] = cleaned;
          whitespaceFixed++;
        }
      }
    });
  });
  // Now dedupe again after whitespace normalization
  const beforeWS = current.length;
  const seenWS = new Set<string>();
  current = current.filter(row => {
    const key = JSON.stringify(row);
    if (seenWS.has(key)) return false;
    seenWS.add(key);
    return true;
  });
  const whitespaceDuplicates = beforeWS - current.length;
  totalRemoved += whitespaceDuplicates;
  if (whitespaceDuplicates > 0 || whitespaceFixed > 0) {
    actions.push(`🟡 Whitespace Duplicates: Cleaned ${whitespaceFixed} values, removed ${whitespaceDuplicates} duplicate rows`);
    if (whitespaceDuplicates > 0) {
      details.push({ column: '(text columns)', before: `${whitespaceFixed} values with extra spaces`, after: `${whitespaceDuplicates} duplicate rows removed`, action: 'Strip + collapse spaces' });
    }
  }

  // ─── SCENARIO 3: Case Duplicates ───
  // Standardize case on string columns, then dedupe
  let caseFixed = 0;
  keys.forEach(col => {
    if (/id$|_id|^id|code|sku/i.test(col)) return; // skip IDs
    current.forEach(row => {
      if (typeof row[col] === 'string' && row[col] !== null) {
        const v = row[col] as string;
        // Title case for names/categories, lowercase for emails
        let standardized: string;
        if (/email/i.test(col)) {
          standardized = v.toLowerCase();
        } else {
          standardized = v.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        }
        if (standardized !== v) {
          row[col] = standardized;
          caseFixed++;
        }
      }
    });
  });
  const beforeCase = current.length;
  const seenCase = new Set<string>();
  current = current.filter(row => {
    const key = JSON.stringify(row);
    if (seenCase.has(key)) return false;
    seenCase.add(key);
    return true;
  });
  const caseDuplicates = beforeCase - current.length;
  totalRemoved += caseDuplicates;
  if (caseDuplicates > 0 || caseFixed > 0) {
    actions.push(`🟡 Case Duplicates: Standardized ${caseFixed} values, removed ${caseDuplicates} case-duplicate rows`);
    if (caseDuplicates > 0) {
      details.push({ column: '(text columns)', before: `${caseFixed} inconsistent case values`, after: `${caseDuplicates} case-duplicate rows removed`, action: 'Standardize case + dedupe' });
    }
  }

  // ─── SCENARIO 6: Format Duplicates (phone/date normalization) ───
  let formatFixed = 0;
  const phoneCol = keys.find(k => /phone|mobile|cell|tel/i.test(k));
  if (phoneCol) {
    current.forEach(row => {
      if (typeof row[phoneCol] === 'string') {
        const digits = (row[phoneCol] as string).replace(/[^0-9]/g, '');
        const normalized = digits.length > 10 ? digits.slice(-10) : digits;
        if (normalized !== row[phoneCol]) {
          row[phoneCol] = normalized;
          formatFixed++;
        }
      }
    });
  }
  const dateCols = keys.filter(k => /date|dob|joined|created|time/i.test(k));
  dateCols.forEach(col => {
    current.forEach(row => {
      if (typeof row[col] === 'string') {
        const d = new Date(row[col] as string);
        if (!isNaN(d.getTime())) {
          const iso = d.toISOString().split('T')[0];
          if (iso !== row[col]) {
            row[col] = iso;
            formatFixed++;
          }
        }
      }
    });
  });
  const beforeFormat = current.length;
  const seenFormat = new Set<string>();
  current = current.filter(row => {
    const key = JSON.stringify(row);
    if (seenFormat.has(key)) return false;
    seenFormat.add(key);
    return true;
  });
  const formatDuplicates = beforeFormat - current.length;
  totalRemoved += formatDuplicates;
  if (formatDuplicates > 0 || formatFixed > 0) {
    actions.push(`🟡 Format Duplicates: Standardized ${formatFixed} values (phone/date), removed ${formatDuplicates} format-duplicate rows`);
    if (formatDuplicates > 0) {
      details.push({ column: phoneCol || dateCols[0] || '(format cols)', before: `${formatFixed} format variations`, after: `${formatDuplicates} format-duplicate rows removed`, action: 'Normalize formats + dedupe' });
    }
  }

  // ─── SCENARIO 2: Partial Duplicates (same key column, different values) ───
  const partialDuplicates: Record<string, number> = {};
  // Only match actual key/ID columns — NOT generic "name" columns like "city_name", "department_name"
  const keyCols = keys.filter(k => {
    const lower = k.toLowerCase();
    // Exact matches for common unique identifiers
    if (/^(email|phone|mobile|cell|tel|username|account_id|emp_id|employee_id|student_id|roll_no|ssn|passport)$/i.test(k)) return true;
    // Only match "id" if it's standalone or a clear primary key pattern
    if (/^id$/i.test(k) || /^[a-z]+_id$/i.test(k)) return true;
    // Match "email" anywhere in name
    if (/email/i.test(k)) return true;
    // DON'T match generic columns that happen to contain "name" (like city_name, department_name)
    // Only match if column IS "name" standalone or "first_name", "last_name", "full_name"
    if (/^(name|first_name|last_name|full_name|display_name)$/i.test(k)) return true;
    return false;
  }).filter(k => current.some(r => typeof r[k] === 'string' || typeof r[k] === 'number'));
  keyCols.forEach(col => {
    const beforePartial = current.length;
    const seen = new Set<string>();
    current = current.filter(row => {
      const val = String(row[col] ?? '').toLowerCase().trim();
      if (val === '') return true;
      if (seen.has(val)) return false;
      seen.add(val);
      return true;
    });
    const removed = beforePartial - current.length;
    if (removed > 0) {
      partialDuplicates[col] = removed;
      totalRemoved += removed;
      actions.push(`🟡 Partial Duplicates (${col}): ${removed} rows removed (subset=['${col}'], keep='first')`);
      details.push({ column: col, before: `${beforePartial} rows`, after: `${current.length} rows`, action: `Removed ${removed} partial dupes on ${col}` });
    }
  });

  // ─── SCENARIO 5: Typo Duplicates (fuzzy matching on categorical columns) ───
  const typoDuplicates: DuplicateReport['typoDuplicates'] = [];
  const categoricalCols = keys.filter(k =>
    !(/id$|_id|^id|email|phone|code|sku/i.test(k)) &&
    current.some(r => typeof r[k] === 'string')
  );
  categoricalCols.forEach(col => {
    const uniqueVals = [...new Set(current.map(r => r[col]).filter(v => typeof v === 'string') as string[])];
    if (uniqueVals.length < 2 || uniqueVals.length > 200) return; // skip if too many

    const groups: { original: string; similar: string[]; score: number }[] = [];
    const checked = new Set<string>();

    for (const val of uniqueVals) {
      if (checked.has(val)) continue;
      const similar: string[] = [];
      let bestScore = 0;
      for (const other of uniqueVals) {
        if (other === val || checked.has(other)) continue;
        const score = similarityScore(val.toLowerCase(), other.toLowerCase());
        if (score >= 85 && score < 100) {
          similar.push(other);
          bestScore = Math.max(bestScore, score);
          checked.add(other);
        }
      }
      if (similar.length > 0) {
        groups.push({ original: val, similar, score: bestScore });
        checked.add(val);
        // Auto-fix: replace similar values with the original (most frequent)
        const freqMap: Record<string, number> = {};
        [val, ...similar].forEach(v => {
          freqMap[v] = current.filter(r => r[col] === v).length;
        });
        const canonical = Object.entries(freqMap).sort((a, b) => b[1] - a[1])[0][0];
        similar.forEach(s => {
          if (s !== canonical) {
            current.forEach(row => {
              if (row[col] === s) row[col] = canonical;
            });
          }
        });
        if (val !== canonical) {
          current.forEach(row => {
            if (row[col] === val) row[col] = canonical;
          });
        }
      }
    }
    if (groups.length > 0) {
      typoDuplicates.push({ column: col, groups });
      actions.push(`🟡 Typo Duplicates in \"${col}\": ${groups.length} groups merged (fuzzy match ≥85%)`);
      details.push({ column: col, before: `${groups.reduce((a, g) => a + g.similar.length, 0)} typo variations`, after: `Merged to canonical values`, action: `${groups.length} typo groups fixed` });
    }
  });
  // Dedupe again after typo fixes
  const beforeTypo = current.length;
  const seenTypo = new Set<string>();
  current = current.filter(row => {
    const key = JSON.stringify(row);
    if (seenTypo.has(key)) return false;
    seenTypo.add(key);
    return true;
  });
  const typoDeduped = beforeTypo - current.length;
  totalRemoved += typoDeduped;

  // ─── SCENARIO 7: Duplicate Columns (same data, different name) ───
  const duplicateColumns: { col1: string; col2: string }[] = [];
  const finalKeys = Object.keys(current[0] || {});
  const colsToDrop: string[] = [];
  for (let i = 0; i < finalKeys.length; i++) {
    for (let j = i + 1; j < finalKeys.length; j++) {
      const col1 = finalKeys[i], col2 = finalKeys[j];
      if (colsToDrop.includes(col2)) continue;
      const allMatch = current.every(r => String(r[col1] ?? '') === String(r[col2] ?? ''));
      if (allMatch && current.length > 0) {
        duplicateColumns.push({ col1, col2 });
        colsToDrop.push(col2);
        actions.push(`🟡 Duplicate Columns: \"${col1}\" = \"${col2}\" → dropping \"${col2}\"`);
        details.push({ column: col2, before: `Identical to \"${col1}\"`, after: 'DROPPED', action: 'Duplicate column removed' });
      }
    }
  }
  // Also check high correlation (>0.95) for numeric columns
  const numCols = finalKeys.filter(k => current.some(r => typeof r[k] === 'number'));
  for (let i = 0; i < numCols.length; i++) {
    for (let j = i + 1; j < numCols.length; j++) {
      if (colsToDrop.includes(numCols[j]) || duplicateColumns.some(d => d.col1 === numCols[i] && d.col2 === numCols[j])) continue;
      const vals1 = current.map(r => Number(r[numCols[i]] ?? 0));
      const vals2 = current.map(r => Number(r[numCols[j]] ?? 0));
      const corr = pearsonCorrelation(vals1, vals2);
      if (Math.abs(corr) > 0.95) {
        actions.push(`⚠️ High Correlation: \"${numCols[i]}\" ↔ \"${numCols[j]}\" (r=${corr.toFixed(3)}) — flagged, not dropped`);
      }
    }
  }
  if (colsToDrop.length > 0) {
    current = current.map(r => {
      const newRow = { ...r };
      colsToDrop.forEach(c => delete newRow[c]);
      return newRow;
    });
  }

  // ─── SCENARIO 8: Near Duplicate Rows (≥90% similar) ───
  const nearDuplicates: { row1: number; row2: number; similarity: number }[] = [];
  // Only check if dataset is small enough (avoid O(n²) for large data)
  if (current.length <= 500) {
    const strRows = current.map(r => Object.values(r).map(String).join(' '));
    for (let i = 0; i < strRows.length && nearDuplicates.length < 20; i++) {
      for (let j = i + 1; j < strRows.length && nearDuplicates.length < 20; j++) {
        const score = similarityScore(strRows[i], strRows[j]);
        if (score >= 90 && score < 100) {
          nearDuplicates.push({ row1: i, row2: j, similarity: score });
        }
      }
    }
    if (nearDuplicates.length > 0) {
      actions.push(`🟠 Near Duplicate Rows: ${nearDuplicates.length} pairs found (≥90% similar) — flagged for review, NOT auto-removed`);
    }
  } else {
    actions.push(`ℹ️ Near-duplicate check skipped (dataset > 500 rows — use sampling for large datasets)`);
  }

  if (totalRemoved === 0 && duplicateColumns.length === 0 && typoDuplicates.length === 0) {
    actions.push('✅ No duplicate issues found');
  }

  const colsAfter = Object.keys(current[0] || {}).length;

  return {
    cleanedData: current,
    report: {
      fullDuplicates,
      partialDuplicates,
      caseDuplicates,
      whitespaceDuplicates,
      typoDuplicates,
      formatDuplicates,
      duplicateColumns,
      nearDuplicates,
      totalIssues: fullDuplicates + Object.values(partialDuplicates).reduce((a, b) => a + b, 0) + caseDuplicates + whitespaceDuplicates + formatDuplicates + typoDuplicates.reduce((a, t) => a + t.groups.length, 0) + duplicateColumns.length + nearDuplicates.length,
      actions,
      details,
    },
    rowsBefore,
    rowsAfter: current.length,
    colsBefore,
    colsAfter,
  };
}

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 3) return 0;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const xi = x[i] - mx, yi = y[i] - my;
    num += xi * yi;
    dx += xi * xi;
    dy += yi * yi;
  }
  const denom = Math.sqrt(dx * dy);
  return denom === 0 ? 0 : num / denom;
}
