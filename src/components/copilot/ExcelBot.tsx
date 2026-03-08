import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Loader2, Copy, Play, CheckCircle, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface ExcelMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  formula?: string;
  explanation?: string;
  applied?: boolean;
}

interface ExcelBotProps {
  datasetId?: string;
  onApplyMeasure?: (name: string, formula: string) => void;
  columns?: string[];
  data?: Record<string, unknown>[];
}

const EXCEL_KEYWORDS = ['vlookup', 'hlookup', 'xlookup', 'sumif', 'countif', 'averageif', 'index', 'match', 'if', 'iferror', 'sumproduct', 'pivot', 'concatenate', 'left', 'right', 'mid', 'len', 'trim', 'text', 'value', 'date', 'year', 'month', 'day', 'now', 'today', 'unique', 'sort', 'filter', 'lambda', 'let', 'sequence', 'excel', 'formula', 'spreadsheet', 'cell', 'range', 'lookup', 'conditional', 'format', 'sum', 'average', 'count', 'max', 'min', 'round', 'total', 'calculate', 'profit', 'margin', 'difference', 'subtract', 'multiply', 'divide', 'concat', 'combine', 'percentage', 'percent', 'growth'];

function isExcelQuestion(question: string): boolean {
  const lower = question.toLowerCase();
  return EXCEL_KEYWORDS.some(kw => lower.includes(kw)) ||
    lower.includes('excel') ||
    lower.includes('spreadsheet') ||
    lower.includes('formula') ||
    lower.includes('cell') ||
    lower.includes('worksheet') ||
    lower.includes('column') ||
    lower.includes('calculate');
}

function detectColumnTypes(columns: string[], data: Record<string, unknown>[]): {
  numeric: string[];
  date: string[];
  categorical: string[];
} {
  const numeric: string[] = [];
  const date: string[] = [];
  const categorical: string[] = [];

  columns.forEach(col => {
    if (data.length === 0) { categorical.push(col); return; }
    const sample = data.find(r => r[col] !== null && r[col] !== undefined)?.[col];
    if (typeof sample === 'number') numeric.push(col);
    else if (typeof sample === 'string' && /^\d{4}-\d{2}-\d{2}/.test(sample)) date.push(col);
    else categorical.push(col);
  });

  return { numeric, date, categorical };
}

function generateExcelResponse(
  question: string,
  columns: string[],
  data: Record<string, unknown>[],
): { formula: string; explanation: string; measureName: string } {
  const lower = question.toLowerCase();
  const { numeric, categorical } = detectColumnTypes(columns, data);

  const pickNumeric = (hint?: string): string => {
    if (hint) {
      const match = numeric.find(c => c.toLowerCase().includes(hint));
      if (match) return match;
    }
    return numeric[0] || columns[0] || 'Value';
  };

  const pickCategory = (): string => categorical[0] || columns[0] || 'Category';

  if (lower.includes('sum') || lower.includes('total')) {
    const col = pickNumeric(lower.match(/(?:sum|total)\s+(?:of\s+)?(\w+)/i)?.[1]?.toLowerCase());
    return {
      measureName: `Total ${col}`,
      formula: `=SUM(${col})\n\nApplied to your dataset: Sums all values in the "${col}" column.\nResult: ${data.length > 0 ? data.reduce((s, r) => s + (Number(r[col]) || 0), 0).toLocaleString() : 'N/A'}`,
      explanation: `Calculates the total sum of all values in the ${col} column of your dataset (${data.length} rows).`,
    };
  }
  if (lower.includes('average') || lower.includes('avg')) {
    const col = pickNumeric(lower.match(/(?:average|avg)\s+(?:of\s+)?(\w+)/i)?.[1]?.toLowerCase());
    const vals = data.map(r => Number(r[col]) || 0);
    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return {
      measureName: `Average ${col}`,
      formula: `=AVERAGE(${col})\n\nApplied to your dataset: Average of "${col}" column.\nResult: ${avg.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
      explanation: `Calculates the arithmetic mean of ${col} across ${data.length} rows.`,
    };
  }
  if (lower.includes('count')) {
    const col = pickNumeric() || pickCategory();
    return {
      measureName: `Count ${col}`,
      formula: `=COUNT(${col})\n\nApplied to your dataset: Counts non-empty values in "${col}".\nResult: ${data.filter(r => r[col] !== null && r[col] !== undefined).length}`,
      explanation: `Counts the number of non-empty entries in the ${col} column.`,
    };
  }
  if (lower.includes('max')) {
    const col = pickNumeric(lower.match(/max\s+(?:of\s+)?(\w+)/i)?.[1]?.toLowerCase());
    const max = data.length > 0 ? Math.max(...data.map(r => Number(r[col]) || 0)) : 0;
    return {
      measureName: `Max ${col}`,
      formula: `=MAX(${col})\n\nApplied to your dataset: Maximum value in "${col}".\nResult: ${max.toLocaleString()}`,
      explanation: `Returns the maximum value in the ${col} column.`,
    };
  }
  if (lower.includes('min')) {
    const col = pickNumeric(lower.match(/min\s+(?:of\s+)?(\w+)/i)?.[1]?.toLowerCase());
    const min = data.length > 0 ? Math.min(...data.map(r => Number(r[col]) || 0)) : 0;
    return {
      measureName: `Min ${col}`,
      formula: `=MIN(${col})\n\nApplied to your dataset: Minimum value in "${col}".\nResult: ${min.toLocaleString()}`,
      explanation: `Returns the minimum value in the ${col} column.`,
    };
  }
  if (lower.includes('if') && !lower.includes('sumif') && !lower.includes('countif')) {
    const col = pickNumeric();
    const median = data.length > 0 ? data.reduce((s, r) => s + (Number(r[col]) || 0), 0) / data.length : 1000;
    const threshold = Math.round(median);
    return {
      measureName: `${col} Category`,
      formula: `=IF(${col} > ${threshold}, "High", "Low")\n\nApplied to each row: Categorizes based on whether ${col} is above or below ${threshold}.`,
      explanation: `Creates a conditional column that labels each row as "High" or "Low" based on the ${col} value relative to the average (${threshold}).`,
    };
  }
  if (lower.includes('round')) {
    const col = pickNumeric();
    return {
      measureName: `Rounded ${col}`,
      formula: `=ROUND(${col}, 2)\n\nRounds each value in "${col}" to 2 decimal places.`,
      explanation: `Rounds the ${col} values to 2 decimal places for cleaner presentation.`,
    };
  }
  if (lower.includes('concat') || lower.includes('combine')) {
    const col1 = columns[0] || 'A';
    const col2 = columns[1] || 'B';
    return {
      measureName: `Combined`,
      formula: `=CONCAT(${col1}, " - ", ${col2})\n\nCombines "${col1}" and "${col2}" with a separator.`,
      explanation: `Concatenates values from ${col1} and ${col2} columns into a single string.`,
    };
  }
  if (lower.includes('percentage') || lower.includes('percent') || lower.includes('growth') || lower.includes('margin')) {
    const col1 = numeric[0] || 'Value1';
    const col2 = numeric[1] || numeric[0] || 'Value2';
    return {
      measureName: `${col1} Margin %`,
      formula: `=((${col1} - ${col2}) / ${col1}) * 100\n\nCalculates percentage difference between "${col1}" and "${col2}" for each row.`,
      explanation: `Computes the margin percentage using ${col1} and ${col2} from your dataset.`,
    };
  }
  if (lower.includes('sumif') || (lower.includes('sum') && lower.includes('condition'))) {
    const numCol = pickNumeric();
    const catCol = pickCategory();
    const sampleVal = data.length > 0 ? String(data[0][catCol] || 'Target') : 'Target';
    return {
      measureName: `Conditional Sum ${numCol}`,
      formula: `=SUMIF(${catCol}, "${sampleVal}", ${numCol})\n\nSums ${numCol} where ${catCol} equals "${sampleVal}".`,
      explanation: `Adds up ${numCol} values only for rows where ${catCol} matches "${sampleVal}".`,
    };
  }
  if (lower.includes('vlookup') || lower.includes('lookup') || lower.includes('xlookup')) {
    const col1 = columns[0] || 'Key';
    const col2 = numeric[0] || columns[1] || 'Value';
    return {
      measureName: 'Lookup Result',
      formula: `=VLOOKUP(lookup_value, ${col1}:${col2}, 2, FALSE)\n\nLooks up a value in "${col1}" and returns corresponding "${col2}".`,
      explanation: `Searches the ${col1} column for a match and returns the associated ${col2} value.`,
    };
  }
  if (lower.includes('index') && lower.includes('match')) {
    const col1 = columns[0] || 'Key';
    const col2 = numeric[0] || columns[1] || 'Value';
    return {
      measureName: 'INDEX MATCH',
      formula: `=INDEX(${col2}, MATCH(lookup_value, ${col1}, 0))\n\nFinds position in "${col1}" and returns value from "${col2}".`,
      explanation: `Uses INDEX/MATCH to flexibly look up values from your dataset columns ${col1} and ${col2}.`,
    };
  }

  // Default: difference between two numeric columns
  if (numeric.length >= 2) {
    return {
      measureName: `${numeric[0]} minus ${numeric[1]}`,
      formula: `=${numeric[0]} - ${numeric[1]}\n\nSubtracts "${numeric[1]}" from "${numeric[0]}" for each row.`,
      explanation: `Creates a calculated column showing the difference between ${numeric[0]} and ${numeric[1]}.`,
    };
  }

  const col = pickNumeric();
  return {
    measureName: `Calculated ${col}`,
    formula: `=ROUND(${col} * 1.1, 2)\n\nApplies a 10% increase to each "${col}" value, rounded to 2 decimals.`,
    explanation: `A sample formula applied to your ${col} column. Modify as needed.`,
  };
}

export function ExcelBot({ datasetId, onApplyMeasure, columns = [], data = [] }: ExcelBotProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ExcelMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { consumeCredits, credits } = useSubscription();

  const { numeric } = useMemo(() => detectColumnTypes(columns, data), [columns, data]);

  const suggestions = useMemo(() => {
    if (numeric.length === 0) return [
      'Write a SUM formula',
      'Calculate an average',
      'Create an IF condition',
      'Calculate growth percentage',
    ];
    const s: string[] = [];
    if (numeric[0]) s.push(`Calculate total ${numeric[0]}`);
    if (numeric[1]) s.push(`Average of ${numeric[1]}`);
    if (numeric.length >= 2) s.push(`${numeric[0]} minus ${numeric[1]} formula`);
    s.push('Create an IF condition');
    return s.slice(0, 4);
  }, [numeric]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const question = input.trim();

    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', content: question }]);
    setInput('');

    if (!isExcelQuestion(question)) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(), role: 'assistant',
        content: "I'm the Excel Formula Bot — I handle Excel formulas and spreadsheet calculations. For DAX measures, use the **DAX Bot**."
      }]);
      return;
    }

    if (!consumeCredits('copilot-query')) return;
    setIsLoading(true);

    try {
      await new Promise(r => setTimeout(r, 300));
      const { formula, explanation } = generateExcelResponse(question, columns, data);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(), role: 'assistant',
        content: `Here's the Excel formula for your request:`,
        formula, explanation, applied: false,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = (messageId: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id === messageId && m.formula) {
        const name = m.formula.split('\n')[0]?.replace(/^=/, '').trim() || 'Excel Measure';
        onApplyMeasure?.(name, m.formula);
        toast({ title: 'Formula Applied', description: 'Added as a measure to the semantic model.' });
        return { ...m, applied: true };
      }
      return m;
    }));
  };

  const handleCopy = (formula: string) => {
    navigator.clipboard.writeText(formula);
    toast({ title: 'Copied to clipboard' });
  };

  const schemaInfo = columns.length > 0
    ? `${columns.length} cols • ${data.length} rows`
    : 'No dataset';

  return (
    <Card className="bg-card border-border h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-500" />Excel Formula Bot
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px] font-mono">{schemaInfo}</Badge>
            <Badge variant="outline" className="text-xs">Excel Only</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="py-8 text-center space-y-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <FileSpreadsheet className="h-8 w-8 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Excel Formula Bot</h3>
                <p className="text-sm text-muted-foreground mt-1">I generate Excel formulas based on your dataset schema.</p>
                {columns.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Detected columns: {columns.slice(0, 6).join(', ')}{columns.length > 6 ? '…' : ''}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestions.map((s, i) => (
                  <Button key={i} variant="outline" size="sm" className="text-xs" onClick={() => setInput(s)}>{s}</Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {messages.map(msg => (
                <div key={msg.id} className={cn("flex gap-3", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                    </div>
                  )}
                  <div className="max-w-[85%] space-y-2">
                    <div className={cn("rounded-lg px-4 py-2", msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                      <p className="text-sm">{msg.content}</p>
                    </div>
                    {msg.formula && (
                      <div className="rounded-lg border border-border bg-card p-3 space-y-3">
                        <div className="relative">
                          <pre className="text-xs font-mono bg-muted/50 p-3 rounded overflow-x-auto text-foreground whitespace-pre-wrap">{msg.formula}</pre>
                          <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => handleCopy(msg.formula!)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        {msg.explanation && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">Explanation: </span>{msg.explanation}
                          </div>
                        )}
                        <Button size="sm" className="w-full gap-2" variant={msg.applied ? 'outline' : 'default'} disabled={msg.applied} onClick={() => handleApply(msg.id)}>
                          {msg.applied ? <><CheckCircle className="h-4 w-4 text-emerald-500" /> Applied</> : <><Play className="h-4 w-4" /> Add as Measure</>}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-emerald-500 animate-spin" />
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <p className="text-sm text-muted-foreground">Generating formula...</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
        <div className="p-4 border-t border-border">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask an Excel formula question..." disabled={isLoading} className="flex-1 text-sm" />
            <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-2 text-center">{credits === Infinity ? 'Unlimited' : credits} credits • 5 per query</p>
        </div>
      </CardContent>
    </Card>
  );
}
