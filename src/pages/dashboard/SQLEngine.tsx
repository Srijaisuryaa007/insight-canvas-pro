import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Database, Play, Download, AlertTriangle, Copy, Table2, BarChart3, Sparkles, ChevronDown, ChevronRight, Settings2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useData } from '@/contexts/DataContext';
import { VisualizationEngine } from '@/components/charts/VisualizationEngine';
import { generateRecommendedQueries, RecommendedQuery } from '@/lib/copilotEngine';
import { toast } from '@/hooks/use-toast';
import DataSyncBanner from '@/components/DataSyncBanner';
import VisualQueryBuilder from '@/components/sql/VisualQueryBuilder';
import { FormulaHub } from '@/components/sql/FormulaHub';

const UNSAFE_KEYWORDS = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'TRUNCATE', 'CREATE', 'GRANT', 'REVOKE'];

function validateSQL(sql: string): { safe: boolean; reason?: string } {
  const upper = sql.toUpperCase().trim();
  // Allow WITH (CTE) and SELECT
  if (!upper.startsWith('SELECT') && !upper.startsWith('WITH')) {
    return { safe: false, reason: 'Only SELECT queries (including CTEs with WITH) are allowed.' };
  }
  for (const kw of UNSAFE_KEYWORDS) {
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    if (regex.test(sql)) {
      return { safe: false, reason: `⚠️ Unsafe SQL operation detected: ${kw}. Only SELECT queries are permitted.` };
    }
  }
  return { safe: true };
}

/** Splits SELECT parts by comma, respecting parentheses depth and backticks */
function splitSelectParts(selectPart: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  let inBacktick = false;
  for (const ch of selectPart) {
    if (ch === '`') { inBacktick = !inBacktick; current += ch; continue; }
    if (!inBacktick) {
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      if (ch === ',' && depth === 0) { parts.push(current); current = ''; continue; }
    }
    current += ch;
  }
  if (current.trim()) parts.push(current);
  return parts;
}

/** Strip backticks from a column name */
function stripBackticks(name: string): string {
  return name.replace(/`/g, '').trim();
}

/** Case-insensitive column value getter */
function getColumnValue(row: Record<string, unknown>, colName: string): unknown {
  const clean = stripBackticks(colName);
  if (row[clean] !== undefined) return row[clean];
  const normalizedTarget = clean.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  const matchingKey = Object.keys(row).find(
    key => key.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') === normalizedTarget
  );
  return matchingKey ? row[matchingKey] : null;
}

/** Resolves backtick-quoted and unquoted column names to actual data keys */
function resolveColumnName(name: string, actualColumns: string[]): string | null {
  const clean = stripBackticks(name);
  // Exact match
  const exact = actualColumns.find(c => c === clean);
  if (exact) return exact;
  // Case-insensitive match
  const ci = actualColumns.find(c => c.toLowerCase() === clean.toLowerCase());
  if (ci) return ci;
  // Normalized match (underscores ↔ spaces)
  const norm = clean.toLowerCase().replace(/[\s_]+/g, '_').replace(/[^a-z0-9_]/g, '');
  const normMatch = actualColumns.find(c => c.toLowerCase().replace(/[\s_]+/g, '_').replace(/[^a-z0-9_]/g, '') === norm);
  return normMatch || null;
}

/** Resolves column names in a query to match actual data column names */
function resolveColumns(query: string, data: Record<string, unknown>[]): string {
  if (!data.length) return query;
  const actualColumns = Object.keys(data[0]);
  let resolved = query;
  // First handle backtick-quoted names: replace `col name` with actual key
  resolved = resolved.replace(/`([^`]+)`/g, (match, inner) => {
    const actual = resolveColumnName(inner, actualColumns);
    return actual || match;
  });
  // Then handle unquoted column references
  actualColumns.forEach(actualCol => {
    const regex = new RegExp(`\\b${actualCol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    resolved = resolved.replace(regex, actualCol);
  });
  return resolved;
}

function parseSelectQuery(sql: string, data: Record<string, unknown>[]): { result: Record<string, unknown>[]; error?: string } {
  if (!data.length) return { result: [], error: 'No data available.' };

  // Normalize column names to safe identifiers (no spaces/special chars) for robust regex parsing
  const actualCols = Object.keys(data[0]);
  const safeMap: Record<string, string> = {};
  const reverseMap: Record<string, string> = {};

  actualCols.forEach(col => {
    let safe = col.replace(/[^a-zA-Z0-9_]/g, '_');
    if (/^\d/.test(safe)) safe = '_' + safe;
    // Deduplicate
    let key = safe;
    let i = 2;
    while (reverseMap[key] && reverseMap[key] !== col) { key = `${safe}${i++}`; }
    safeMap[col] = key;
    reverseMap[key] = col;
  });

  // Create data with safe keys
  const safeData = data.map(row => {
    const safe: Record<string, unknown> = {};
    actualCols.forEach(col => { safe[safeMap[col]] = row[col]; });
    return safe;
  });

  // Normalize SQL: resolve backtick-quoted and unquoted column names to safe keys
  let safeSql = sql.trim();
  // Handle backtick-quoted names first
  safeSql = safeSql.replace(/`([^`]+)`/g, (_m, inner) => {
    const actual = resolveColumnName(inner, actualCols);
    return actual ? safeMap[actual] : inner.replace(/[^a-zA-Z0-9_]/g, '_');
  });
  // Replace unquoted actual column names (longest first to avoid partial matches)
  const sortedCols = [...actualCols].sort((a, b) => b.length - a.length);
  sortedCols.forEach(col => {
    if (safeMap[col] === col) return; // already safe
    const escaped = col.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    safeSql = safeSql.replace(new RegExp(escaped, 'gi'), safeMap[col]);
  });

  const result = parseSelectQueryCore(safeSql, safeData);

  // Map result keys back to original column names
  if (result.result.length > 0) {
    result.result = result.result.map(row => {
      const mapped: Record<string, unknown> = {};
      Object.entries(row).forEach(([k, v]) => {
        mapped[reverseMap[k] || k] = v;
      });
      return mapped;
    });
  }

  return result;
}

function parseSelectQueryCore(sql: string, data: Record<string, unknown>[]): { result: Record<string, unknown>[]; error?: string } {
  if (!data.length) return { result: [], error: 'No data available.' };
  try {
    let query = resolveColumns(sql.trim(), data);
    const cols = Object.keys(data[0]);

    // Handle CTE: extract the final SELECT
    if (query.toUpperCase().startsWith('WITH')) {
      // For CTE queries, execute the inner query logic then apply the outer query
      // Simplified: strip CTE wrapper and run inner query
      const finalSelectMatch = query.match(/\)\s*\n*\s*SELECT\s+(.+)/is);
      if (finalSelectMatch) {
        // Extract inner query from CTE
        const innerMatch = query.match(/AS\s*\(\s*(SELECT[\s\S]+?)\s*\)/i);
        if (innerMatch) {
          const innerResult = parseSelectQuery(innerMatch[1], data);
          if (innerResult.error) return innerResult;

          // Apply outer query on inner results
          const outerQuery = 'SELECT ' + finalSelectMatch[1];
          return parseSelectQuery(outerQuery, innerResult.result);
        }
      }
      return { result: data.slice(0, 20), error: 'CTE parsed with simplified execution.' };
    }

    const upper = query.toUpperCase().trim();

    // Extract parts
    const fromIdx = upper.indexOf(' FROM ');
    const whereIdx = upper.indexOf(' WHERE ');
    const groupIdx = upper.indexOf(' GROUP BY ');
    const orderIdx = upper.indexOf(' ORDER BY ');
    const limitIdx = upper.indexOf(' LIMIT ');

    const selectPart = query.substring(7, fromIdx > 0 ? fromIdx : query.length).trim();
    const isSelectAll = selectPart === '*';

    // Parse WHERE
    let filtered = [...data];
    if (whereIdx > 0) {
      const whereEnd = [groupIdx, orderIdx, limitIdx].filter(i => i > whereIdx).sort((a, b) => a - b)[0] || query.length;
      const whereClause = query.substring(whereIdx + 7, whereEnd).trim();

      // Handle "IS NOT NULL"
      const notNullMatch = whereClause.match(/`?([^`]+)`?\s+IS\s+NOT\s+NULL/i);
      if (notNullMatch) {
        const actualCol = resolveColumnName(notNullMatch[1], cols);
        if (actualCol) filtered = filtered.filter(row => row[actualCol] !== null && row[actualCol] !== undefined && row[actualCol] !== '');
      }

      // Handle comparison operators
      const condMatch = whereClause.match(/`?([^`]+)`?\s*(=|!=|>|<|>=|<=|LIKE)\s*'?([^']*)'?/i);
      if (condMatch && !notNullMatch) {
        const [, col, op, val] = condMatch;
        const actualCol = resolveColumnName(col, cols);
        if (actualCol) {
          filtered = filtered.filter(row => {
            const rv = row[actualCol];
            const nv = Number(val);
            switch (op.toUpperCase()) {
              case '=': return String(rv) === val || Number(rv) === nv;
              case '!=': return String(rv) !== val && Number(rv) !== nv;
              case '>': return Number(rv) > nv;
              case '<': return Number(rv) < nv;
              case '>=': return Number(rv) >= nv;
              case '<=': return Number(rv) <= nv;
              case 'LIKE': return String(rv).toLowerCase().includes(val.replace(/%/g, '').toLowerCase());
              default: return true;
            }
          });
        }
      }

      // Handle rank <= N (for CTE results)
      const rankMatch = whereClause.match(/rank\s*<=\s*(\d+)/i);
      if (rankMatch) {
        const maxRank = parseInt(rankMatch[1]);
        const rankCol = Object.keys(filtered[0] || {}).find(k => k.toLowerCase().includes('rank'));
        if (rankCol) filtered = filtered.filter(row => Number(row[rankCol]) <= maxRank);
      }
    }

    // Parse GROUP BY with aggregations
    if (groupIdx > 0) {
      const groupEnd = [orderIdx, limitIdx].filter(i => i > groupIdx).sort((a, b) => a - b)[0] || query.length;
      const groupCol = stripBackticks(query.substring(groupIdx + 10, groupEnd).trim());
      const actualGroupCol = resolveColumnName(groupCol, cols);
      if (actualGroupCol) {
        const aggMatch = selectPart.match(/SUM\((\w+)\)|COUNT\((\w*|\*)\)|AVG\((\w+)\)|MIN\((\w+)\)|MAX\((\w+)\)|RANK\(\)\s*OVER|DENSE_RANK\(\)\s*OVER/gi);
        const groups: Record<string, Record<string, unknown>[]> = {};
        filtered.forEach(row => {
          const key = String(row[actualGroupCol] ?? 'NULL');
          if (!groups[key]) groups[key] = [];
          groups[key].push(row);
        });

        const result: Record<string, unknown>[] = [];
        let rankCounter = 0;
        const sortedEntries = Object.entries(groups);

        for (const [key, rows] of sortedEntries) {
          const entry: Record<string, unknown> = { [actualGroupCol]: key };
          if (aggMatch) {
            aggMatch.forEach(agg => {
              const sumM = agg.match(/SUM\((\w+)\)/i);
              const countM = agg.match(/COUNT\((\w*|\*)\)/i);
              const avgM = agg.match(/AVG\((\w+)\)/i);
              const minM = agg.match(/MIN\((\w+)\)/i);
              const maxM = agg.match(/MAX\((\w+)\)/i);
              if (sumM) {
                const c = cols.find(col => col.toLowerCase() === sumM[1].toLowerCase());
                if (c) {
                  const alias = selectPart.match(new RegExp(`SUM\\(${sumM[1]}\\)\\s+AS\\s+(\\w+)`, 'i'));
                  entry[alias?.[1] || `SUM(${c})`] = rows.reduce((s, r) => s + (Number(r[c]) || 0), 0);
                }
              }
              if (countM) {
                const alias = selectPart.match(/COUNT\([^)]*\)\s+AS\s+(\w+)/i);
                entry[alias?.[1] || 'COUNT'] = rows.length;
              }
              if (avgM) {
                const c = cols.find(col => col.toLowerCase() === avgM[1].toLowerCase());
                if (c) {
                  const alias = selectPart.match(new RegExp(`AVG\\(${avgM[1]}\\)\\s+AS\\s+(\\w+)`, 'i'));
                  entry[alias?.[1] || `AVG(${c})`] = Math.round(rows.reduce((s, r) => s + (Number(r[c]) || 0), 0) / rows.length * 100) / 100;
                }
              }
              if (minM) {
                const c = cols.find(col => col.toLowerCase() === minM[1].toLowerCase());
                if (c) {
                  const alias = selectPart.match(new RegExp(`MIN\\(${minM[1]}\\)\\s+AS\\s+(\\w+)`, 'i'));
                  entry[alias?.[1] || `MIN(${c})`] = Math.min(...rows.map(r => Number(r[c]) || 0));
                }
              }
              if (maxM) {
                const c = cols.find(col => col.toLowerCase() === maxM[1].toLowerCase());
                if (c) {
                  const alias = selectPart.match(new RegExp(`MAX\\(${maxM[1]}\\)\\s+AS\\s+(\\w+)`, 'i'));
                  entry[alias?.[1] || `MAX(${c})`] = Math.max(...rows.map(r => Number(r[c]) || 0));
                }
              }
              if (/RANK\(\)/i.test(agg)) {
                // Will be assigned after sorting
              }
            });
          } else {
            entry['COUNT'] = rows.length;
          }
          result.push(entry);
        }

        // Assign ranks if needed
        if (aggMatch && aggMatch.some(a => /RANK|DENSE_RANK/i.test(a))) {
          const numKeys = Object.keys(result[0] || {}).filter(k => k !== actualGroupCol && typeof result[0][k] === 'number');
          if (numKeys.length > 0) {
            result.sort((a, b) => (Number(b[numKeys[0]]) || 0) - (Number(a[numKeys[0]]) || 0));
            result.forEach((r, i) => { r['rank'] = i + 1; });
          }
        }

        filtered = result;
      }
    } else if (!isSelectAll) {
      // Handle window functions in SELECT (simplified)
      if (/OVER\s*\(/i.test(selectPart)) {
        // Running total / LAG / RANK without GROUP BY
        const sumOverMatch = selectPart.match(/SUM\((\w+)\)\s*OVER\s*\(ORDER BY\s+(\w+)/i);
        const lagMatch = selectPart.match(/LAG\((\w+)\)\s*OVER\s*\(ORDER BY\s+(\w+)/i);

        if (sumOverMatch) {
          const valCol = cols.find(c => c.toLowerCase() === sumOverMatch[1].toLowerCase());
          const orderCol = cols.find(c => c.toLowerCase() === sumOverMatch[2].toLowerCase());
          if (valCol && orderCol) {
            filtered.sort((a, b) => String(a[orderCol!]).localeCompare(String(b[orderCol!])));
            let runSum = 0;
            filtered = filtered.map(row => {
              runSum += Number(row[valCol!]) || 0;
              return { ...row, running_total: runSum };
            });
          }
        }

        if (lagMatch) {
          const valCol = cols.find(c => c.toLowerCase() === lagMatch[1].toLowerCase());
          const orderCol = cols.find(c => c.toLowerCase() === lagMatch[2].toLowerCase());
          if (valCol && orderCol) {
            filtered.sort((a, b) => String(a[orderCol!]).localeCompare(String(b[orderCol!])));
            filtered = filtered.map((row, i) => {
              const prev = i > 0 ? Number(filtered[i - 1][valCol!]) || 0 : 0;
              const curr = Number(row[valCol!]) || 0;
              return {
                ...row,
                [`${valCol}_growth`]: i > 0 ? curr - prev : 0,
                growth_pct: i > 0 && prev !== 0 ? Math.round((curr - prev) / prev * 10000) / 100 : 0,
              };
            });
          }
        }
      } else if (/\b(SUM|AVG|COUNT|MIN|MAX|ROUND)\s*\(/i.test(selectPart)) {
        // Aggregate functions WITHOUT GROUP BY — produces a single row
        const aggResult: Record<string, unknown> = {};
        const aggParts = splitSelectParts(selectPart);

        for (const part of aggParts) {
          const trimmed = part.trim();
          const aliasMatch = trimmed.match(/\s+AS\s+(\w+)\s*$/i);
          const alias = aliasMatch?.[1] || trimmed;
          const exprPart = trimmed.replace(/\s+AS\s+\w+\s*$/i, '').trim();

          // COUNT(*)
          const countStarMatch = exprPart.match(/^COUNT\s*\(\s*\*\s*\)$/i);
          if (countStarMatch) { aggResult[alias] = filtered.length; continue; }

          // SUM(col), AVG(col), COUNT(col), MIN(col), MAX(col)
          const funcMatch = exprPart.match(/^(SUM|AVG|COUNT|MIN|MAX)\s*\(\s*(\w+)\s*\)$/i);
          if (funcMatch) {
            const fn = funcMatch[1].toUpperCase();
            const colName = funcMatch[2];
            const actualCol = cols.find(c => c.toLowerCase() === colName.toLowerCase());
            if (actualCol) {
              const values = filtered.map(r => Number(r[actualCol])).filter(v => !isNaN(v));
              switch (fn) {
                case 'SUM': aggResult[alias] = values.reduce((a, b) => a + b, 0); break;
                case 'AVG': aggResult[alias] = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length * 100) / 100 : 0; break;
                case 'COUNT': aggResult[alias] = values.length; break;
                case 'MIN': aggResult[alias] = values.length ? Math.min(...values) : 0; break;
                case 'MAX': aggResult[alias] = values.length ? Math.max(...values) : 0; break;
              }
            } else { aggResult[alias] = 0; }
            continue;
          }

          // ROUND(expr, n)
          const roundMatch = exprPart.match(/^ROUND\s*\((.+),\s*(\d+)\)$/i);
          if (roundMatch) {
            // Simplified: try to evaluate inner expression
            const innerExpr = roundMatch[1].trim();
            const decimals = parseInt(roundMatch[2]);
            const innerFuncMatch = innerExpr.match(/^(SUM|AVG|COUNT|MIN|MAX)\s*\(\s*(\w+)\s*\)$/i);
            if (innerFuncMatch) {
              const fn = innerFuncMatch[1].toUpperCase();
              const actualCol = cols.find(c => c.toLowerCase() === innerFuncMatch[2].toLowerCase());
              if (actualCol) {
                const values = filtered.map(r => Number(r[actualCol])).filter(v => !isNaN(v));
                let val = 0;
                switch (fn) {
                  case 'SUM': val = values.reduce((a, b) => a + b, 0); break;
                  case 'AVG': val = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0; break;
                  case 'COUNT': val = values.length; break;
                  case 'MIN': val = values.length ? Math.min(...values) : 0; break;
                  case 'MAX': val = values.length ? Math.max(...values) : 0; break;
                }
                aggResult[alias] = Math.round(val * Math.pow(10, decimals)) / Math.pow(10, decimals);
              }
            }
            continue;
          }

          // Arithmetic between aggregates: SUM(a) - SUM(b), SUM(a) * 100.0 / SUM(b) etc.
          const multiAggMatch = exprPart.match(/(SUM|AVG|COUNT|MIN|MAX)\s*\(\s*(\w+)\s*\)/gi);
          if (multiAggMatch && multiAggMatch.length >= 1) {
            let evalExpr = exprPart;
            for (const m of multiAggMatch) {
              const fm = m.match(/(SUM|AVG|COUNT|MIN|MAX)\s*\(\s*(\w+)\s*\)/i);
              if (fm) {
                const fn = fm[1].toUpperCase();
                const actualCol = cols.find(c => c.toLowerCase() === fm[2].toLowerCase());
                if (actualCol) {
                  const values = filtered.map(r => Number(r[actualCol])).filter(v => !isNaN(v));
                  let val = 0;
                  switch (fn) {
                    case 'SUM': val = values.reduce((a, b) => a + b, 0); break;
                    case 'AVG': val = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0; break;
                    case 'COUNT': val = values.length; break;
                    case 'MIN': val = values.length ? Math.min(...values) : 0; break;
                    case 'MAX': val = values.length ? Math.max(...values) : 0; break;
                  }
                  evalExpr = evalExpr.replace(m, String(val));
                }
              }
            }
            // Replace NULLIF(x, 0) with a safe version
            evalExpr = evalExpr.replace(/NULLIF\s*\(\s*([^,]+),\s*0\s*\)/gi, '($1 || 0.0001)');
            // Try safe evaluation of arithmetic
            try {
              const sanitized = evalExpr.replace(/[^0-9+\-*/().]/g, '');
              if (sanitized) {
                aggResult[alias] = Math.round(Function(`"use strict"; return (${sanitized})`)() * 100) / 100;
              }
            } catch { aggResult[alias] = 0; }
            continue;
          }

          // Plain column or literal
          aggResult[alias] = exprPart;
        }

        filtered = [aggResult];
      } else if (/\bCASE\b/i.test(selectPart)) {
        // Handle CASE WHEN in SELECT without GROUP BY
        const caseMatch = selectPart.match(/CASE\s+WHEN\s+(.+?)\s+THEN\s+'([^']+)'\s+(?:WHEN\s+.+?\s+THEN\s+'[^']+'\s+)*(?:ELSE\s+'([^']+)')?\s+END\s+AS\s+(\w+)/i);
        if (caseMatch) {
          const alias = caseMatch[4];
          // Simplified: evaluate each row
          const caseBlocks = [...selectPart.matchAll(/WHEN\s+(.+?)\s+THEN\s+'([^']+)'/gi)];
          const elseMatch = selectPart.match(/ELSE\s+'([^']+)'/i);
          const elseVal = elseMatch?.[1] || 'Other';

          filtered = filtered.map(row => {
            let result = elseVal;
            for (const block of caseBlocks) {
              const condition = block[1].trim();
              // Handle simple comparisons: col > value, col < value, col >= value
              const cmpMatch = condition.match(/(\w+)\s*(>|<|>=|<=|=)\s*\(?\s*SELECT\s+.+?\s*\)?\s*/i);
              if (cmpMatch) {
                // Subquery comparison — use average as proxy
                const col = cols.find(c => c.toLowerCase() === cmpMatch[1].toLowerCase());
                if (col) {
                  const allVals = filtered.map(r => Number(r[col])).filter(v => !isNaN(v));
                  const avg = allVals.length ? allVals.reduce((a, b) => a + b, 0) / allVals.length : 0;
                  const rowVal = Number(row[col]) || 0;
                  const op = cmpMatch[2];
                  const matched = op === '>' ? rowVal > avg : op === '<' ? rowVal < avg : op === '>=' ? rowVal >= avg : rowVal <= avg;
                  if (matched) { result = block[2]; break; }
                }
              }
            }
            return { ...row, [alias]: result };
          });
        }
        // Also handle non-CASE columns in select
        const otherCols = selectPart.split(',').filter(p => !/CASE/i.test(p)).map(p => p.trim().replace(/\s+AS\s+\w+/i, '').trim());
        if (otherCols.length > 0) {
          const validOtherCols = otherCols.map(f => cols.find(c => c.toLowerCase() === f.toLowerCase())).filter(Boolean) as string[];
          if (validOtherCols.length > 0) {
            const caseAlias = selectPart.match(/END\s+AS\s+(\w+)/i)?.[1];
            filtered = filtered.map(row => {
              const entry: Record<string, unknown> = {};
              validOtherCols.forEach(c => { entry[c] = row[c]; });
              if (caseAlias && row[caseAlias] !== undefined) entry[caseAlias] = row[caseAlias];
              return entry;
            });
          }
        }
      } else {
        // Select specific columns — handle backtick-quoted names
        const selectFields = splitSelectParts(selectPart).map(f => {
          const trimmed = f.trim();
          const aliasMatch = trimmed.match(/\s+AS\s+(\w+)\s*$/i);
          const alias = aliasMatch?.[1];
          const fieldName = trimmed.replace(/\s+AS\s+\w+\s*$/i, '').trim();
          const clean = stripBackticks(fieldName);
          const resolved = resolveColumnName(clean, cols);
          return { name: resolved || clean, alias };
        });
        filtered = filtered.map(row => {
          const entry: Record<string, unknown> = {};
          selectFields.forEach(({ name, alias }) => {
            const val = row[name] !== undefined ? row[name] : getColumnValue(row, name);
            entry[alias || name] = val;
          });
          return entry;
        });
      }
    }

    // ORDER BY
    if (orderIdx > 0) {
      const orderEnd = limitIdx > orderIdx ? limitIdx : query.length;
      const orderPart = query.substring(orderIdx + 10, orderEnd).trim();
      const descending = orderPart.toUpperCase().includes('DESC');
      const orderColName = stripBackticks(orderPart.replace(/\s+(ASC|DESC)/i, '').trim());
      const keys = Object.keys(filtered[0] || {});
      const actualOrderCol = resolveColumnName(orderColName, keys) ||
        keys.find(c => c.toLowerCase().includes(orderColName.toLowerCase()));
      if (actualOrderCol) {
        filtered.sort((a, b) => {
          const av = a[actualOrderCol], bv = b[actualOrderCol];
          const cmp = typeof av === 'number' && typeof bv === 'number' ? (av as number) - (bv as number) : String(av).localeCompare(String(bv));
          return descending ? -cmp : cmp;
        });
      }
    }

    // LIMIT
    if (limitIdx > 0) {
      const limitVal = parseInt(query.substring(limitIdx + 7).trim());
      if (!isNaN(limitVal)) filtered = filtered.slice(0, limitVal);
    }

    return { result: filtered };
  } catch (e) {
    return { result: [], error: `Query parsing error: ${e instanceof Error ? e.message : 'Unknown'}` };
  }
}

function autoDetectChartType(data: Record<string, unknown>[], sql?: string): { type: string; xAxis: string; yAxis: string; yAxes?: string[] } {
  if (!data.length) return { type: 'bar', xAxis: '', yAxis: '' };
  const keys = Object.keys(data[0]);
  const numKeys = keys.filter(k => typeof data[0][k] === 'number');
  const strKeys = keys.filter(k => typeof data[0][k] === 'string');
  const dateKeys = keys.filter(k => {
    const v = String(data[0][k]);
    return !isNaN(Date.parse(v)) && v.length > 6;
  });
  const upperSQL = (sql || '').toUpperCase();

  // Single aggregated row (e.g. SELECT SUM, AVG, COUNT) → KPI-style bar
  if (data.length === 1 && numKeys.length >= 1 && strKeys.length === 0) {
    return { type: 'bar', xAxis: keys[0], yAxis: numKeys[0], yAxes: numKeys };
  }

  // Running total / cumulative queries → area chart
  if (keys.some(k => /running|cumulative|cum_/i.test(k)) || upperSQL.includes('RUNNING') || upperSQL.includes('CUMULATIVE')) {
    const xCol = dateKeys[0] || strKeys[0] || keys[0];
    const yCol = keys.find(k => /running|cumulative/i.test(k)) || numKeys[numKeys.length - 1] || keys[1];
    return { type: 'area', xAxis: xCol, yAxis: yCol };
  }

  // Growth / LAG queries → line chart with growth
  if (keys.some(k => /growth|change|diff|lag|lead/i.test(k)) || upperSQL.includes('LAG') || upperSQL.includes('LEAD')) {
    const xCol = dateKeys[0] || strKeys[0] || keys[0];
    const yCol = keys.find(k => /growth|change|diff/i.test(k)) || numKeys[0] || keys[1];
    return { type: 'line', xAxis: xCol, yAxis: yCol };
  }

  // Rank queries → horizontal bar
  if (keys.some(k => /rank|row_num/i.test(k)) || upperSQL.includes('RANK')) {
    const xCol = strKeys[0] || keys[0];
    const yCol = numKeys.find(k => !/rank|row_num/i.test(k)) || numKeys[0];
    return { type: 'bar', xAxis: xCol, yAxis: yCol };
  }

  // Percentage / ratio / share queries → pie (if few items) or bar
  if (keys.some(k => /pct|percent|share|ratio|margin/i.test(k))) {
    const xCol = strKeys[0] || keys[0];
    const yCol = keys.find(k => /pct|percent|share|ratio|margin/i.test(k)) || numKeys[0];
    if (data.length <= 10) return { type: 'pie', xAxis: xCol, yAxis: yCol };
    return { type: 'bar', xAxis: xCol, yAxis: yCol };
  }

  // Moving average → line
  if (keys.some(k => /moving_avg|mov_avg|ma_/i.test(k))) {
    const xCol = dateKeys[0] || strKeys[0] || keys[0];
    const yCol = numKeys[0];
    return { type: 'line', xAxis: xCol, yAxis: yCol, yAxes: numKeys.slice(0, 3) };
  }

  // Date-based with multiple numeric columns → multi-line
  if (dateKeys.length > 0 && numKeys.length > 0) {
    return { type: 'line', xAxis: dateKeys[0], yAxis: numKeys[0], yAxes: numKeys.slice(0, 3) };
  }

  // Category + count/total → bar or pie
  if (strKeys.length > 0 && numKeys.length > 0) {
    const uniqueValues = new Set(data.map(d => String(d[strKeys[0]]))).size;
    // Pie: 2-8 categories
    if (uniqueValues >= 2 && uniqueValues <= 8 && numKeys.length === 1) {
      return { type: 'pie', xAxis: strKeys[0], yAxis: numKeys[0] };
    }
    // Many categories → bar
    return { type: 'bar', xAxis: strKeys[0], yAxis: numKeys[0], yAxes: numKeys.length > 1 ? numKeys.slice(0, 3) : undefined };
  }

  // Two+ numeric columns without categories → scatter
  if (numKeys.length >= 2) return { type: 'scatter', xAxis: numKeys[0], yAxis: numKeys[1] };

  return { type: 'bar', xAxis: keys[0], yAxis: keys[1] || keys[0] };
}

// ── Recommended Queries Panel ──

function RecommendedQueriesPanel({ onSelect }: { onSelect: (sql: string) => void }) {
  const { currentData, currentDataset } = useData();
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({ Basic: true });

  const queries = useMemo(() => {
    if (!currentData.length) return [];
    const actualCols = Object.keys(currentData[0]);
    const sampleRow = currentData[0];
    const schema = {
      tableName: 'data',
      columns: actualCols.map(name => ({
        name,
        type: (typeof sampleRow[name] === 'number' ? 'number'
          : typeof sampleRow[name] === 'boolean' ? 'boolean'
          : (typeof sampleRow[name] === 'string' && /^\d{4}-\d{2}-\d{2}/.test(sampleRow[name] as string)) ? 'date'
          : 'string') as 'string' | 'number' | 'date' | 'boolean',
        nullable: false, uniqueValues: 0, sampleValues: [],
      })),
      rowCount: currentData.length,
      sampleData: currentData.slice(0, 5),
    };
    return generateRecommendedQueries(schema);
  }, [currentData]);

  if (queries.length === 0) return null;

  // Fixed order from basic to advanced
  const categoryOrder = [
    'Basic', 'Aggregation', 'Filtering', 'Data Quality', 'Ranking',
    'Grouping & HAVING', 'Percentage & Ratio', 'Statistical', 'Comparison',
    'Trend Analysis', 'CASE Statements', 'Window Functions', 'Cross-Tab', 'CTE',
  ];
  const categories = categoryOrder.filter(cat => queries.some(q => q.category === cat));

  const toggleCategory = (cat: string) => {
    setOpenCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const catIcons: Record<string, string> = {
    'Basic': '📋', 'Aggregation': '🧮', 'Filtering': '🔍', 'Ranking': '🏆',
    'Percentage & Ratio': '📊', 'Trend Analysis': '📈', 'Window Functions': '🪟',
    'Statistical': '📉', 'Data Quality': '🩺', 'Grouping & HAVING': '📦',
    'CASE Statements': '🔀', 'CTE': '🔗', 'Comparison': '⚖️', 'Cross-Tab': '📐',
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> Recommended Queries
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-28rem)]">
          <div className="px-3 pb-3 space-y-1">
            {categories.map(cat => (
              <Collapsible key={cat} open={openCategories[cat]} onOpenChange={() => toggleCategory(cat)}>
                <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1.5 rounded hover:bg-muted/50 text-sm font-medium">
                  <span className="flex items-center gap-1.5">
                    <span>{catIcons[cat] || '📝'}</span> {cat}
                  </span>
                  {openCategories[cat] ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-0.5 ml-2">
                  {queries.filter(q => q.category === cat).map((q, i) => (
                    <button key={i} onClick={() => onSelect(q.sql)}
                      className="w-full text-left px-3 py-1.5 rounded text-xs hover:bg-muted/60 transition-colors flex items-center justify-between group">
                      <span className="text-muted-foreground group-hover:text-foreground">{q.label}</span>
                      <Badge variant="outline" className={`text-[8px] h-4 ${Number(q.level) <= 1 ? 'text-emerald-400 border-emerald-500/30' : 'opacity-60'}`}>{Number(q.level) <= 1 ? 'Free' : `L${q.level}`}</Badge>
                    </button>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ── Main SQL Engine ──

export default function SQLEngine() {
  const { currentDataset, currentData, datasets, selectDataset, isDataCleaned } = useData();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Record<string, unknown>[]>([]);
  const [queryError, setQueryError] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('results');
  const [manualChartType, setManualChartType] = useState<string | null>(null);
  const [showBuilder, setShowBuilder] = useState(true);
  const [topMode, setTopMode] = useState<'sql' | 'formulas'>('sql');
  const autoRunTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pick up query from AI Copilot
  useEffect(() => {
    const stored = sessionStorage.getItem('datavora_sql_query');
    if (stored) {
      setQuery(stored);
      sessionStorage.removeItem('datavora_sql_query');
    }
  }, []);

  const chartDetection = useMemo(() => autoDetectChartType(results, query), [results, query]);

  const executeQuery = useCallback((sql: string) => {
    if (!sql.trim()) return;
    const validation = validateSQL(sql);
    if (!validation.safe) {
      setQueryError(validation.reason!);
      setResults([]);
      return;
    }
    setQueryError('');
    const { result, error } = parseSelectQuery(sql, currentData);
    if (error) {
      setQueryError(error);
      setResults([]);
    } else {
      setResults(result);
      setActiveTab('results');
    }
  }, [currentData]);

  const handleRunQuery = () => {
    if (!query.trim()) return;
    setIsRunning(true);
    setTimeout(() => {
      executeQuery(query);
      if (!queryError) toast({ title: 'Query Executed', description: `${results.length} rows returned.` });
      setIsRunning(false);
    }, 100);
  };

  const handleQueryFromBuilder = useCallback((newQuery: string) => {
    setQuery(newQuery);
    if (autoRunTimer.current) clearTimeout(autoRunTimer.current);
    autoRunTimer.current = setTimeout(() => {
      executeQuery(newQuery);
    }, 300);
  }, [executeQuery]);

  const handleExportCSV = () => {
    if (!results.length) return;
    const headers = Object.keys(results[0]);
    const csv = [headers.join(','), ...results.map(r => headers.map(h => `"${String(r[h] ?? '')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'query-results.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    toast({ title: 'CSV Downloaded' });
  };

  const handleSelectRecommended = (sql: string) => {
    setQuery(sql);
    toast({ title: 'Query loaded', description: 'Click Run to execute.' });
  };

  const tableName = 'data';
  const columns = currentData.length > 0 ? Object.keys(currentData[0]) : [];

  return (
    <div className="space-y-4 h-[calc(100vh-7rem)] flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Database className="h-7 w-7 text-primary" />SQL Engine</h1>
          <p className="text-muted-foreground text-sm">Query your data with SQL — supports CTEs, window functions, and more</p>
        </div>
        <div className="flex gap-2 items-center">
          {datasets.length > 0 && (
            <select className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={currentDataset?.id || ''} onChange={e => selectDataset(e.target.value)}>
              <option value="">Select dataset</option>
              {datasets.map(ds => <option key={ds.id} value={ds.id}>{ds.name}</option>)}
            </select>
          )}
          <Badge variant="outline">{currentData.length} rows</Badge>
          {columns.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowBuilder(prev => !prev)} className="text-xs">
              {showBuilder ? 'Hide' : 'Show'} Builder
            </Button>
          )}
        </div>
      </div>

      {/* Data Sync Banner */}
      <DataSyncBanner />

      {/* Schema reference */}
      {columns.length > 0 && (
        <Card className="bg-muted/30 border-border">
          <CardContent className="py-2 px-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-muted-foreground">Table:</span>
              <Badge variant="secondary" className="text-xs font-mono">{tableName}</Badge>
              <span className="text-xs text-muted-foreground">|</span>
              {columns.slice(0, 12).map(c => (
                <Badge key={c} variant="outline" className="text-[10px] font-mono cursor-pointer hover:bg-primary/10"
                  onClick={() => setQuery(prev => prev + (prev ? ' ' : '') + c)}>
                  {c} <span className="text-muted-foreground ml-1">({typeof currentData[0][c]})</span>
                </Badge>
              ))}
              {columns.length > 12 && <span className="text-xs text-muted-foreground">+{columns.length - 12} more</span>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick-start query buttons */}
      {columns.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Quick:</span>
          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => { const s = `SELECT * FROM data LIMIT 10`; setQuery(s); executeQuery(s); }}>
            📋 Preview Data
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => { const s = `SELECT COUNT(*) AS total_rows FROM data`; setQuery(s); executeQuery(s); }}>
            🔢 Count Rows
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => {
            const numCols = columns.filter(c => typeof currentData[0]?.[c] === 'number');
            const s = numCols.length > 0
              ? `SELECT\n  ${numCols.slice(0, 5).map(c => `ROUND(AVG(\`${c}\`), 2) AS avg_${c.replace(/[^a-zA-Z0-9_]/g, '_')},\n  MIN(\`${c}\`) AS min_${c.replace(/[^a-zA-Z0-9_]/g, '_')},\n  MAX(\`${c}\`) AS max_${c.replace(/[^a-zA-Z0-9_]/g, '_')}`).join(',\n  ')}\nFROM data`
              : `SELECT COUNT(*) AS total_rows FROM data`;
            setQuery(s); executeQuery(s);
          }}>
            📊 Show Stats
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Button onClick={handleRunQuery} disabled={isRunning || !query.trim()} className="gap-1 h-8">
              <Play className="h-4 w-4" />{isRunning ? 'Running...' : 'Run'}
            </Button>
            <Button variant="outline" size="sm" className="h-8" onClick={handleExportCSV} disabled={!results.length}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8" onClick={() => { navigator.clipboard.writeText(query); toast({ title: 'Copied' }); }}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Visual Query Builder */}
      {showBuilder && columns.length > 0 && (
        <VisualQueryBuilder columns={columns} onQueryChange={handleQueryFromBuilder} />
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 overflow-hidden">
        {/* Recommended Queries Sidebar */}
        <div className="hidden lg:block">
          <RecommendedQueriesPanel onSelect={handleSelectRecommended} />
        </div>

        {/* Main Editor + Results */}
        <div className="lg:col-span-3 flex flex-col gap-4 overflow-hidden">
          {/* SQL Editor with line numbers */}
          <div className="flex-1 relative">
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-muted/50 rounded-l-md border-r border-border flex flex-col items-end pt-2 pr-1 pointer-events-none overflow-hidden z-10">
              {(query || ' ').split('\n').map((_, i) => (
                <span key={i} className="text-[10px] leading-[20px] text-muted-foreground/50 font-mono">{i + 1}</span>
              ))}
            </div>
            <Textarea value={query} onChange={e => setQuery(e.target.value)} placeholder={`SELECT * FROM ${tableName} LIMIT 10`}
              className="font-mono text-sm min-h-[120px] max-h-[200px] pl-10 resize-y leading-[20px]"
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleRunQuery(); }} />
            <span className="absolute bottom-2 right-2 text-[10px] text-muted-foreground/40">Ctrl+Enter to run</span>
          </div>

          {queryError && (
            <Card className="bg-destructive/10 border-destructive/20">
              <CardContent className="py-3 flex gap-2 items-start">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{queryError}</p>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="flex-1 overflow-hidden">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                <TabsList>
                  <TabsTrigger value="results" className="gap-1"><Table2 className="h-3 w-3" />Results ({results.length})</TabsTrigger>
                  <TabsTrigger value="chart" className="gap-1"><BarChart3 className="h-3 w-3" />Visualization</TabsTrigger>
                </TabsList>
                <TabsContent value="results" className="flex-1 overflow-hidden mt-2">
                  <Card className="bg-card border-border h-full">
                    <CardContent className="p-0 h-full">
                      <ScrollArea className="h-[calc(100vh-32rem)]">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                            <tr>{Object.keys(results[0]).map(h => <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">{h}</th>)}</tr>
                          </thead>
                          <tbody>
                            {results.slice(0, 500).map((row, i) => (
                              <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                                {Object.values(row).map((v, j) => (
                                  <td key={j} className="px-3 py-1.5 text-xs">
                                    {v === null || v === undefined ? <span className="text-muted-foreground/50 italic">—</span> : typeof v === 'number' ? v.toLocaleString() : String(v)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="chart" className="flex-1 mt-2 overflow-auto">
                  <div className="space-y-2">
                    {/* Chart type selector */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Settings2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Chart:</span>
                      {['bar', 'line', 'area', 'pie', 'scatter', 'radar'].map(ct => (
                        <Badge
                          key={ct}
                          variant={(manualChartType || chartDetection.type) === ct ? 'default' : 'outline'}
                          className="cursor-pointer text-xs capitalize"
                          onClick={() => setManualChartType(ct)}
                        >
                          {ct}
                        </Badge>
                      ))}
                      {manualChartType && (
                        <Badge variant="secondary" className="cursor-pointer text-xs" onClick={() => setManualChartType(null)}>
                          Reset to Auto
                        </Badge>
                      )}
                    </div>
                    <div className="min-h-[400px] h-[calc(100vh-36rem)]">
                      <VisualizationEngine
                        chartType={(manualChartType || chartDetection.type) as any}
                        data={results.slice(0, 100)}
                        xAxis={chartDetection.xAxis}
                        yAxis={chartDetection.yAxis}
                        title={`Query Results: ${chartDetection.yAxis} by ${chartDetection.xAxis}`}
                        height={Math.max(380, window.innerHeight - 580)}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
