import { useState, useEffect, useMemo } from 'react';
import { Database, Play, Download, AlertTriangle, Sparkles, Copy, Table2, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useData } from '@/contexts/DataContext';
import { VisualizationEngine } from '@/components/charts/VisualizationEngine';
import { toast } from '@/hooks/use-toast';

const UNSAFE_KEYWORDS = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'TRUNCATE', 'CREATE', 'GRANT', 'REVOKE'];

function validateSQL(sql: string): { safe: boolean; reason?: string } {
  const upper = sql.toUpperCase().trim();
  if (!upper.startsWith('SELECT')) {
    return { safe: false, reason: 'Only SELECT queries are allowed.' };
  }
  for (const kw of UNSAFE_KEYWORDS) {
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    if (regex.test(sql)) {
      return { safe: false, reason: `Unsafe keyword detected: ${kw}. Only SELECT queries are permitted.` };
    }
  }
  return { safe: true };
}

function parseSelectQuery(sql: string, data: Record<string, unknown>[]): { result: Record<string, unknown>[]; error?: string } {
  if (!data.length) return { result: [], error: 'No data available.' };
  try {
    const upper = sql.toUpperCase().trim();
    const cols = Object.keys(data[0]);

    // Parse SELECT ... FROM ... [WHERE ...] [GROUP BY ...] [ORDER BY ...] [LIMIT ...]
    const selectMatch = upper.match(/^SELECT\s+(.+?)\s+FROM\s+\w+/);
    if (!selectMatch) {
      // Simple "SELECT *" or "SELECT col1, col2"
      const simpleMatch = upper.match(/^SELECT\s+(.+)/);
      if (!simpleMatch) return { result: data };
      const fields = simpleMatch[1].split(',').map(f => f.trim());
      if (fields[0] === '*') return { result: data };
    }

    // Extract parts
    const fromIdx = upper.indexOf(' FROM ');
    const whereIdx = upper.indexOf(' WHERE ');
    const groupIdx = upper.indexOf(' GROUP BY ');
    const orderIdx = upper.indexOf(' ORDER BY ');
    const limitIdx = upper.indexOf(' LIMIT ');

    const selectPart = sql.substring(7, fromIdx > 0 ? fromIdx : sql.length).trim();
    const isSelectAll = selectPart === '*';

    // Parse WHERE
    let filtered = [...data];
    if (whereIdx > 0) {
      const whereEnd = [groupIdx, orderIdx, limitIdx].filter(i => i > whereIdx).sort((a, b) => a - b)[0] || sql.length;
      const whereClause = sql.substring(whereIdx + 7, whereEnd).trim();
      // Simple WHERE parsing: col = 'value' or col > number
      const condMatch = whereClause.match(/(\w+)\s*(=|!=|>|<|>=|<=|LIKE)\s*'?([^']*)'?/i);
      if (condMatch) {
        const [, col, op, val] = condMatch;
        const actualCol = cols.find(c => c.toLowerCase() === col.toLowerCase());
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
    }

    // Parse GROUP BY with aggregations
    if (groupIdx > 0) {
      const groupEnd = [orderIdx, limitIdx].filter(i => i > groupIdx).sort((a, b) => a - b)[0] || sql.length;
      const groupCol = sql.substring(groupIdx + 10, groupEnd).trim();
      const actualGroupCol = cols.find(c => c.toLowerCase() === groupCol.toLowerCase());
      if (actualGroupCol) {
        // Parse SELECT for aggregations
        const aggMatch = selectPart.match(/SUM\((\w+)\)|COUNT\((\w*|\*)\)|AVG\((\w+)\)|MIN\((\w+)\)|MAX\((\w+)\)/gi);
        const groups: Record<string, Record<string, unknown>[]> = {};
        filtered.forEach(row => {
          const key = String(row[actualGroupCol] ?? 'NULL');
          if (!groups[key]) groups[key] = [];
          groups[key].push(row);
        });

        const result: Record<string, unknown>[] = [];
        for (const [key, rows] of Object.entries(groups)) {
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
                if (c) entry[`SUM(${c})`] = rows.reduce((s, r) => s + (Number(r[c]) || 0), 0);
              }
              if (countM) entry[`COUNT`] = rows.length;
              if (avgM) {
                const c = cols.find(col => col.toLowerCase() === avgM[1].toLowerCase());
                if (c) entry[`AVG(${c})`] = Math.round(rows.reduce((s, r) => s + (Number(r[c]) || 0), 0) / rows.length * 100) / 100;
              }
              if (minM) {
                const c = cols.find(col => col.toLowerCase() === minM[1].toLowerCase());
                if (c) entry[`MIN(${c})`] = Math.min(...rows.map(r => Number(r[c]) || 0));
              }
              if (maxM) {
                const c = cols.find(col => col.toLowerCase() === maxM[1].toLowerCase());
                if (c) entry[`MAX(${c})`] = Math.max(...rows.map(r => Number(r[c]) || 0));
              }
            });
          } else {
            entry['COUNT'] = rows.length;
          }
          result.push(entry);
        }
        filtered = result;
      }
    } else if (!isSelectAll) {
      // Select specific columns
      const selectFields = selectPart.split(',').map(f => f.trim());
      const mappedCols = selectFields.map(f => cols.find(c => c.toLowerCase() === f.toLowerCase()) || f);
      filtered = filtered.map(row => {
        const entry: Record<string, unknown> = {};
        mappedCols.forEach(c => { entry[c] = row[c]; });
        return entry;
      });
    }

    // ORDER BY
    if (orderIdx > 0) {
      const orderEnd = limitIdx > orderIdx ? limitIdx : sql.length;
      const orderPart = sql.substring(orderIdx + 10, orderEnd).trim();
      const descending = orderPart.toUpperCase().includes('DESC');
      const orderColName = orderPart.replace(/\s+(ASC|DESC)/i, '').trim();
      const actualOrderCol = Object.keys(filtered[0] || {}).find(c => c.toLowerCase() === orderColName.toLowerCase());
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
      const limitVal = parseInt(sql.substring(limitIdx + 7).trim());
      if (!isNaN(limitVal)) filtered = filtered.slice(0, limitVal);
    }

    return { result: filtered };
  } catch (e) {
    return { result: [], error: `Query parsing error: ${e instanceof Error ? e.message : 'Unknown'}` };
  }
}

function autoDetectChartType(data: Record<string, unknown>[]): { type: string; xAxis: string; yAxis: string } {
  if (!data.length) return { type: 'bar', xAxis: '', yAxis: '' };
  const keys = Object.keys(data[0]);
  const numKeys = keys.filter(k => typeof data[0][k] === 'number');
  const strKeys = keys.filter(k => typeof data[0][k] === 'string');
  const dateKeys = keys.filter(k => {
    const v = String(data[0][k]);
    return !isNaN(Date.parse(v)) && v.length > 6;
  });

  if (dateKeys.length > 0 && numKeys.length > 0) return { type: 'line', xAxis: dateKeys[0], yAxis: numKeys[0] };
  if (strKeys.length > 0 && numKeys.length > 0) {
    const uniqueValues = new Set(data.map(d => String(d[strKeys[0]]))).size;
    if (uniqueValues <= 8) return { type: 'pie', xAxis: strKeys[0], yAxis: numKeys[0] };
    return { type: 'bar', xAxis: strKeys[0], yAxis: numKeys[0] };
  }
  if (numKeys.length >= 2) return { type: 'scatter', xAxis: numKeys[0], yAxis: numKeys[1] };
  return { type: 'bar', xAxis: keys[0], yAxis: keys[1] || keys[0] };
}

export default function SQLEngine() {
  const { currentDataset, currentData, datasets, selectDataset } = useData();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Record<string, unknown>[]>([]);
  const [queryError, setQueryError] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('results');

  // Pick up query from AI Copilot
  useEffect(() => {
    const stored = sessionStorage.getItem('datapulse_sql_query');
    if (stored) {
      setQuery(stored);
      sessionStorage.removeItem('datapulse_sql_query');
    }
  }, []);

  const chartDetection = useMemo(() => autoDetectChartType(results), [results]);

  const handleRunQuery = () => {
    if (!query.trim()) return;
    const validation = validateSQL(query);
    if (!validation.safe) {
      setQueryError(validation.reason!);
      setResults([]);
      return;
    }
    setIsRunning(true);
    setQueryError('');
    setTimeout(() => {
      const { result, error } = parseSelectQuery(query, currentData);
      if (error) {
        setQueryError(error);
        setResults([]);
      } else {
        setResults(result);
        toast({ title: 'Query Executed', description: `${result.length} rows returned.` });
      }
      setIsRunning(false);
    }, 300);
  };

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

  const tableName = currentDataset?.name?.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() || 'dataset';
  const columns = currentData.length > 0 ? Object.keys(currentData[0]) : [];

  return (
    <div className="space-y-4 h-[calc(100vh-7rem)] flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Database className="h-7 w-7 text-primary" />SQL Engine</h1>
          <p className="text-muted-foreground text-sm">Query your data with SQL</p>
        </div>
        <div className="flex gap-2">
          {datasets.length > 0 && (
            <select className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={currentDataset?.id || ''} onChange={e => selectDataset(e.target.value)}>
              <option value="">Select dataset</option>
              {datasets.map(ds => <option key={ds.id} value={ds.id}>{ds.name}</option>)}
            </select>
          )}
          <Badge variant="outline">{currentData.length} rows available</Badge>
        </div>
      </div>

      {/* Schema reference */}
      {columns.length > 0 && (
        <Card className="bg-muted/30 border-border">
          <CardContent className="py-2 px-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-muted-foreground">Table:</span>
              <Badge variant="secondary" className="text-xs font-mono">{tableName}</Badge>
              <span className="text-xs text-muted-foreground">|</span>
              <span className="text-xs text-muted-foreground">Columns:</span>
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

      {/* SQL Editor */}
      <div className="flex gap-2 items-start">
        <Textarea value={query} onChange={e => setQuery(e.target.value)} placeholder={`SELECT * FROM ${tableName} LIMIT 10`}
          className="font-mono text-sm min-h-[100px] flex-1 resize-y" onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleRunQuery(); }} />
        <div className="flex flex-col gap-2">
          <Button onClick={handleRunQuery} disabled={isRunning || !query.trim()} className="gap-1">
            <Play className="h-4 w-4" />{isRunning ? 'Running...' : 'Run'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!results.length}>
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(query); toast({ title: 'Copied' }); }}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
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
                  <ScrollArea className="h-[calc(100vh-28rem)]">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                        <tr>{Object.keys(results[0]).map(h => <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {results.slice(0, 500).map((row, i) => (
                          <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                            {Object.values(row).map((v, j) => (
                              <td key={j} className="px-3 py-1.5 text-xs">{v === null || v === undefined ? <span className="text-muted-foreground italic">null</span> : String(v)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="chart" className="flex-1 mt-2">
              <VisualizationEngine
                chartType={chartDetection.type as any}
                data={results.slice(0, 100)}
                xAxis={chartDetection.xAxis}
                yAxis={chartDetection.yAxis}
                title={`Query Results: ${chartDetection.yAxis} by ${chartDetection.xAxis}`}
                height={350}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
