import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Loader2, Code, CheckCircle, Copy, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { askCopilot } from '@/lib/api';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface DAXMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  daxFormula?: string;
  explanation?: string;
  impactPreview?: string;
  applied?: boolean;
  confidence?: number;
  reasoning?: string;
}

interface DAXBotProps {
  datasetId?: string;
  onApplyMeasure?: (name: string, formula: string) => void;
  columns?: string[];
  data?: Record<string, unknown>[];
}

const DAX_KEYWORDS = ['sum', 'average', 'count', 'calculate', 'filter', 'all', 'related', 'values', 'if', 'switch', 'divide', 'totalytd', 'dateadd', 'sameperiodlastyear', 'measure', 'column', 'dax', 'formula', 'calculated', 'time intelligence', 'year over year', 'running total', 'cumulative', 'rank', 'topn', 'earlier', 'total', 'max', 'min'];

function isDAXQuestion(question: string): boolean {
  const lower = question.toLowerCase();
  return DAX_KEYWORDS.some(kw => lower.includes(kw)) ||
    lower.includes('create a measure') ||
    lower.includes('write a formula') ||
    lower.includes('how to calculate') ||
    lower.includes('dax') ||
    lower.includes('expression');
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

function generateDAXResponse(
  question: string,
  columns: string[],
  data: Record<string, unknown>[],
): { formula: string; explanation: string; impactPreview: string; measureName: string } {
  const lower = question.toLowerCase();
  const { numeric, date, categorical } = detectColumnTypes(columns, data);
  const tableName = 'Data';

  // Pick the best numeric column based on the question
  const pickNumeric = (hint?: string): string => {
    if (hint) {
      const match = numeric.find(c => c.toLowerCase().includes(hint));
      if (match) return match;
    }
    return numeric[0] || columns[0] || 'Value';
  };

  const pickCategory = (): string => categorical[0] || columns[0] || 'Category';
  const pickDate = (): string => date[0] || 'date';

  if (lower.includes('total') || lower.includes('sum')) {
    const col = pickNumeric(lower.match(/(?:total|sum)\s+(?:of\s+)?(\w+)/i)?.[1]?.toLowerCase());
    return {
      measureName: `Total ${col}`,
      formula: `Total ${col} = SUM(${tableName}[${col}])`,
      explanation: `Calculates the total sum of the ${col} column across all rows in the current filter context.`,
      impactPreview: `Adds a reusable "${col}" aggregation metric for charts and KPIs.`,
    };
  }
  if (lower.includes('average') || lower.includes('avg')) {
    const col = pickNumeric(lower.match(/(?:average|avg)\s+(?:of\s+)?(\w+)/i)?.[1]?.toLowerCase());
    return {
      measureName: `Average ${col}`,
      formula: `Average ${col} = AVERAGE(${tableName}[${col}])`,
      explanation: `Calculates the arithmetic mean of ${col} across all rows in the current filter context.`,
      impactPreview: `Enables per-record average analysis for ${col}.`,
    };
  }
  if (lower.includes('count') || lower.includes('distinct')) {
    const col = categorical.length > 0 ? pickCategory() : pickNumeric();
    return {
      measureName: `Unique ${col}`,
      formula: `Unique ${col} = DISTINCTCOUNT(${tableName}[${col}])`,
      explanation: `Counts the number of distinct values in ${col}.`,
      impactPreview: `Tracks unique ${col} values across segments.`,
    };
  }
  if (lower.includes('max')) {
    const col = pickNumeric(lower.match(/max\s+(?:of\s+)?(\w+)/i)?.[1]?.toLowerCase());
    return {
      measureName: `Max ${col}`,
      formula: `Max ${col} = MAX(${tableName}[${col}])`,
      explanation: `Returns the maximum value of ${col}.`,
      impactPreview: `Shows the peak ${col} value.`,
    };
  }
  if (lower.includes('min')) {
    const col = pickNumeric(lower.match(/min\s+(?:of\s+)?(\w+)/i)?.[1]?.toLowerCase());
    return {
      measureName: `Min ${col}`,
      formula: `Min ${col} = MIN(${tableName}[${col}])`,
      explanation: `Returns the minimum value of ${col}.`,
      impactPreview: `Shows the lowest ${col} value.`,
    };
  }
  if (lower.includes('year') || lower.includes('yoy') || lower.includes('time intelligence')) {
    const col = pickNumeric();
    const dateCol = pickDate();
    return {
      measureName: `${col} YoY Growth`,
      formula: `${col} YoY Growth = \nVAR CurrentYear = SUM(${tableName}[${col}])\nVAR PriorYear = CALCULATE(SUM(${tableName}[${col}]), SAMEPERIODLASTYEAR('${tableName}'[${dateCol}]))\nRETURN DIVIDE(CurrentYear - PriorYear, PriorYear, 0)`,
      explanation: `Compares current period ${col} against the same period last year using the ${dateCol} column.`,
      impactPreview: `Adds year-over-year growth percentage for ${col}.`,
    };
  }
  if (lower.includes('running') || lower.includes('cumulative')) {
    const col = pickNumeric();
    const dateCol = pickDate();
    return {
      measureName: `Running Total ${col}`,
      formula: `Running Total ${col} = \nCALCULATE(\n  SUM(${tableName}[${col}]),\n  FILTER(\n    ALL('${tableName}'[${dateCol}]),\n    '${tableName}'[${dateCol}] <= MAX('${tableName}'[${dateCol}])\n  )\n)`,
      explanation: `Creates a cumulative total of ${col} ordered by ${dateCol}.`,
      impactPreview: `Enables cumulative trend visualization.`,
    };
  }
  if (lower.includes('divide') || lower.includes('ratio') || lower.includes('margin')) {
    const col1 = numeric[0] || 'Value1';
    const col2 = numeric[1] || numeric[0] || 'Value2';
    return {
      measureName: `${col1} to ${col2} Ratio`,
      formula: `${col1} to ${col2} Ratio = DIVIDE(SUM(${tableName}[${col1}]), SUM(${tableName}[${col2}]), 0)`,
      explanation: `Calculates the ratio of ${col1} to ${col2} using safe division.`,
      impactPreview: `Adds a ratio metric for comparative analysis.`,
    };
  }

  // Default: SUM of first numeric column
  const col = pickNumeric();
  const catCol = pickCategory();
  return {
    measureName: `Total ${col}`,
    formula: `Total ${col} = CALCULATE(\n  SUM(${tableName}[${col}]),\n  FILTER(${tableName}, ${tableName}[${catCol}] = "Target")\n)`,
    explanation: `A filtered aggregation of ${col} by ${catCol}. Adjust the filter value to match your needs.`,
    impactPreview: `Creates a filtered ${col} metric usable in all visuals.`,
  };
}

export function DAXBot({ datasetId, onApplyMeasure, columns = [], data = [] }: DAXBotProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<DAXMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { consumeCredits, credits } = useSubscription();

  const { numeric } = useMemo(() => detectColumnTypes(columns, data), [columns, data]);

  // Dynamic suggestions based on schema
  const daxSuggestions = useMemo(() => {
    if (numeric.length === 0) return [
      'Create a SUM measure',
      'Write a count formula',
      'Calculate running total',
    ];
    const suggestions: string[] = [];
    if (numeric[0]) suggestions.push(`Create a SUM measure for ${numeric[0]}`);
    if (numeric[1]) suggestions.push(`Calculate average ${numeric[1]}`);
    if (numeric.length >= 2) suggestions.push(`Calculate ${numeric[0]} to ${numeric[1]} ratio`);
    suggestions.push('Write a running total formula');
    return suggestions.slice(0, 4);
  }, [numeric]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const question = input.trim();

    const userMsg: DAXMessage = { id: crypto.randomUUID(), role: 'user', content: question };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    if (!isDAXQuestion(question)) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(), role: 'assistant',
        content: "I'm DAX Bot — I only handle DAX formulas, measures, calculated columns, and time intelligence. For general data analysis, use the **AI Copilot** tab.",
        confidence: 1, reasoning: 'Non-DAX query detected.',
      }]);
      return;
    }

    if (!consumeCredits('copilot-query')) return;
    setIsLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const apiResponse = await askCopilot(`[DAX ONLY] ${question}`, datasetId, history);
      const { formula, explanation, impactPreview } = generateDAXResponse(question, columns, data);

      setMessages(prev => [...prev, {
        id: crypto.randomUUID(), role: 'assistant',
        content: apiResponse.answer || `Here's a DAX measure for your request:`,
        daxFormula: formula, explanation, impactPreview,
        applied: false, confidence: apiResponse.confidence || 0.9,
        reasoning: apiResponse.reasoning || 'Generated DAX based on your dataset schema.',
      }]);
    } catch {
      const { formula, explanation, impactPreview } = generateDAXResponse(question, columns, data);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(), role: 'assistant',
        content: 'Here\'s a DAX measure for your request:',
        daxFormula: formula, explanation, impactPreview,
        applied: false, confidence: 0.85, reasoning: 'Generated locally based on dataset schema.',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = (messageId: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id === messageId && m.daxFormula) {
        const namePart = m.daxFormula.split('=')[0]?.trim() || 'New Measure';
        onApplyMeasure?.(namePart, m.daxFormula);
        toast({ title: 'Measure Applied', description: `"${namePart}" added to semantic model.` });
        return { ...m, applied: true };
      }
      return m;
    }));
  };

  const handleCopy = (formula: string) => {
    navigator.clipboard.writeText(formula);
    toast({ title: 'Copied to clipboard' });
  };

  // Schema info badge
  const schemaInfo = columns.length > 0
    ? `${columns.length} cols • ${data.length} rows`
    : 'No dataset';

  return (
    <Card className="bg-card border-border h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Code className="h-5 w-5 text-chart-1" />DAX Bot
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px] font-mono">{schemaInfo}</Badge>
            <Badge variant="outline" className="text-xs font-mono">DAX Only</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="py-8 text-center space-y-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-chart-1/10 flex items-center justify-center">
                <Code className="h-8 w-8 text-chart-1" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">DAX Bot</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  I create DAX measures based on your dataset schema.
                </p>
                {columns.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Detected columns: {columns.slice(0, 6).join(', ')}{columns.length > 6 ? '…' : ''}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {daxSuggestions.map((s, i) => (
                  <Button key={i} variant="outline" size="sm" className="text-xs" onClick={() => setInput(s)}>{s}</Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {messages.map(msg => (
                <div key={msg.id} className={cn("flex gap-3", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-chart-1/10 flex items-center justify-center shrink-0">
                      <Code className="h-4 w-4 text-chart-1" />
                    </div>
                  )}
                  <div className="max-w-[85%] space-y-2">
                    <div className={cn("rounded-lg px-4 py-2", msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                      <p className="text-sm">{msg.content}</p>
                    </div>
                    {msg.daxFormula && (
                      <div className="rounded-lg border border-border bg-card p-3 space-y-3">
                        <div className="relative">
                          <pre className="text-xs font-mono bg-muted/50 p-3 rounded overflow-x-auto text-foreground">{msg.daxFormula}</pre>
                          <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => handleCopy(msg.daxFormula!)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        {msg.explanation && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">Explanation: </span>{msg.explanation}
                          </div>
                        )}
                        {msg.impactPreview && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">Impact: </span>{msg.impactPreview}
                          </div>
                        )}
                        <Button size="sm" className="w-full gap-2" variant={msg.applied ? 'outline' : 'default'} disabled={msg.applied} onClick={() => handleApply(msg.id)}>
                          {msg.applied ? <><CheckCircle className="h-4 w-4 text-emerald-500" /> Applied to Model</> : <><Play className="h-4 w-4" /> Apply to Semantic Model</>}
                        </Button>
                      </div>
                    )}
                    {msg.role === 'assistant' && (msg.confidence !== undefined || msg.reasoning) && (
                      <div className="text-xs text-muted-foreground space-y-1">
                        {msg.confidence !== undefined && <span>Confidence: {Math.round(msg.confidence * 100)}%</span>}
                        {msg.reasoning && <div className="italic">💡 {msg.reasoning}</div>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-chart-1/10 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-chart-1 animate-spin" />
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <p className="text-sm text-muted-foreground">Generating DAX...</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
        <div className="p-4 border-t border-border">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask a DAX question..." disabled={isLoading} className="flex-1 font-mono text-sm" />
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
