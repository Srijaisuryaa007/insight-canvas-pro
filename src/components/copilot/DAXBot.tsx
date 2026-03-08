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
import { searchDAXKnowledge, DAX_FORMULAS, DAX_CONCEPTS, DAX_TROUBLESHOOTING } from '@/lib/daxKnowledgeBase';

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

  // First, search the comprehensive knowledge base
  const kbResult = searchDAXKnowledge(question);
  if (kbResult) return kbResult;

  // Check concepts
  for (const [key, content] of Object.entries(DAX_CONCEPTS)) {
    if (lower.includes(key)) return content;
  }

  // Check troubleshooting
  for (const [key, content] of Object.entries(DAX_TROUBLESHOOTING)) {
    if (lower.includes(key)) return content;
  }

  // List all functions if user asks
  if (lower.includes('list') && (lower.includes('function') || lower.includes('formula'))) {
    const categories = [...new Set(Object.values(DAX_FORMULAS).map(f => f.category))];
    let response = '**DAX Function Categories:**\n\n';
    for (const cat of categories) {
      const funcs = Object.entries(DAX_FORMULAS).filter(([, v]) => v.category === cat);
      response += `**${cat.charAt(0).toUpperCase() + cat.slice(1)}:** ${funcs.map(([k]) => k.toUpperCase()).join(', ')}\n\n`;
    }
    return response + '\nAsk about any function for details!';
  }

  // Specific function lookup
  for (const [key, info] of Object.entries(DAX_FORMULAS)) {
    if (lower.includes(key) || lower.includes(key.toUpperCase())) {
      return `**${info.formula}**\n\n${info.description}\n\n**Example:**\n\`\`\`dax\n${info.example}\n\`\`\`\n\n**Category:** ${info.category}`;
    }
  }

  // Fallback with help
  return `**I'm your DAX Expert!** Here's what I can help with:\n\n📊 **Formula Categories:**\n- Aggregation: SUM, AVERAGE, COUNT, MAX, MIN\n- Iterators: SUMX, AVERAGEX, RANKX, COUNTX\n- Filter: CALCULATE, ALL, FILTER, KEEPFILTERS\n- Time Intelligence: TOTALYTD, SAMEPERIODLASTYEAR, DATEADD\n- Logical: IF, SWITCH, COALESCE, IFERROR\n- Text: CONCATENATE, LEFT, RIGHT, FORMAT\n- Tables: VALUES, TOPN, ADDCOLUMNS, SUMMARIZE\n\n🧠 **Concepts:**\nFilter context, Row context, Context transition, Variables, Relationships, Date tables\n\n🔧 **Troubleshooting:**\nCircular dependency, Blank results, Wrong totals, Slow performance\n\nTry: *"What is CALCULATE?"*, *"Explain filter context"*, or *"Create a YoY measure"*`;
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
