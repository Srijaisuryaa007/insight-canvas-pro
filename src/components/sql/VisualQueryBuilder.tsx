import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, RotateCcw, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ColumnSelection {
  id: number;
  column: string;
  aggregation: string;
  alias: string;
}

interface VisualQueryBuilderProps {
  columns: string[];
  onQueryChange: (query: string) => void;
}

const AGGREGATIONS = ['NONE', 'SUM', 'COUNT', 'AVG', 'MIN', 'MAX', 'COUNT DISTINCT'];
const OPERATORS = ['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'NOT LIKE', 'IS NULL', 'IS NOT NULL', 'IN', 'BETWEEN'];

/** Wraps column name in backticks if it contains spaces or special chars */
function quoteCol(col: string): string {
  if (col === '*') return col;
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col)) return col;
  return `\`${col}\``;
}

export default function VisualQueryBuilder({ columns, onQueryChange }: VisualQueryBuilderProps) {
  const [selectedColumns, setSelectedColumns] = useState<ColumnSelection[]>([
    { id: 1, column: columns[0] || '', aggregation: 'NONE', alias: '' }
  ]);
  const [whereEnabled, setWhereEnabled] = useState(false);
  const [whereColumn, setWhereColumn] = useState('');
  const [whereOperator, setWhereOperator] = useState('=');
  const [whereValue, setWhereValue] = useState('');
  const [groupByEnabled, setGroupByEnabled] = useState(false);
  const [groupByColumn, setGroupByColumn] = useState('');
  const [orderByEnabled, setOrderByEnabled] = useState(false);
  const [orderByColumn, setOrderByColumn] = useState('');
  const [orderByDirection, setOrderByDirection] = useState('ASC');
  const [limitEnabled, setLimitEnabled] = useState(false);
  const [limitValue, setLimitValue] = useState('10');

  const buildQuery = useCallback(() => {
    const selectParts = selectedColumns.map(sc => {
      if (!sc.column) return null;
      let expr = sc.column;
      if (sc.aggregation === 'COUNT DISTINCT') expr = `COUNT(DISTINCT ${sc.column})`;
      else if (sc.aggregation !== 'NONE') expr = `${sc.aggregation}(${sc.column})`;
      if (sc.alias) expr += ` AS ${sc.alias}`;
      return expr;
    }).filter(Boolean);

    if (selectParts.length === 0) return '';

    let query = `SELECT ${selectParts.join(', ')}\nFROM data`;

    if (whereEnabled && whereColumn) {
      if (['IS NULL', 'IS NOT NULL'].includes(whereOperator)) {
        query += `\nWHERE ${whereColumn} ${whereOperator}`;
      } else if (whereOperator === 'LIKE' || whereOperator === 'NOT LIKE') {
        query += `\nWHERE ${whereColumn} ${whereOperator} '%${whereValue}%'`;
      } else if (whereOperator === 'BETWEEN') {
        const [v1, v2] = whereValue.split(',').map(s => s.trim());
        query += `\nWHERE ${whereColumn} BETWEEN ${v1 || '0'} AND ${v2 || '0'}`;
      } else if (whereOperator === 'IN') {
        query += `\nWHERE ${whereColumn} IN (${whereValue})`;
      } else {
        const isNum = whereValue !== '' && !isNaN(Number(whereValue));
        const val = isNum ? whereValue : `'${whereValue}'`;
        query += `\nWHERE ${whereColumn} ${whereOperator} ${val}`;
      }
    }

    if (groupByEnabled && groupByColumn) {
      query += `\nGROUP BY ${groupByColumn}`;
    }

    if (orderByEnabled && orderByColumn) {
      query += `\nORDER BY ${orderByColumn} ${orderByDirection}`;
    }

    if (limitEnabled && limitValue && limitValue !== 'ALL') {
      query += `\nLIMIT ${limitValue}`;
    }

    return query;
  }, [selectedColumns, whereEnabled, whereColumn, whereOperator, whereValue, groupByEnabled, groupByColumn, orderByEnabled, orderByColumn, orderByDirection, limitEnabled, limitValue]);

  useEffect(() => {
    const query = buildQuery();
    if (query) onQueryChange(query);
  }, [buildQuery, onQueryChange]);

  const addColumn = () => {
    setSelectedColumns(prev => [...prev, {
      id: Date.now(), column: columns[0] || '', aggregation: 'NONE', alias: ''
    }]);
  };

  const removeColumn = (id: number) => {
    if (selectedColumns.length <= 1) return;
    setSelectedColumns(prev => prev.filter(sc => sc.id !== id));
  };

  const updateColumn = (id: number, field: keyof ColumnSelection, value: string) => {
    setSelectedColumns(prev => prev.map(sc => sc.id === id ? { ...sc, [field]: value } : sc));
  };

  const handleReset = () => {
    setSelectedColumns([{ id: 1, column: columns[0] || '', aggregation: 'NONE', alias: '' }]);
    setWhereEnabled(false);
    setGroupByEnabled(false);
    setOrderByEnabled(false);
    setLimitEnabled(false);
  };

  const applyTemplate = (name: string) => {
    handleReset();
    switch (name) {
      case 'count':
        setSelectedColumns([{ id: 1, column: columns[0], aggregation: 'COUNT', alias: 'count' }]);
        setGroupByEnabled(true);
        setGroupByColumn(columns[0]);
        setOrderByEnabled(true);
        setOrderByColumn(columns[0]);
        setOrderByDirection('DESC');
        break;
      case 'sum':
        setSelectedColumns([
          { id: 1, column: columns[0], aggregation: 'NONE', alias: '' },
          { id: 2, column: columns[1] || columns[0], aggregation: 'SUM', alias: 'total' }
        ]);
        setGroupByEnabled(true);
        setGroupByColumn(columns[0]);
        setOrderByEnabled(true);
        setOrderByColumn(columns[0]);
        setOrderByDirection('DESC');
        break;
      case 'filter':
        setSelectedColumns([{ id: 1, column: '*' as string, aggregation: 'NONE', alias: '' }]);
        setWhereEnabled(true);
        setWhereColumn(columns[0]);
        break;
      case 'top10':
        setSelectedColumns([{ id: 1, column: '*' as string, aggregation: 'NONE', alias: '' }]);
        setLimitEnabled(true);
        setLimitValue('10');
        break;
      case 'avg':
        setSelectedColumns([
          { id: 1, column: columns[0], aggregation: 'NONE', alias: '' },
          { id: 2, column: columns[1] || columns[0], aggregation: 'AVG', alias: 'average' }
        ]);
        setGroupByEnabled(true);
        setGroupByColumn(columns[0]);
        setOrderByEnabled(true);
        setOrderByDirection('DESC');
        break;
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardContent className="py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Visual Query Builder</span>
            <span className="text-xs text-muted-foreground">— auto-generates SQL from selections</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1 text-xs h-7">
            <RotateCcw className="h-3 w-3" /> Reset
          </Button>
        </div>

        {/* SELECT */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Select</Label>
          <div className="space-y-2">
            {selectedColumns.map((sc, idx) => (
              <div key={sc.id} className="flex items-center gap-2 flex-wrap">
                {idx > 0 && <span className="text-xs text-muted-foreground">,</span>}
                <Select value={sc.aggregation} onValueChange={v => updateColumn(sc.id, 'aggregation', v)}>
                  <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover">
                    {AGGREGATIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={sc.column} onValueChange={v => updateColumn(sc.id, 'column', v)}>
                  <SelectTrigger className="w-[160px] h-8 text-xs font-mono"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover">
                    {columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="alias"
                  value={sc.alias}
                  onChange={e => updateColumn(sc.id, 'alias', e.target.value)}
                  className="w-24 h-8 text-xs"
                />
                {selectedColumns.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeColumn(sc.id)}>
                    <X className="h-3 w-3 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={addColumn} className="gap-1 text-xs h-7">
            <Plus className="h-3 w-3" /> Add Column
          </Button>
        </div>

        <div className="border-t border-border" />

        {/* WHERE */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Switch checked={whereEnabled} onCheckedChange={setWhereEnabled} />
            <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Where</Label>
          </div>
          {whereEnabled && (
            <div className="flex items-center gap-2 flex-wrap pl-1">
              <Select value={whereColumn} onValueChange={setWhereColumn}>
                <SelectTrigger className="w-[160px] h-8 text-xs font-mono"><SelectValue placeholder="Column" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  {columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={whereOperator} onValueChange={setWhereOperator}>
                <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover">
                  {OPERATORS.map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}
                </SelectContent>
              </Select>
              {!['IS NULL', 'IS NOT NULL'].includes(whereOperator) && (
                <Input
                  placeholder="value"
                  value={whereValue}
                  onChange={e => setWhereValue(e.target.value)}
                  className="w-32 h-8 text-xs"
                />
              )}
            </div>
          )}
        </div>

        {/* GROUP BY */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Switch checked={groupByEnabled} onCheckedChange={setGroupByEnabled} />
            <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Group By</Label>
          </div>
          {groupByEnabled && (
            <div className="pl-1">
              <Select value={groupByColumn} onValueChange={setGroupByColumn}>
                <SelectTrigger className="w-[160px] h-8 text-xs font-mono"><SelectValue placeholder="Column" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  {columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* ORDER BY */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Switch checked={orderByEnabled} onCheckedChange={setOrderByEnabled} />
            <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Order By</Label>
          </div>
          {orderByEnabled && (
            <div className="flex items-center gap-2 pl-1">
              <Select value={orderByColumn} onValueChange={setOrderByColumn}>
                <SelectTrigger className="w-[160px] h-8 text-xs font-mono"><SelectValue placeholder="Column" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  {columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={orderByDirection} onValueChange={setOrderByDirection}>
                <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="ASC">ASC ↑</SelectItem>
                  <SelectItem value="DESC">DESC ↓</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* LIMIT */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Switch checked={limitEnabled} onCheckedChange={setLimitEnabled} />
            <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Limit</Label>
          </div>
          {limitEnabled && (
            <div className="pl-1">
              <Select value={limitValue} onValueChange={setLimitValue}>
                <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover">
                  {['5', '10', '20', '50', '100', '500', 'ALL'].map(v => (
                    <SelectItem key={v} value={v}>{v === 'ALL' ? 'All rows' : `${v} rows`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="border-t border-border" />

        {/* Generated SQL Preview */}
        <div>
          <Label className="text-xs text-muted-foreground">Generated SQL</Label>
          <pre className="mt-1 p-3 rounded-lg bg-muted/50 text-xs font-mono text-foreground whitespace-pre-wrap min-h-[40px]">
            {buildQuery() || 'Select columns above to generate SQL…'}
          </pre>
        </div>

        {/* Quick Templates */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Templates:</span>
          {[
            { key: 'count', label: 'Count by Category' },
            { key: 'sum', label: 'Sum by Group' },
            { key: 'filter', label: 'Filter Rows' },
            { key: 'top10', label: 'Top 10 Rows' },
            { key: 'avg', label: 'Average by Group' },
          ].map(t => (
            <Badge
              key={t.key}
              variant="outline"
              className="cursor-pointer text-xs hover:bg-primary/10 transition-colors"
              onClick={() => applyTemplate(t.key)}
            >
              {t.label}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
