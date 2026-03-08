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

/** Returns true when the question looks like it wants a concrete DAX formula */
function wantsFormula(question: string): boolean {
  const lower = question.toLowerCase();
  const formulaSignals = [
    'sum', 'average', 'count', 'calculate', 'filter', 'divide', 'totalytd',
    'dateadd', 'sameperiodlastyear', 'running total', 'cumulative',
    'rank', 'topn', 'distinctcount', 'max', 'min', 'total',
    'create a measure', 'write a formula', 'write a measure', 'give me a formula',
    'create a dax', 'write dax', 'ratio', 'margin', 'growth',
    'year over year', 'yoy', 'time intelligence',
  ];
  return formulaSignals.some(kw => lower.includes(kw));
}

function generateDAXResponse(
  question: string,
  columns: string[],
  data: Record<string, unknown>[],
): { formula: string; explanation: string; impactPreview: string; measureName: string } {
  const lower = question.toLowerCase();
  const { numeric, date, categorical } = detectColumnTypes(columns, data);
  const tableName = 'Data';

  const pickNumeric = (hint?: string): string => {
    if (hint) {
      const match = numeric.find(c => c.toLowerCase().includes(hint));
      if (match) return match;
    }
    return numeric[0] || columns[0] || 'Value';
  };
  const pickCategory = (): string => categorical[0] || columns[0] || 'Category';
  const pickDate = (): string => date[0] || 'date';

  if (lower.includes('average') || lower.includes('avg')) {
    const col = pickNumeric(lower.match(/(?:average|avg)\s+(?:of\s+)?(\w+)/i)?.[1]?.toLowerCase());
    return { measureName: `Average ${col}`, formula: `Average ${col} = AVERAGE(${tableName}[${col}])`, explanation: `Arithmetic mean of ${col} across all rows in filter context.`, impactPreview: `Per-record average analysis for ${col}.` };
  }
  if (lower.includes('count') || lower.includes('distinct')) {
    const col = categorical.length > 0 ? pickCategory() : pickNumeric();
    return { measureName: `Unique ${col}`, formula: `Unique ${col} = DISTINCTCOUNT(${tableName}[${col}])`, explanation: `Counts distinct values in ${col}.`, impactPreview: `Tracks unique ${col} values.` };
  }
  if (lower.includes('max') && !lower.includes('margin')) {
    const col = pickNumeric(lower.match(/max\s+(?:of\s+)?(\w+)/i)?.[1]?.toLowerCase());
    return { measureName: `Max ${col}`, formula: `Max ${col} = MAX(${tableName}[${col}])`, explanation: `Maximum value of ${col}.`, impactPreview: `Peak ${col} value.` };
  }
  if (lower.includes('min')) {
    const col = pickNumeric(lower.match(/min\s+(?:of\s+)?(\w+)/i)?.[1]?.toLowerCase());
    return { measureName: `Min ${col}`, formula: `Min ${col} = MIN(${tableName}[${col}])`, explanation: `Minimum value of ${col}.`, impactPreview: `Lowest ${col} value.` };
  }
  if (lower.includes('year') || lower.includes('yoy') || lower.includes('time intelligence')) {
    const col = pickNumeric();
    const dateCol = pickDate();
    return { measureName: `${col} YoY Growth`, formula: `${col} YoY Growth = \nVAR CurrentYear = SUM(${tableName}[${col}])\nVAR PriorYear = CALCULATE(SUM(${tableName}[${col}]), SAMEPERIODLASTYEAR('${tableName}'[${dateCol}]))\nRETURN DIVIDE(CurrentYear - PriorYear, PriorYear, 0)`, explanation: `Compares current period ${col} against the same period last year using ${dateCol}.`, impactPreview: `Year-over-year growth percentage for ${col}.` };
  }
  if (lower.includes('running') || lower.includes('cumulative')) {
    const col = pickNumeric();
    const dateCol = pickDate();
    return { measureName: `Running Total ${col}`, formula: `Running Total ${col} = \nCALCULATE(\n  SUM(${tableName}[${col}]),\n  FILTER(\n    ALL('${tableName}'[${dateCol}]),\n    '${tableName}'[${dateCol}] <= MAX('${tableName}'[${dateCol}])\n  )\n)`, explanation: `Cumulative total of ${col} ordered by ${dateCol}.`, impactPreview: `Enables cumulative trend visualization.` };
  }
  if (lower.includes('divide') || lower.includes('ratio') || lower.includes('margin')) {
    const col1 = numeric[0] || 'Value1';
    const col2 = numeric[1] || numeric[0] || 'Value2';
    return { measureName: `${col1} to ${col2} Ratio`, formula: `${col1} to ${col2} Ratio = DIVIDE(SUM(${tableName}[${col1}]), SUM(${tableName}[${col2}]), 0)`, explanation: `Ratio of ${col1} to ${col2} using safe division.`, impactPreview: `Ratio metric for comparative analysis.` };
  }
  if (lower.includes('rank') || lower.includes('topn')) {
    const col = pickNumeric();
    return { measureName: `${col} Rank`, formula: `${col} Rank = \nRANKX(\n  ALL(${tableName}),\n  SUM(${tableName}[${col}]),\n  ,\n  DESC,\n  Dense\n)`, explanation: `Ranks rows by ${col} in descending order using RANKX.`, impactPreview: `Enables ranked analysis and top-N filtering.` };
  }
  if (lower.includes('calculate') && lower.includes('filter')) {
    const col = pickNumeric();
    const catCol = pickCategory();
    return { measureName: `Filtered ${col}`, formula: `Filtered ${col} = CALCULATE(\n  SUM(${tableName}[${col}]),\n  ${tableName}[${catCol}] = "Target"\n)`, explanation: `Filtered aggregation of ${col} by ${catCol}. Adjust the filter value.`, impactPreview: `Filtered ${col} metric for dashboards.` };
  }

  // Default: SUM
  const col = pickNumeric(lower.match(/(?:total|sum)\s+(?:of\s+)?(\w+)/i)?.[1]?.toLowerCase());
  return { measureName: `Total ${col}`, formula: `Total ${col} = SUM(${tableName}[${col}])`, explanation: `Total sum of ${col} across all rows in the current filter context.`, impactPreview: `Reusable "${col}" aggregation for charts and KPIs.` };
}

/** Generates a conceptual answer for non-formula DAX questions */
function generateConceptualAnswer(question: string): string {
  const lower = question.toLowerCase();

  if (lower.includes('what is dax') || lower.includes('what\'s dax'))
    return "**DAX (Data Analysis Expressions)** is a formula language used in Power BI, Analysis Services, and Power Pivot.\n\nIt's designed for:\n- **Measures** — dynamic aggregations (SUM, AVERAGE, etc.)\n- **Calculated columns** — row-level computations\n- **Tables** — virtual tables for advanced filtering\n\nDAX evaluates in a **filter context** — every slicer, cross-filter, or row context changes what the formula returns.";

  if (lower.includes('filter context') || lower.includes('row context') || lower.includes('context'))
    return "**Filter Context vs Row Context** in DAX:\n\n🔹 **Filter Context** — the set of active filters from slicers, visuals, and relationships. Measures always evaluate in filter context.\n\n🔹 **Row Context** — exists when DAX iterates row-by-row (calculated columns, SUMX, FILTER). Each row is evaluated individually.\n\n🔹 **Context Transition** — CALCULATE converts row context into filter context, which is essential for measures inside iterators.";

  if (lower.includes('calculate') && !lower.includes('filter'))
    return "**CALCULATE** is the most important DAX function. It modifies the filter context before evaluating an expression.\n\n```\nCALCULATE(<expression>, <filter1>, <filter2>, ...)\n```\n\n**Key behaviors:**\n- Overrides existing filters on specified columns\n- Works with ALL(), REMOVEFILTERS(), KEEPFILTERS()\n- Triggers **context transition** (row context → filter context)\n\n**Example:** `CALCULATE(SUM(Sales[Revenue]), Region[Name] = \"West\")`\n\nThis sums Revenue but only for the West region, regardless of other filters on Region.";

  if (lower.includes('iterator') || lower.includes('sumx') || lower.includes('averagex'))
    return "**Iterator functions** (SUMX, AVERAGEX, COUNTX, MAXX, MINX) evaluate an expression row by row, then aggregate.\n\n```\nSUMX(<table>, <expression>)\n```\n\n**Example:**\n`Weighted Avg = SUMX(Sales, Sales[Qty] * Sales[Price]) / SUM(Sales[Qty])`\n\nIterators create a **row context**, letting you reference multiple columns per row before aggregating.";

  if (lower.includes('relationship') || lower.includes('related') || lower.includes('relatedtable'))
    return "**Relationships in DAX:**\n\n🔹 **RELATED()** — pulls a value from the \"one\" side of a relationship (used in calculated columns on the \"many\" side).\n\n🔹 **RELATEDTABLE()** — returns all matching rows from the \"many\" side (used on the \"one\" side).\n\n**Example:**\n`Category Name = RELATED(Categories[Name])`\n`Order Count = COUNTROWS(RELATEDTABLE(Orders))`";

  if (lower.includes('all') || lower.includes('removefilters') || lower.includes('allexcept'))
    return "**Filter removal functions:**\n\n🔹 **ALL(table/column)** — removes all filters from a table or column. Used for ratios and percentages.\n\n🔹 **ALLEXCEPT(table, col1, col2)** — removes all filters EXCEPT the specified columns.\n\n🔹 **REMOVEFILTERS()** — alias for ALL() in modern DAX.\n\n**Example — % of Total:**\n```\n% of Total = DIVIDE(\n  SUM(Sales[Revenue]),\n  CALCULATE(SUM(Sales[Revenue]), ALL(Sales))\n)\n```";

  if (lower.includes('time intelligence') || lower.includes('dateadd') || lower.includes('totalmtd') || lower.includes('totalqtd') || lower.includes('totalytd'))
    return "**Time Intelligence** functions require a proper Date table marked as a date table.\n\n**Common functions:**\n- `TOTALYTD(expr, dates)` — Year-to-date\n- `TOTALMTD(expr, dates)` — Month-to-date\n- `DATEADD(dates, -1, YEAR)` — Shift dates\n- `SAMEPERIODLASTYEAR(dates)` — Same period last year\n- `PARALLELPERIOD(dates, -1, QUARTER)` — Previous quarter\n\n**Example:**\n```\nYTD Revenue = TOTALYTD(SUM(Sales[Revenue]), 'Date'[Date])\n```";

  if (lower.includes('variable') || lower.includes('var '))
    return "**VAR/RETURN** in DAX stores intermediate results for readability and performance.\n\n```\nProfit Margin = \nVAR TotalRevenue = SUM(Sales[Revenue])\nVAR TotalCost = SUM(Sales[Cost])\nRETURN DIVIDE(TotalRevenue - TotalCost, TotalRevenue, 0)\n```\n\n**Benefits:**\n- Avoids recalculating the same expression\n- Makes complex formulas readable\n- VAR is evaluated once in its original context";

  if (lower.includes('best practice') || lower.includes('tip') || lower.includes('optimization') || lower.includes('performance'))
    return "**DAX Best Practices:**\n\n1. **Use variables (VAR/RETURN)** — improves readability and avoids repeated calculations\n2. **Avoid calculated columns for aggregations** — use measures instead\n3. **Minimize use of FILTER()** — prefer Boolean expressions in CALCULATE\n4. **Use DIVIDE() instead of /** — handles division by zero safely\n5. **Keep your Date table clean** — mark it as a date table, ensure no gaps\n6. **Avoid bi-directional relationships** — they cause ambiguity\n7. **Test with DAX Studio** — profile query performance";

  if (lower.includes('difference') && (lower.includes('measure') || lower.includes('calculated column')))
    return "**Measures vs Calculated Columns:**\n\n| | Measure | Calculated Column |\n|---|---|---|\n| **Evaluated** | At query time | At data refresh |\n| **Context** | Filter context | Row context |\n| **Storage** | Not stored | Stored in model |\n| **Use for** | Aggregations, KPIs | Row-level labels, groups |\n\n**Rule of thumb:** If it aggregates → Measure. If it labels each row → Calculated Column.";

  if (lower.includes('switch'))
    return "**SWITCH** is cleaner than nested IFs for multiple conditions:\n\n```\nRating Label = SWITCH(\n  TRUE(),\n  Sales[Score] >= 90, \"Excellent\",\n  Sales[Score] >= 70, \"Good\",\n  Sales[Score] >= 50, \"Average\",\n  \"Below Average\"\n)\n```\n\n`SWITCH(TRUE(), ...)` evaluates each condition in order and returns the first match. The last argument is the default.";

  if (lower.includes('error') || lower.includes('blank') || lower.includes('iferror') || lower.includes('isblank'))
    return "**Error & blank handling in DAX:**\n\n- `IFERROR(expr, alt)` — returns `alt` if `expr` errors\n- `IF(ISBLANK(expr), alt, expr)` — handles blanks\n- `COALESCE(expr1, expr2, ...)` — returns first non-blank\n- `DIVIDE(num, denom, alt)` — safe division with fallback\n\n**Best practice:** Use DIVIDE() instead of `/` and COALESCE() for blank handling.";

  // Generic fallback
  return `That's a great DAX question! Here's what I can help with:\n\n- **Formula generation** — ask me to create any measure (SUM, AVERAGE, CALCULATE, etc.)\n- **Concepts** — filter context, row context, relationships, time intelligence\n- **Best practices** — optimization, naming, model design\n- **Troubleshooting** — common errors, blank handling, circular dependencies\n\nTry asking something like: *"Create a SUM measure"*, *"What is filter context?"*, or *"How does CALCULATE work?"*`;
}

export function DAXBot({ datasetId, onApplyMeasure, columns = [], data = [] }: DAXBotProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<DAXMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { consumeCredits, credits } = useSubscription();

  const { numeric } = useMemo(() => detectColumnTypes(columns, data), [columns, data]);

  const daxSuggestions = useMemo(() => {
    const s: string[] = [];
    if (numeric[0]) s.push(`Create a SUM measure for ${numeric[0]}`);
    if (numeric[1]) s.push(`Calculate average ${numeric[1]}`);
    s.push('What is filter context?');
    s.push('DAX best practices');
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

    if (!consumeCredits('copilot-query')) return;
    setIsLoading(true);

    try {
      const needsFormula = wantsFormula(question);

      if (needsFormula) {
        // Try API first, fallback to local
        let apiAnswer = '';
        try {
          const history = messages.map(m => ({ role: m.role, content: m.content }));
          const apiResponse = await askCopilot(`[DAX EXPERT MODE] You are a DAX specialist with 10+ years Power BI experience. Generate the exact DAX formula, explain what each part does, give example output, and suggest related formulas. Question: ${question}`, datasetId, history);
          apiAnswer = apiResponse.answer || '';
        } catch {}

        const { formula, explanation, impactPreview } = generateDAXResponse(question, columns, data);
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(), role: 'assistant',
          content: apiAnswer || 'Here\'s a DAX measure for your request:',
          daxFormula: formula, explanation, impactPreview,
          applied: false, confidence: 0.9,
          reasoning: 'Generated DAX based on your dataset schema.',
        }]);
      } else {
        // Conceptual / knowledge question
        const answer = generateConceptualAnswer(question);
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(), role: 'assistant',
          content: answer,
          confidence: 0.95,
          reasoning: 'DAX knowledge base response.',
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(), role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
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

  const schemaInfo = columns.length > 0 ? `${columns.length} cols • ${data.length} rows` : 'No dataset';

  return (
    <Card className="bg-card border-border h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Code className="h-5 w-5 text-chart-1" />DAX Bot
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px] font-mono">{schemaInfo}</Badge>
            <Badge variant="outline" className="text-xs font-mono">DAX Expert</Badge>
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
                  Ask me anything about DAX — formulas, concepts, best practices, and troubleshooting.
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
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
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
                    <p className="text-sm text-muted-foreground">Thinking...</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
        <div className="p-4 border-t border-border">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask anything about DAX..." disabled={isLoading} className="flex-1 font-mono text-sm" />
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
