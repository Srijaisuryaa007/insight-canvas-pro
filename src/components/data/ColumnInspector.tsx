import { useState, useMemo } from 'react';
import { DatasetColumn, QualityIssue } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Hash, Type, Calendar, ToggleLeft, AlertTriangle, CheckCircle, ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ColumnInspectorProps {
  columns: DatasetColumn[];
  issues?: QualityIssue[];
  selectedColumn?: string;
  onSelectColumn?: (column: string) => void;
  data?: Record<string, unknown>[];
}

const typeIcons: Record<string, any> = {
  number: Hash,
  string: Type,
  date: Calendar,
  boolean: ToggleLeft,
};

const formatColumnName = (col: string) =>
  col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()).trim();

function MiniHistogram({ values }: { values: number[] }) {
  if (!values.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const bucketCount = 7;
  const buckets = Array(bucketCount).fill(0);
  values.forEach(v => {
    const idx = Math.min(bucketCount - 1, Math.floor(((v - min) / range) * bucketCount));
    buckets[idx]++;
  });
  const maxBucket = Math.max(...buckets);

  return (
    <div className="flex items-end gap-0.5 h-10">
      {buckets.map((count, i) => (
        <div
          key={i}
          className="flex-1 bg-primary/60 rounded-t-sm min-h-[2px]"
          style={{ height: `${maxBucket ? (count / maxBucket) * 100 : 0}%` }}
        />
      ))}
    </div>
  );
}

export function ColumnInspector({
  columns,
  issues = [],
  selectedColumn,
  onSelectColumn,
  data = [],
}: ColumnInspectorProps) {
  const [expandedCol, setExpandedCol] = useState<string | null>(null);

  const getColumnIssues = (columnName: string) =>
    issues.filter(i => i.column === columnName);

  const getColumnStats = (colName: string) => {
    if (!data.length) return null;
    const values = data.map(r => r[colName]);
    const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
    const nullPct = Math.round(((values.length - nonNull.length) / values.length) * 100);
    const uniqueCount = new Set(nonNull.map(String)).size;

    const numValues = nonNull.map(Number).filter(n => !isNaN(n));
    if (numValues.length > 0) {
      const min = Math.min(...numValues);
      const max = Math.max(...numValues);
      const avg = numValues.reduce((a, b) => a + b, 0) / numValues.length;
      // Top values
      const freq: Record<string, number> = {};
      numValues.forEach(v => { freq[String(v)] = (freq[String(v)] || 0) + 1; });
      const topValues = Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([val, count]) => ({ val, count }));

      return { type: 'number' as const, min, max, avg, nullPct, uniqueCount, topValues, numValues };
    }

    // String column
    const strValues = nonNull.map(String);
    const avgLen = strValues.length
      ? Math.round(strValues.reduce((a, s) => a + s.length, 0) / strValues.length)
      : 0;
    const freq: Record<string, number> = {};
    strValues.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
    const topValues = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([val, count]) => ({ val: val.length > 25 ? val.slice(0, 25) + '…' : val, count }));

    return { type: 'string' as const, avgLen, nullPct, uniqueCount, topValues };
  };

  const handleClick = (colName: string) => {
    setExpandedCol(prev => prev === colName ? null : colName);
    onSelectColumn?.(colName);
  };

  return (
    <Card className="bg-card border-border h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Column Inspector</CardTitle>
        <p className="text-xs text-muted-foreground">Click any column to inspect</p>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-20rem)]">
          <div className="space-y-1 p-3 pt-0">
            {columns.map(column => {
              const TypeIcon = typeIcons[column.type] || Hash;
              const columnIssues = getColumnIssues(column.name);
              const hasIssues = columnIssues.length > 0;
              const isExpanded = expandedCol === column.name;
              const stats = isExpanded ? getColumnStats(column.name) : null;

              return (
                <div
                  key={column.name}
                  onClick={() => handleClick(column.name)}
                  className={cn(
                    "rounded-xl cursor-pointer transition-all border",
                    isExpanded
                      ? "bg-primary/5 border-primary/20"
                      : "border-transparent hover:bg-muted/50"
                  )}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between gap-2 p-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className={cn(
                        "w-6 h-6 rounded flex items-center justify-center shrink-0 text-[10px] font-bold",
                        column.type === 'number' ? "bg-blue-500/10 text-blue-500" :
                        column.type === 'date' ? "bg-purple-500/10 text-purple-500" :
                        column.type === 'boolean' ? "bg-amber-500/10 text-amber-500" :
                        "bg-emerald-500/10 text-emerald-500"
                      )}>
                        <TypeIcon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium truncate block">{formatColumnName(column.name)}</span>
                        <span className="text-[10px] text-muted-foreground">{column.type} · {column.uniqueValues} unique</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {hasIssues ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      ) : (
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                      )}
                      <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && stats && (
                    <div className="px-3 pb-3 space-y-3 border-t border-border/50 pt-3">
                      {stats.type === 'number' && 'min' in stats ? (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { label: 'Min', value: stats.min.toFixed(3) },
                              { label: 'Max', value: stats.max.toFixed(3) },
                              { label: 'Avg', value: stats.avg.toFixed(3) },
                              { label: 'Null', value: `${stats.nullPct}%` },
                            ].map(s => (
                              <div key={s.label} className="flex justify-between text-xs">
                                <span className="text-muted-foreground">{s.label}</span>
                                <span className="font-mono font-medium text-foreground">{s.value}</span>
                              </div>
                            ))}
                          </div>
                          <MiniHistogram values={stats.numValues} />
                        </>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: 'Avg Length', value: `${('avgLen' in stats ? stats.avgLen : 0)} chars` },
                            { label: 'Empty', value: `${stats.nullPct}%` },
                          ].map(s => (
                            <div key={s.label} className="flex justify-between text-xs">
                              <span className="text-muted-foreground">{s.label}</span>
                              <span className="font-mono font-medium text-foreground">{s.value}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Top values */}
                      {stats.topValues.length > 0 && (
                        <div>
                          <p className="text-[10px] text-muted-foreground font-medium mb-1.5">
                            {stats.type === 'number' ? 'Top values' : 'Most common'}
                          </p>
                          <div className="space-y-1">
                            {stats.topValues.map((tv, i) => (
                              <div key={i} className="flex items-center justify-between text-xs">
                                <span className="font-mono text-foreground truncate max-w-[70%]">{tv.val}</span>
                                <Badge variant="secondary" className="text-[9px] h-4 px-1">{tv.count}×</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Issues */}
                      {hasIssues && (
                        <div className="space-y-1">
                          {columnIssues.map((issue, idx) => (
                            <div
                              key={idx}
                              className={cn(
                                "text-[10px] px-2 py-1 rounded",
                                issue.severity === 'high' ? 'bg-destructive/10 text-destructive' :
                                issue.severity === 'medium' ? 'bg-amber-500/10 text-amber-600' :
                                'bg-muted text-muted-foreground'
                              )}
                            >
                              {issue.type}: {issue.count} ({issue.percentage}%)
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
