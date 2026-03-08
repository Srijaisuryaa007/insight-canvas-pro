// Formula Engine — Excel-style formula parser and DAX measure executor

export interface FormulaColumn {
  id: string;
  name: string;
  formula: string;
  type: 'excel';
  createdAt: string;
}

export interface DAXMeasure {
  id: string;
  name: string;
  formula: string;
  type: 'dax';
  description?: string;
  createdAt: string;
}

// ── Excel Formula Parsing ──

const EXCEL_FUNCTIONS: Record<string, (...args: number[]) => number> = {
  SUM: (...args) => args.reduce((a, b) => a + (isNaN(b) ? 0 : b), 0),
  AVERAGE: (...args) => { const valid = args.filter(v => !isNaN(v)); return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0; },
  COUNT: (...args) => args.filter(v => v !== null && v !== undefined && !isNaN(v)).length,
  MAX: (...args) => Math.max(...args.filter(v => !isNaN(v))),
  MIN: (...args) => Math.min(...args.filter(v => !isNaN(v))),
  ROUND: (val, dec = 0) => Math.round(val * Math.pow(10, dec)) / Math.pow(10, dec),
  ABS: (val) => Math.abs(val),
  SQRT: (val) => Math.sqrt(val),
  POWER: (base, exp) => Math.pow(base, exp),
  LOG: (val) => Math.log10(val),
  LN: (val) => Math.log(val),
  CEILING: (val, sig = 1) => Math.ceil(val / sig) * sig,
  FLOOR: (val, sig = 1) => Math.floor(val / sig) * sig,
};

function resolveValue(token: string, row: Record<string, unknown>): number | string | null {
  // If it's a column reference
  if (row.hasOwnProperty(token)) {
    const val = row[token];
    if (val === null || val === undefined) return null;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const num = Number(val);
      return isNaN(num) ? val : num;
    }
    return null;
  }
  // Quoted string
  if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
    return token.slice(1, -1);
  }
  // Number literal
  const num = Number(token);
  if (!isNaN(num)) return num;
  return token;
}

export function evaluateExcelFormula(
  formula: string,
  row: Record<string, unknown>,
  allData: Record<string, unknown>[]
): unknown {
  let expr = formula.trim();
  if (expr.startsWith('=')) expr = expr.slice(1).trim();

  // Handle IF function
  const ifMatch = expr.match(/^IF\s*\((.+)\)$/i);
  if (ifMatch) {
    const parts = splitTopLevel(ifMatch[1]);
    if (parts.length >= 3) {
      const condition = evaluateCondition(parts[0].trim(), row);
      return condition
        ? evaluateExcelFormula('=' + parts[1].trim(), row, allData)
        : evaluateExcelFormula('=' + parts[2].trim(), row, allData);
    }
  }

  // Handle CONCAT
  const concatMatch = expr.match(/^CONCAT\s*\((.+)\)$/i);
  if (concatMatch) {
    const parts = splitTopLevel(concatMatch[1]);
    return parts.map(p => {
      const v = resolveValue(p.trim(), row);
      return v === null ? '' : String(v);
    }).join('');
  }

  // Handle aggregate functions over all data
  const aggMatch = expr.match(/^(SUM|AVERAGE|COUNT|MAX|MIN)\s*\((.+)\)$/i);
  if (aggMatch) {
    const fnName = aggMatch[1].toUpperCase();
    const colName = aggMatch[2].trim();
    // Check if it's a column reference (aggregate over entire dataset)
    if (allData.length > 0 && allData[0].hasOwnProperty(colName)) {
      const values = allData.map(r => {
        const v = r[colName];
        return typeof v === 'number' ? v : Number(v);
      }).filter(v => !isNaN(v));
      return EXCEL_FUNCTIONS[fnName](...values);
    }
    // Otherwise single-row
    const val = resolveValue(colName, row);
    if (typeof val === 'number') return EXCEL_FUNCTIONS[fnName](val);
    return 0;
  }

  // Handle ROUND with args
  const roundMatch = expr.match(/^ROUND\s*\((.+)\)$/i);
  if (roundMatch) {
    const parts = splitTopLevel(roundMatch[1]);
    const val = Number(evaluateExcelFormula('=' + parts[0].trim(), row, allData));
    const dec = parts[1] ? Number(parts[1].trim()) : 0;
    return EXCEL_FUNCTIONS.ROUND(val, dec);
  }

  // Handle simple arithmetic: column references and operators
  try {
    const result = evaluateArithmetic(expr, row);
    return result;
  } catch {
    return '#ERROR';
  }
}

function evaluateArithmetic(expr: string, row: Record<string, unknown>): number {
  // Replace column names with values
  const columns = Object.keys(row).sort((a, b) => b.length - a.length);
  let processed = expr;
  for (const col of columns) {
    const regex = new RegExp(`\\b${escapeRegex(col)}\\b`, 'g');
    const val = row[col];
    const numVal = typeof val === 'number' ? val : Number(val);
    processed = processed.replace(regex, isNaN(numVal) ? '0' : String(numVal));
  }

  // Safe math evaluation (no eval)
  return parseMathExpression(processed);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseMathExpression(expr: string): number {
  expr = expr.trim();

  // Handle parentheses
  while (expr.includes('(')) {
    expr = expr.replace(/\(([^()]+)\)/g, (_, inner) => String(parseMathExpression(inner)));
  }

  // Addition and subtraction (left to right)
  const addParts = splitByOperators(expr, ['+', '-']);
  if (addParts.length > 1) {
    let result = parseMathExpression(addParts[0].value);
    for (let i = 1; i < addParts.length; i++) {
      const val = parseMathExpression(addParts[i].value);
      result = addParts[i].operator === '+' ? result + val : result - val;
    }
    return result;
  }

  // Multiplication and division
  const mulParts = splitByOperators(expr, ['*', '/']);
  if (mulParts.length > 1) {
    let result = parseMathExpression(mulParts[0].value);
    for (let i = 1; i < mulParts.length; i++) {
      const val = parseMathExpression(mulParts[i].value);
      result = mulParts[i].operator === '*' ? result * val : (val !== 0 ? result / val : 0);
    }
    return result;
  }

  const num = Number(expr);
  if (isNaN(num)) return 0;
  return num;
}

function splitByOperators(expr: string, ops: string[]): { value: string; operator: string }[] {
  const parts: { value: string; operator: string }[] = [];
  let current = '';
  let depth = 0;

  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;

    if (depth === 0 && ops.includes(ch) && i > 0) {
      parts.push({ value: current.trim(), operator: ch });
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) {
    if (parts.length === 0) parts.push({ value: current.trim(), operator: '' });
    else parts.push({ value: current.trim(), operator: parts.length > 0 ? parts[parts.length - 1].operator : '' });
  }

  // Fix: first element shouldn't have a consumed operator
  if (parts.length > 1) {
    const result: { value: string; operator: string }[] = [{ value: parts[0].value, operator: '' }];
    for (let i = 0; i < parts.length - 1; i++) {
      result.push({ value: parts[i + 1].value, operator: parts[i].operator });
    }
    return result;
  }
  return parts;
}

function evaluateCondition(condStr: string, row: Record<string, unknown>): boolean {
  const operators = ['>=', '<=', '!=', '<>', '>', '<', '='];
  for (const op of operators) {
    const idx = condStr.indexOf(op);
    if (idx !== -1) {
      const left = resolveValue(condStr.slice(0, idx).trim(), row);
      const right = resolveValue(condStr.slice(idx + op.length).trim(), row);
      const l = typeof left === 'number' ? left : Number(left);
      const r = typeof right === 'number' ? right : Number(right);
      switch (op) {
        case '>': return l > r;
        case '<': return l < r;
        case '>=': return l >= r;
        case '<=': return l <= r;
        case '!=': case '<>': return left !== right;
        case '=': return left === right || l === r;
      }
    }
  }
  return false;
}

function splitTopLevel(str: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  let inString = false;
  let stringChar = '';

  for (const ch of str) {
    if (!inString && (ch === '"' || ch === "'")) { inString = true; stringChar = ch; current += ch; continue; }
    if (inString && ch === stringChar) { inString = false; current += ch; continue; }
    if (!inString) {
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      if (ch === ',' && depth === 0) { parts.push(current); current = ''; continue; }
    }
    current += ch;
  }
  if (current) parts.push(current);
  return parts;
}

// ── Formula Validation ──

export function validateFormula(formula: string, columns: string[]): { valid: boolean; error?: string } {
  if (!formula.trim()) return { valid: false, error: 'Formula cannot be empty.' };

  let expr = formula.trim();
  if (expr.startsWith('=')) expr = expr.slice(1).trim();

  // Check for balanced parentheses
  let depth = 0;
  for (const ch of expr) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (depth < 0) return { valid: false, error: 'Unbalanced parentheses.' };
  }
  if (depth !== 0) return { valid: false, error: 'Unbalanced parentheses.' };

  return { valid: true };
}

// ── DAX Measure Execution ──

export function executeDAXMeasure(
  formula: string,
  data: Record<string, unknown>[],
  filters?: Record<string, unknown>
): number {
  let expr = formula;
  // Remove measure name part (e.g., "Total Revenue = SUM(...)")
  const eqIdx = expr.indexOf('=');
  if (eqIdx !== -1 && !expr.startsWith('=')) {
    expr = expr.slice(eqIdx + 1).trim();
  }
  if (expr.startsWith('=')) expr = expr.slice(1).trim();

  // Apply filters
  let filteredData = data;
  if (filters) {
    filteredData = data.filter(row => {
      return Object.entries(filters).every(([k, v]) => row[k] === v);
    });
  }

  // Handle DIVIDE
  const divideMatch = expr.match(/^DIVIDE\s*\((.+)\)$/i);
  if (divideMatch) {
    const parts = splitTopLevel(divideMatch[1]);
    const numerator = executeDAXMeasure(parts[0].trim(), filteredData);
    const denominator = executeDAXMeasure(parts[1].trim(), filteredData);
    const alt = parts[2] ? Number(parts[2].trim()) : 0;
    return denominator !== 0 ? numerator / denominator : alt;
  }

  // Handle DISTINCTCOUNT
  const dcMatch = expr.match(/^DISTINCTCOUNT\s*\(\s*\w+\[(\w+)\]\s*\)$/i);
  if (dcMatch) {
    const col = dcMatch[1];
    const unique = new Set(filteredData.map(r => r[col]));
    return unique.size;
  }

  // Handle SUM, AVERAGE, COUNT, MAX, MIN with Table[Column] syntax
  const aggDaxMatch = expr.match(/^(SUM|AVERAGE|COUNT|MAX|MIN)\s*\(\s*\w+\[(\w+)\]\s*\)$/i);
  if (aggDaxMatch) {
    const fn = aggDaxMatch[1].toUpperCase();
    const col = aggDaxMatch[2];
    const values = filteredData.map(r => Number(r[col])).filter(v => !isNaN(v));
    if (values.length === 0) return 0;
    switch (fn) {
      case 'SUM': return values.reduce((a, b) => a + b, 0);
      case 'AVERAGE': return values.reduce((a, b) => a + b, 0) / values.length;
      case 'COUNT': return values.length;
      case 'MAX': return Math.max(...values);
      case 'MIN': return Math.min(...values);
    }
  }

  // Handle plain column aggregate without table prefix
  const simpleAggMatch = expr.match(/^(SUM|AVERAGE|COUNT|MAX|MIN)\s*\(\s*(\w+)\s*\)$/i);
  if (simpleAggMatch) {
    const fn = simpleAggMatch[1].toUpperCase();
    const col = simpleAggMatch[2];
    const values = filteredData.map(r => Number(r[col])).filter(v => !isNaN(v));
    if (values.length === 0) return 0;
    switch (fn) {
      case 'SUM': return values.reduce((a, b) => a + b, 0);
      case 'AVERAGE': return values.reduce((a, b) => a + b, 0) / values.length;
      case 'COUNT': return values.length;
      case 'MAX': return Math.max(...values);
      case 'MIN': return Math.min(...values);
    }
  }

  // Try parse as number
  const num = Number(expr);
  return isNaN(num) ? 0 : num;
}

// ── Apply Formula Column to Dataset ──

export function applyFormulaColumn(
  data: Record<string, unknown>[],
  columnName: string,
  formula: string
): Record<string, unknown>[] {
  return data.map(row => ({
    ...row,
    [columnName]: evaluateExcelFormula(formula, row, data),
  }));
}
