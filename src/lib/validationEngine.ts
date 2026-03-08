// Comprehensive Data Validation Engine
// Covers: Data Validation, Consistency, Date Quality, Numeric Quality,
// Distribution, Uniqueness, Completeness, Column Names, Business Rules, Encoding, Text Quality

export interface ValidationIssue {
  category: string;
  column: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  count: number;
  percentage: number;
  description: string;
  autoFixable: boolean;
}

export interface ValidationReport {
  issues: ValidationIssue[];
  completeness: { overall: number; perColumn: Record<string, number>; perRow: number[]; lowRows: number };
  distribution: { column: string; skewness: number; kurtosis: number; dominantValue?: string; dominantPct?: number; rareCategories?: number }[];
  uniqueness: { column: string; isUnique: boolean; duplicateCount: number }[];
  columnNameIssues: { original: string; fixed: string; reason: string }[];
  letterGrade: string;
  validationScore: number;
}

// ═══════════════════════════════════════════
// SECTION 6: DATA VALIDATION
// ═══════════════════════════════════════════
function validateData(data: Record<string, unknown>[], keys: string[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const total = data.length;

  keys.forEach(col => {
    const values = data.map(r => r[col]).filter(v => v !== null && v !== undefined && v !== '');

    // Email validation
    if (/email/i.test(col)) {
      const invalid = values.filter(v => typeof v === 'string' && !/^[\w.+-]+@[\w-]+\.[a-z]{2,}$/i.test(v as string));
      if (invalid.length > 0) {
        issues.push({ category: 'Validation', column: col, type: 'invalid_email', severity: invalid.length > total * 0.1 ? 'high' : 'medium', count: invalid.length, percentage: Math.round((invalid.length / total) * 100), description: `${invalid.length} invalid email formats`, autoFixable: false });
      }
    }

    // Phone validation (expect 10+ digits)
    if (/phone|mobile|cell|tel/i.test(col)) {
      const invalid = values.filter(v => {
        const digits = String(v).replace(/[^0-9]/g, '');
        return digits.length < 10 || digits.length > 15;
      });
      if (invalid.length > 0) {
        issues.push({ category: 'Validation', column: col, type: 'invalid_phone', severity: 'medium', count: invalid.length, percentage: Math.round((invalid.length / total) * 100), description: `${invalid.length} invalid phone numbers (not 10-15 digits)`, autoFixable: false });
      }
    }

    // Age range (0-120)
    if (/^age$|_age$/i.test(col)) {
      const outOfRange = values.filter(v => typeof v === 'number' && (v < 0 || v > 120));
      if (outOfRange.length > 0) {
        issues.push({ category: 'Validation', column: col, type: 'invalid_age', severity: 'high', count: outOfRange.length, percentage: Math.round((outOfRange.length / total) * 100), description: `${outOfRange.length} ages outside 0-120 range`, autoFixable: false });
      }
    }

    // Percentage/Score range (0-100)
    if (/percent|pct|score|rate|grade_pct/i.test(col)) {
      const outOfRange = values.filter(v => typeof v === 'number' && (v < 0 || v > 100));
      if (outOfRange.length > 0) {
        issues.push({ category: 'Validation', column: col, type: 'invalid_percentage', severity: 'medium', count: outOfRange.length, percentage: Math.round((outOfRange.length / total) * 100), description: `${outOfRange.length} values outside 0-100% range`, autoFixable: false });
      }
    }

    // Negative values in positive-only columns
    if (/revenue|sales|price|cost|amount|quantity|qty|units|salary|wage|income/i.test(col)) {
      const negatives = values.filter(v => typeof v === 'number' && v < 0);
      if (negatives.length > 0) {
        issues.push({ category: 'Validation', column: col, type: 'negative_value', severity: 'high', count: negatives.length, percentage: Math.round((negatives.length / total) * 100), description: `${negatives.length} negative values in "${col}"`, autoFixable: false });
      }
    }

    // Future dates in historical columns
    if (/date|dob|birth|joined|created|started|hired/i.test(col)) {
      const now = Date.now();
      const future = values.filter(v => {
        if (typeof v !== 'string') return false;
        const d = new Date(v as string);
        return !isNaN(d.getTime()) && d.getTime() > now;
      });
      if (future.length > 0) {
        issues.push({ category: 'Validation', column: col, type: 'future_date', severity: 'medium', count: future.length, percentage: Math.round((future.length / total) * 100), description: `${future.length} future dates in historical column`, autoFixable: false });
      }
    }

    // URL validation
    if (/url|link|website|href/i.test(col)) {
      const invalid = values.filter(v => typeof v === 'string' && !/^https?:\/\/.+\..+/i.test(v as string));
      if (invalid.length > 0) {
        issues.push({ category: 'Validation', column: col, type: 'invalid_url', severity: 'low', count: invalid.length, percentage: Math.round((invalid.length / total) * 100), description: `${invalid.length} invalid URLs`, autoFixable: false });
      }
    }

    // Gender validation
    if (/^gender$|^sex$/i.test(col)) {
      const validGenders = new Set(['male', 'female', 'other', 'm', 'f', 'o', 'non-binary', 'prefer not to say']);
      const invalid = values.filter(v => typeof v === 'string' && !validGenders.has((v as string).toLowerCase().trim()));
      if (invalid.length > 0) {
        issues.push({ category: 'Validation', column: col, type: 'invalid_gender', severity: 'low', count: invalid.length, percentage: Math.round((invalid.length / total) * 100), description: `${invalid.length} non-standard gender values`, autoFixable: false });
      }
    }

    // ID uniqueness check
    if (/^id$|_id$|^.*_id$/i.test(col)) {
      const vals = values.map(String);
      const unique = new Set(vals);
      if (unique.size < vals.length) {
        const dupes = vals.length - unique.size;
        issues.push({ category: 'Validation', column: col, type: 'non_unique_id', severity: 'high', count: dupes, percentage: Math.round((dupes / total) * 100), description: `ID column "${col}" has ${dupes} non-unique values`, autoFixable: false });
      }
    }

    // Zip/Postal code
    if (/zip|postal|pincode|pin_code/i.test(col)) {
      const invalid = values.filter(v => {
        const s = String(v).trim();
        return !/^\d{5,6}(-\d{4})?$/.test(s) && !/^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i.test(s);
      });
      if (invalid.length > 0) {
        issues.push({ category: 'Validation', column: col, type: 'invalid_zipcode', severity: 'low', count: invalid.length, percentage: Math.round((invalid.length / total) * 100), description: `${invalid.length} invalid zip/postal codes`, autoFixable: false });
      }
    }
  });

  return issues;
}

// ═══════════════════════════════════════════
// SECTION 7 (extended): TEXT QUALITY
// ═══════════════════════════════════════════
function checkTextQuality(data: Record<string, unknown>[], strCols: string[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const total = data.length;

  strCols.forEach(col => {
    const values = data.map(r => r[col]).filter(v => typeof v === 'string') as string[];
    if (values.length === 0) return;

    // Special characters in name fields
    if (/name/i.test(col)) {
      const withSpecial = values.filter(v => /[^a-zA-Z\s.\-'àáâãäåèéêëìíîïòóôõöùúûüýÿñ]/i.test(v));
      if (withSpecial.length > 0) {
        issues.push({ category: 'Text Quality', column: col, type: 'special_chars_in_name', severity: 'low', count: withSpecial.length, percentage: Math.round((withSpecial.length / total) * 100), description: `${withSpecial.length} name values with special characters`, autoFixable: true });
      }
      // Numbers in name columns
      const withNums = values.filter(v => /\d/.test(v));
      if (withNums.length > 0) {
        issues.push({ category: 'Text Quality', column: col, type: 'numbers_in_name', severity: 'medium', count: withNums.length, percentage: Math.round((withNums.length / total) * 100), description: `${withNums.length} name values contain numbers`, autoFixable: false });
      }
    }

    // Emoji detection
    const withEmoji = values.filter(v => /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(v));
    if (withEmoji.length > 0) {
      issues.push({ category: 'Text Quality', column: col, type: 'emoji_in_data', severity: 'low', count: withEmoji.length, percentage: Math.round((withEmoji.length / total) * 100), description: `${withEmoji.length} values contain emoji`, autoFixable: true });
    }

    // HTML tags
    const withHTML = values.filter(v => /<[^>]+>/.test(v));
    if (withHTML.length > 0) {
      issues.push({ category: 'Text Quality', column: col, type: 'html_tags', severity: 'medium', count: withHTML.length, percentage: Math.round((withHTML.length / total) * 100), description: `${withHTML.length} values contain HTML tags`, autoFixable: true });
    }

    // Encoding errors (common mojibake patterns)
    const withEncoding = values.filter(v => /â€™|â€œ|â€|Ã©|Ã¨|Ã¼|Ã¶|Ã±|â€¢|Â |â€"/.test(v));
    if (withEncoding.length > 0) {
      issues.push({ category: 'Text Quality', column: col, type: 'encoding_error', severity: 'high', count: withEncoding.length, percentage: Math.round((withEncoding.length / total) * 100), description: `${withEncoding.length} values with encoding errors (mojibake)`, autoFixable: true });
    }

    // Invisible/hidden characters
    const withInvisible = values.filter(v => /[\u200B-\u200F\u2028-\u202F\uFEFF\u00AD]/.test(v));
    if (withInvisible.length > 0) {
      issues.push({ category: 'Text Quality', column: col, type: 'invisible_chars', severity: 'medium', count: withInvisible.length, percentage: Math.round((withInvisible.length / total) * 100), description: `${withInvisible.length} values with invisible/hidden characters`, autoFixable: true });
    }
  });

  return issues;
}

// ═══════════════════════════════════════════
// SECTION 8: CONSISTENCY CHECK
// ═══════════════════════════════════════════
function checkConsistency(data: Record<string, unknown>[], keys: string[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const total = data.length;

  // End date before start date
  const startCol = keys.find(k => /start_date|begin_date|from_date|hired|joined/i.test(k));
  const endCol = keys.find(k => /end_date|finish_date|to_date|left|resigned/i.test(k));
  if (startCol && endCol) {
    let inconsistent = 0;
    data.forEach(r => {
      const s = new Date(r[startCol] as string);
      const e = new Date(r[endCol] as string);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e < s) inconsistent++;
    });
    if (inconsistent > 0) {
      issues.push({ category: 'Consistency', column: `${startCol} / ${endCol}`, type: 'end_before_start', severity: 'high', count: inconsistent, percentage: Math.round((inconsistent / total) * 100), description: `${inconsistent} rows where end date is before start date`, autoFixable: false });
    }
  }

  // Total != sum of parts (look for "total" column)
  const totalCol = keys.find(k => /^total$/i.test(k));
  if (totalCol) {
    const numKeys = keys.filter(k => k !== totalCol && data.some(r => typeof r[k] === 'number'));
    if (numKeys.length >= 2) {
      let mismatch = 0;
      data.forEach(r => {
        const t = Number(r[totalCol]);
        if (isNaN(t)) return;
        const sum = numKeys.reduce((acc, k) => acc + (typeof r[k] === 'number' ? (r[k] as number) : 0), 0);
        if (Math.abs(t - sum) > 0.01 * Math.abs(t) && Math.abs(t - sum) > 1) mismatch++;
      });
      if (mismatch > 0) {
        issues.push({ category: 'Consistency', column: totalCol, type: 'total_mismatch', severity: 'medium', count: mismatch, percentage: Math.round((mismatch / total) * 100), description: `${mismatch} rows where total doesn't match sum of parts`, autoFixable: false });
      }
    }
  }

  // DOB vs age consistency
  const dobCol = keys.find(k => /dob|birth_date|date_of_birth/i.test(k));
  const ageCol = keys.find(k => /^age$/i.test(k));
  if (dobCol && ageCol) {
    let mismatch = 0;
    const now = new Date();
    data.forEach(r => {
      const dob = new Date(r[dobCol] as string);
      const age = Number(r[ageCol]);
      if (isNaN(dob.getTime()) || isNaN(age)) return;
      const calcAge = now.getFullYear() - dob.getFullYear();
      if (Math.abs(calcAge - age) > 1) mismatch++;
    });
    if (mismatch > 0) {
      issues.push({ category: 'Consistency', column: `${dobCol} / ${ageCol}`, type: 'age_dob_mismatch', severity: 'medium', count: mismatch, percentage: Math.round((mismatch / total) * 100), description: `${mismatch} rows where age doesn't match DOB`, autoFixable: false });
    }
  }

  return issues;
}

// ═══════════════════════════════════════════
// SECTION 9: DATE QUALITY
// ═══════════════════════════════════════════
function checkDateQuality(data: Record<string, unknown>[], dateCols: string[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const total = data.length;

  dateCols.forEach(col => {
    const values = data.map(r => r[col]).filter(v => typeof v === 'string') as string[];
    if (values.length === 0) return;

    // Dates before 1900
    const ancient = values.filter(v => {
      const d = new Date(v);
      return !isNaN(d.getTime()) && d.getFullYear() < 1900;
    });
    if (ancient.length > 0) {
      issues.push({ category: 'Date Quality', column: col, type: 'date_before_1900', severity: 'medium', count: ancient.length, percentage: Math.round((ancient.length / total) * 100), description: `${ancient.length} dates before year 1900`, autoFixable: false });
    }

    // Invalid dates (unparseable)
    const unparseable = values.filter(v => {
      const d = new Date(v);
      return isNaN(d.getTime());
    });
    if (unparseable.length > 0) {
      issues.push({ category: 'Date Quality', column: col, type: 'invalid_date', severity: 'high', count: unparseable.length, percentage: Math.round((unparseable.length / total) * 100), description: `${unparseable.length} unparseable date values`, autoFixable: false });
    }

    // Inconsistent date formats
    const formats = new Set<string>();
    values.slice(0, 50).forEach(v => {
      if (/^\d{4}-\d{2}-\d{2}/.test(v)) formats.add('YYYY-MM-DD');
      else if (/^\d{2}\/\d{2}\/\d{4}/.test(v)) formats.add('MM/DD/YYYY');
      else if (/^\d{2}-\d{2}-\d{4}/.test(v)) formats.add('DD-MM-YYYY');
      else if (/[A-Za-z]+\s\d/.test(v)) formats.add('Month D, YYYY');
      else formats.add('other');
    });
    if (formats.size > 1) {
      issues.push({ category: 'Date Quality', column: col, type: 'inconsistent_date_format', severity: 'medium', count: values.length, percentage: 100, description: `Mixed date formats detected: ${[...formats].join(', ')}`, autoFixable: true });
    }
  });

  return issues;
}

// ═══════════════════════════════════════════
// SECTION 10: NUMERIC QUALITY
// ═══════════════════════════════════════════
function checkNumericQuality(data: Record<string, unknown>[], numCols: string[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const total = data.length;

  numCols.forEach(col => {
    const values = data.map(r => r[col]).filter(v => typeof v === 'number') as number[];
    if (values.length === 0) return;

    // Infinity values
    const infinities = values.filter(v => !isFinite(v));
    if (infinities.length > 0) {
      issues.push({ category: 'Numeric Quality', column: col, type: 'infinity_value', severity: 'high', count: infinities.length, percentage: Math.round((infinities.length / total) * 100), description: `${infinities.length} Infinity values`, autoFixable: true });
    }

    // Excessive precision (>6 decimal places)
    const highPrecision = values.filter(v => {
      const s = String(v);
      const dec = s.split('.')[1];
      return dec && dec.length > 6;
    });
    if (highPrecision.length > 0) {
      issues.push({ category: 'Numeric Quality', column: col, type: 'excessive_precision', severity: 'low', count: highPrecision.length, percentage: Math.round((highPrecision.length / total) * 100), description: `${highPrecision.length} values with excessive decimal precision (>6 places)`, autoFixable: true });
    }

    // Integer columns with decimals
    if (/id$|_id|count|quantity|qty|units|age|year/i.test(col)) {
      const withDecimals = values.filter(v => v !== Math.floor(v));
      if (withDecimals.length > 0) {
        issues.push({ category: 'Numeric Quality', column: col, type: 'unexpected_decimals', severity: 'medium', count: withDecimals.length, percentage: Math.round((withDecimals.length / total) * 100), description: `${withDecimals.length} decimal values in integer-expected column`, autoFixable: true });
      }
    }

    // Scientific notation detection (very large or very small)
    const scientific = values.filter(v => Math.abs(v) > 1e10 || (Math.abs(v) > 0 && Math.abs(v) < 1e-6));
    if (scientific.length > 0 && scientific.length < values.length * 0.5) {
      issues.push({ category: 'Numeric Quality', column: col, type: 'scientific_notation', severity: 'low', count: scientific.length, percentage: Math.round((scientific.length / total) * 100), description: `${scientific.length} values in scientific notation range`, autoFixable: false });
    }
  });

  return issues;
}

// ═══════════════════════════════════════════
// SECTION 11: DISTRIBUTION CHECK
// ═══════════════════════════════════════════
function checkDistribution(data: Record<string, unknown>[], numCols: string[], strCols: string[]): ValidationReport['distribution'] {
  const results: ValidationReport['distribution'] = [];

  numCols.forEach(col => {
    const values = data.map(r => r[col]).filter(v => typeof v === 'number' && isFinite(v as number)) as number[];
    if (values.length < 10) return;

    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((a, v) => a + (v - mean) ** 2, 0) / n;
    const std = Math.sqrt(variance);
    if (std === 0) return;

    // Skewness
    const skewness = values.reduce((a, v) => a + ((v - mean) / std) ** 3, 0) / n;
    // Kurtosis (excess)
    const kurtosis = values.reduce((a, v) => a + ((v - mean) / std) ** 4, 0) / n - 3;

    results.push({ column: col, skewness: Math.round(skewness * 100) / 100, kurtosis: Math.round(kurtosis * 100) / 100 });
  });

  // Categorical: class imbalance, dominant value, rare categories
  strCols.forEach(col => {
    const values = data.map(r => r[col]).filter(v => typeof v === 'string') as string[];
    if (values.length === 0) return;
    const freq: Record<string, number> = {};
    values.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    const topPct = Math.round((sorted[0][1] / values.length) * 100);
    const rareCount = sorted.filter(([, c]) => c / values.length < 0.01).length;

    if (topPct > 80 || rareCount > 0) {
      results.push({
        column: col, skewness: 0, kurtosis: 0,
        dominantValue: sorted[0][0], dominantPct: topPct,
        rareCategories: rareCount,
      });
    }
  });

  return results;
}

// ═══════════════════════════════════════════
// SECTION 12: UNIQUENESS CHECK
// ═══════════════════════════════════════════
function checkUniqueness(data: Record<string, unknown>[], keys: string[]): ValidationReport['uniqueness'] {
  const results: ValidationReport['uniqueness'] = [];
  const expectedUnique = keys.filter(k => /^id$|_id$|email|phone|username|ssn|passport/i.test(k));

  expectedUnique.forEach(col => {
    const values = data.map(r => r[col]).filter(v => v !== null && v !== undefined && v !== '').map(String);
    const unique = new Set(values);
    results.push({ column: col, isUnique: unique.size === values.length, duplicateCount: values.length - unique.size });
  });

  return results;
}

// ═══════════════════════════════════════════
// SECTION 13: COMPLETENESS SCORE
// ═══════════════════════════════════════════
function checkCompleteness(data: Record<string, unknown>[], keys: string[]): ValidationReport['completeness'] {
  const total = data.length;
  const perColumn: Record<string, number> = {};
  let totalFilled = 0;
  const totalCells = total * keys.length;

  keys.forEach(col => {
    const filled = data.filter(r => r[col] !== null && r[col] !== undefined && r[col] !== '').length;
    perColumn[col] = Math.round((filled / total) * 100);
    totalFilled += filled;
  });

  const perRow = data.map(r => {
    const filled = keys.filter(k => r[k] !== null && r[k] !== undefined && r[k] !== '').length;
    return Math.round((filled / keys.length) * 100);
  });

  const lowRows = perRow.filter(p => p < 50).length;

  return { overall: Math.round((totalFilled / totalCells) * 100), perColumn, perRow, lowRows };
}

// ═══════════════════════════════════════════
// SECTION 14: COLUMN NAME QUALITY
// ═══════════════════════════════════════════
function checkColumnNames(keys: string[]): ValidationReport['columnNameIssues'] {
  const issues: ValidationReport['columnNameIssues'] = [];

  keys.forEach(col => {
    let fixed = col;
    const reasons: string[] = [];

    // Spaces → underscore
    if (/\s/.test(fixed)) { fixed = fixed.replace(/\s+/g, '_'); reasons.push('spaces → underscores'); }
    // Special characters
    if (/[^a-zA-Z0-9_]/.test(fixed)) { fixed = fixed.replace(/[^a-zA-Z0-9_]/g, ''); reasons.push('removed special chars'); }
    // To lowercase snake_case
    if (/[A-Z]/.test(fixed)) {
      fixed = fixed.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '').replace(/__+/g, '_');
      reasons.push('converted to snake_case');
    }
    // Unnamed columns
    if (/^unnamed|^column_?\d|^col_?\d|^field_?\d/i.test(col)) { reasons.push('unnamed column detected'); }
    // Too long
    if (fixed.length > 50) { fixed = fixed.substring(0, 50); reasons.push('truncated (>50 chars)'); }

    if (reasons.length > 0 && fixed !== col) {
      issues.push({ original: col, fixed, reason: reasons.join(', ') });
    }
  });

  // Duplicate names after normalization
  const normalized = keys.map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const seen = new Map<string, string>();
  normalized.forEach((n, i) => {
    if (seen.has(n) && !issues.some(iss => iss.original === keys[i])) {
      issues.push({ original: keys[i], fixed: `${keys[i]}_2`, reason: `duplicate of "${seen.get(n)}" after normalization` });
    }
    seen.set(n, keys[i]);
  });

  return issues;
}

// ═══════════════════════════════════════════
// SECTION 16: BUSINESS RULES
// ═══════════════════════════════════════════
function checkBusinessRules(data: Record<string, unknown>[], keys: string[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const total = data.length;

  // Discount > 100%
  const discountCol = keys.find(k => /discount/i.test(k));
  if (discountCol) {
    const over100 = data.filter(r => typeof r[discountCol] === 'number' && (r[discountCol] as number) > 100).length;
    if (over100 > 0) {
      issues.push({ category: 'Business Rules', column: discountCol, type: 'discount_over_100', severity: 'high', count: over100, percentage: Math.round((over100 / total) * 100), description: `${over100} rows with discount > 100%`, autoFixable: false });
    }
  }

  // Quantity must be whole number
  const qtyCol = keys.find(k => /quantity|qty|units/i.test(k));
  if (qtyCol) {
    const fractional = data.filter(r => typeof r[qtyCol] === 'number' && (r[qtyCol] as number) !== Math.floor(r[qtyCol] as number)).length;
    if (fractional > 0) {
      issues.push({ category: 'Business Rules', column: qtyCol, type: 'fractional_quantity', severity: 'medium', count: fractional, percentage: Math.round((fractional / total) * 100), description: `${fractional} rows with fractional quantity`, autoFixable: true });
    }
  }

  // Revenue/Profit sign check
  const revCol = keys.find(k => /^revenue$|^sales$/i.test(k));
  const costCol = keys.find(k => /^cost$|^expense$/i.test(k));
  const profitCol = keys.find(k => /^profit$/i.test(k));
  if (revCol && costCol && profitCol) {
    let mismatch = 0;
    data.forEach(r => {
      const rev = Number(r[revCol]);
      const cost = Number(r[costCol]);
      const profit = Number(r[profitCol]);
      if (!isNaN(rev) && !isNaN(cost) && !isNaN(profit)) {
        if (Math.abs(profit - (rev - cost)) > 1) mismatch++;
      }
    });
    if (mismatch > 0) {
      issues.push({ category: 'Business Rules', column: profitCol, type: 'profit_mismatch', severity: 'high', count: mismatch, percentage: Math.round((mismatch / total) * 100), description: `${mismatch} rows where profit ≠ revenue - cost`, autoFixable: true });
    }
  }

  return issues;
}

// ═══════════════════════════════════════════
// SECTION 17: ENCODING QUALITY (auto-fix)
// ═══════════════════════════════════════════
const ENCODING_FIXES: Record<string, string> = {
  'â€™': "'", 'â€˜': "'", 'â€œ': '"', 'â€\u009d': '"',
  'â€"': '—', 'â€¢': '•', 'Â ': ' ',
  'Ã©': 'é', 'Ã¨': 'è', 'Ã¼': 'ü', 'Ã¶': 'ö', 'Ã±': 'ñ',
  'Ã ': 'à', 'Ã¡': 'á', 'Ã¢': 'â', 'Ã£': 'ã', 'Ã¤': 'ä',
};

export function fixEncoding(value: string): string {
  let result = value;
  for (const [bad, good] of Object.entries(ENCODING_FIXES)) {
    result = result.split(bad).join(good);
  }
  // Remove invisible characters
  result = result.replace(/[\u200B-\u200F\u2028-\u202F\uFEFF\u00AD]/g, '');
  return result;
}

export function fixTextQuality(value: string, colName: string): string {
  let result = value;
  // Strip HTML
  result = result.replace(/<[^>]+>/g, '');
  // Remove emoji
  result = result.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
  // Fix encoding
  result = fixEncoding(result);
  // Clean name fields
  if (/name/i.test(colName)) {
    result = result.replace(/[^a-zA-Z\s.\-'àáâãäåèéêëìíîïòóôõöùúûüýÿñ]/gi, '');
  }
  return result.trim();
}

// ═══════════════════════════════════════════
// MASTER: Run All Validations
// ═══════════════════════════════════════════
export function runFullValidation(
  data: Record<string, unknown>[]
): ValidationReport {
  if (!data || data.length === 0) {
    return {
      issues: [], completeness: { overall: 0, perColumn: {}, perRow: [], lowRows: 0 },
      distribution: [], uniqueness: [], columnNameIssues: [], letterGrade: 'D', validationScore: 0,
    };
  }

  const keys = Object.keys(data[0]);
  const numCols = keys.filter(k => data.some(r => typeof r[k] === 'number'));
  const strCols = keys.filter(k => data.some(r => typeof r[k] === 'string'));
  const dateCols = keys.filter(k => {
    const sample = data.find(r => typeof r[k] === 'string');
    return sample && /^\d{4}-\d{2}-\d{2}|date|dob|time|joined|created/i.test(k + String(sample[k]));
  });

  const allIssues = [
    ...validateData(data, keys),
    ...checkTextQuality(data, strCols),
    ...checkConsistency(data, keys),
    ...checkDateQuality(data, dateCols),
    ...checkNumericQuality(data, numCols),
    ...checkBusinessRules(data, keys),
  ];

  const completeness = checkCompleteness(data, keys);
  const distribution = checkDistribution(data, numCols, strCols);
  const uniqueness = checkUniqueness(data, keys);
  const columnNameIssues = checkColumnNames(keys);

  // Calculate validation score
  const totalCells = data.length * keys.length;
  const issueWeight = allIssues.reduce((a, i) => a + i.count * (i.severity === 'high' ? 3 : i.severity === 'medium' ? 2 : 1), 0);
  const issueRatio = Math.min(1, issueWeight / totalCells);
  const validationScore = Math.max(0, Math.round((1 - issueRatio) * 100));

  const letterGrade = validationScore >= 90 ? 'A' : validationScore >= 75 ? 'B' : validationScore >= 60 ? 'C' : 'D';

  return { issues: allIssues, completeness, distribution, uniqueness, columnNameIssues, letterGrade, validationScore };
}

// ═══════════════════════════════════════════
// AUTO-FIX: Apply fixable validation issues
// ═══════════════════════════════════════════
export function applyValidationFixes(
  data: Record<string, unknown>[]
): { data: Record<string, unknown>[]; fixCount: number; fixDetails: string[] } {
  let current = data.map(r => ({ ...r }));
  let fixCount = 0;
  const fixDetails: string[] = [];
  const keys = Object.keys(current[0] || {});

  // Fix encoding errors
  let encodingFixed = 0;
  keys.forEach(col => {
    current.forEach(row => {
      if (typeof row[col] === 'string') {
        const fixed = fixEncoding(row[col] as string);
        if (fixed !== row[col]) { row[col] = fixed; encodingFixed++; }
      }
    });
  });
  if (encodingFixed > 0) { fixCount += encodingFixed; fixDetails.push(`🔧 Fixed ${encodingFixed} encoding errors`); }

  // Strip HTML tags
  let htmlFixed = 0;
  keys.forEach(col => {
    current.forEach(row => {
      if (typeof row[col] === 'string' && /<[^>]+>/.test(row[col] as string)) {
        row[col] = (row[col] as string).replace(/<[^>]+>/g, '');
        htmlFixed++;
      }
    });
  });
  if (htmlFixed > 0) { fixCount += htmlFixed; fixDetails.push(`🔧 Removed HTML tags from ${htmlFixed} values`); }

  // Remove invisible characters
  let invisibleFixed = 0;
  keys.forEach(col => {
    current.forEach(row => {
      if (typeof row[col] === 'string') {
        const cleaned = (row[col] as string).replace(/[\u200B-\u200F\u2028-\u202F\uFEFF\u00AD]/g, '');
        if (cleaned !== row[col]) { row[col] = cleaned; invisibleFixed++; }
      }
    });
  });
  if (invisibleFixed > 0) { fixCount += invisibleFixed; fixDetails.push(`🔧 Removed invisible characters from ${invisibleFixed} values`); }

  // Remove emoji from data fields
  let emojiFixed = 0;
  keys.forEach(col => {
    current.forEach(row => {
      if (typeof row[col] === 'string') {
        const cleaned = (row[col] as string).replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
        if (cleaned !== row[col]) { row[col] = cleaned; emojiFixed++; }
      }
    });
  });
  if (emojiFixed > 0) { fixCount += emojiFixed; fixDetails.push(`🔧 Removed emoji from ${emojiFixed} values`); }

  // Fix Infinity values → null
  let infFixed = 0;
  keys.forEach(col => {
    current.forEach(row => {
      if (typeof row[col] === 'number' && !isFinite(row[col] as number)) {
        row[col] = null;
        infFixed++;
      }
    });
  });
  if (infFixed > 0) { fixCount += infFixed; fixDetails.push(`🔧 Replaced ${infFixed} Infinity values with null`); }

  // Round excessive precision
  let precisionFixed = 0;
  keys.forEach(col => {
    current.forEach(row => {
      if (typeof row[col] === 'number') {
        const s = String(row[col]);
        const dec = s.split('.')[1];
        if (dec && dec.length > 6) {
          row[col] = Math.round((row[col] as number) * 1e4) / 1e4;
          precisionFixed++;
        }
      }
    });
  });
  if (precisionFixed > 0) { fixCount += precisionFixed; fixDetails.push(`🔧 Rounded ${precisionFixed} values to 4 decimal places`); }

  // Standardize date formats to YYYY-MM-DD
  let dateFixed = 0;
  const dateCols = keys.filter(k => /date|dob|time|joined|created/i.test(k));
  dateCols.forEach(col => {
    current.forEach(row => {
      if (typeof row[col] === 'string') {
        const d = new Date(row[col] as string);
        if (!isNaN(d.getTime())) {
          const iso = d.toISOString().split('T')[0];
          if (iso !== row[col]) { row[col] = iso; dateFixed++; }
        }
      }
    });
  });
  if (dateFixed > 0) { fixCount += dateFixed; fixDetails.push(`📅 Standardized ${dateFixed} dates to YYYY-MM-DD`); }

  // Fix column names
  const colNameIssues = checkColumnNames(keys);
  if (colNameIssues.length > 0) {
    const renameMap: Record<string, string> = {};
    colNameIssues.forEach(iss => { renameMap[iss.original] = iss.fixed; });
    current = current.map(row => {
      const newRow: Record<string, unknown> = {};
      Object.entries(row).forEach(([k, v]) => { newRow[renameMap[k] || k] = v; });
      return newRow;
    });
    fixCount += colNameIssues.length;
    fixDetails.push(`📝 Renamed ${colNameIssues.length} columns to snake_case`);
  }

  return { data: current, fixCount, fixDetails };
}
