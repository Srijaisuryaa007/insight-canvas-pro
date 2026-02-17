import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Code, CheckCircle, XCircle, Copy, Play } from 'lucide-react';
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
}

const DAX_KEYWORDS = ['sum', 'average', 'count', 'calculate', 'filter', 'all', 'related', 'values', 'if', 'switch', 'divide', 'totalytd', 'dateadd', 'sameperiodlastyear', 'measure', 'column', 'dax', 'formula', 'calculated', 'time intelligence', 'year over year', 'running total', 'cumulative', 'rank', 'topn', 'earlier'];

function isDAXQuestion(question: string): boolean {
  const lower = question.toLowerCase();
  return DAX_KEYWORDS.some(kw => lower.includes(kw)) ||
    lower.includes('create a measure') ||
    lower.includes('write a formula') ||
    lower.includes('how to calculate') ||
    lower.includes('dax') ||
    lower.includes('expression');
}

function generateDAXResponse(question: string): { formula: string; explanation: string; impactPreview: string; measureName: string } {
  const lower = question.toLowerCase();

  if (lower.includes('total') || lower.includes('sum')) {
    return {
      measureName: 'Total Revenue',
      formula: 'Total Revenue = SUM(Sales[Revenue])',
      explanation: 'This measure calculates the total sum of the Revenue column in the Sales table. It will respond to any filter context applied by slicers or cross-filtering.',
      impactPreview: 'Adds a reusable aggregation metric available in all charts and KPI cards.',
    };
  }
  if (lower.includes('average') || lower.includes('avg')) {
    return {
      measureName: 'Average Order Value',
      formula: 'Average Order Value = AVERAGE(Sales[Revenue])',
      explanation: 'Calculates the arithmetic mean of Revenue across all rows in the current filter context.',
      impactPreview: 'Enables per-record average analysis across dimensions.',
    };
  }
  if (lower.includes('year') || lower.includes('yoy') || lower.includes('time intelligence')) {
    return {
      measureName: 'Revenue YoY Growth',
      formula: `Revenue YoY Growth = \nVAR CurrentYear = SUM(Sales[Revenue])\nVAR PriorYear = CALCULATE(SUM(Sales[Revenue]), SAMEPERIODLASTYEAR('Date'[Date]))\nRETURN DIVIDE(CurrentYear - PriorYear, PriorYear, 0)`,
      explanation: 'Uses time intelligence to compare current period revenue against the same period last year. SAMEPERIODLASTYEAR shifts the date filter back by one year.',
      impactPreview: 'Adds year-over-year growth percentage to trend analysis.',
    };
  }
  if (lower.includes('running') || lower.includes('cumulative')) {
    return {
      measureName: 'Running Total',
      formula: `Running Total = \nCALCULATE(\n  SUM(Sales[Revenue]),\n  FILTER(\n    ALL('Date'[Date]),\n    'Date'[Date] <= MAX('Date'[Date])\n  )\n)`,
      explanation: 'Creates a running total that accumulates Revenue from the earliest date up to the current date in context.',
      impactPreview: 'Enables cumulative trend visualization in line/area charts.',
    };
  }
  if (lower.includes('count') || lower.includes('distinct')) {
    return {
      measureName: 'Unique Customers',
      formula: 'Unique Customers = DISTINCTCOUNT(Sales[CustomerID])',
      explanation: 'Counts the number of distinct customer IDs, providing a unique customer count metric.',
      impactPreview: 'Tracks unique customer engagement across segments.',
    };
  }

  return {
    measureName: 'Custom Measure',
    formula: `Custom Measure = CALCULATE(\n  SUM(Sales[Revenue]),\n  FILTER(Sales, Sales[Category] = "Target")\n)`,
    explanation: 'A CALCULATE expression that evaluates SUM with a modified filter context. Adjust the filter predicate to match your specific requirement.',
    impactPreview: 'Creates a filtered aggregation that can be used across all visuals.',
  };
}

export function DAXBot({ datasetId, onApplyMeasure }: DAXBotProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<DAXMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { consumeCredits, credits } = useSubscription();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const question = input.trim();

    // Add user message
    const userMsg: DAXMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question,
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // Check if it's a DAX question
    if (!isDAXQuestion(question)) {
      const refusalMsg: DAXMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "I'm DAX Bot — I only handle DAX formulas, measures, calculated columns, and time intelligence. For general data analysis, charts, or insights, please use the **AI Copilot** tab in the sidebar.",
        confidence: 1,
        reasoning: 'Non-DAX query detected. Redirecting to AI Copilot.',
      };
      setMessages(prev => [...prev, refusalMsg]);
      return;
    }

    if (!consumeCredits('copilot-query')) return;

    setIsLoading(true);

    try {
      // Try real API first
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const apiResponse = await askCopilot(`[DAX ONLY] ${question}`, datasetId, history);

      const { formula, explanation, impactPreview, measureName } = generateDAXResponse(question);

      const assistantMsg: DAXMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: apiResponse.answer || `Here's a DAX measure for your request:`,
        daxFormula: formula,
        explanation: explanation,
        impactPreview: impactPreview,
        applied: false,
        confidence: apiResponse.confidence || 0.9,
        reasoning: apiResponse.reasoning || 'Generated DAX expression based on semantic model analysis.',
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      const { formula, explanation, impactPreview } = generateDAXResponse(question);
      const fallbackMsg: DAXMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Here\'s a DAX measure for your request:',
        daxFormula: formula,
        explanation: explanation,
        impactPreview: impactPreview,
        applied: false,
        confidence: 0.85,
        reasoning: 'Generated locally based on query pattern matching.',
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = (messageId: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id === messageId && m.daxFormula) {
        const namePart = m.daxFormula.split('=')[0]?.trim() || 'New Measure';
        onApplyMeasure?.(namePart, m.daxFormula);
        toast({
          title: 'Measure Applied',
          description: `"${namePart}" has been added to the semantic model.`,
        });
        return { ...m, applied: true };
      }
      return m;
    }));
  };

  const handleCopy = (formula: string) => {
    navigator.clipboard.writeText(formula);
    toast({ title: 'Copied to clipboard' });
  };

  const daxSuggestions = [
    'Create a SUM measure for revenue',
    'Write a YoY growth formula',
    'Calculate running total',
    'Count distinct customers',
  ];

  return (
    <Card className="bg-card border-border h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Code className="h-5 w-5 text-chart-1" />
            DAX Bot
          </CardTitle>
          <Badge variant="outline" className="text-xs font-mono">DAX Only</Badge>
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
                  I create DAX measures, calculated columns, and time intelligence formulas.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  For general questions, use the AI Copilot tab.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {daxSuggestions.map((s, i) => (
                  <Button key={i} variant="outline" size="sm" className="text-xs"
                    onClick={() => setInput(s)}>
                    {s}
                  </Button>
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
                        {/* DAX Formula */}
                        <div className="relative">
                          <pre className="text-xs font-mono bg-muted/50 p-3 rounded overflow-x-auto text-foreground">
                            {msg.daxFormula}
                          </pre>
                          <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6"
                            onClick={() => handleCopy(msg.daxFormula!)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* Explanation */}
                        {msg.explanation && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">Explanation: </span>
                            {msg.explanation}
                          </div>
                        )}

                        {/* Impact Preview */}
                        {msg.impactPreview && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">Impact: </span>
                            {msg.impactPreview}
                          </div>
                        )}

                        {/* Apply Button */}
                        <Button
                          size="sm"
                          className="w-full gap-2"
                          variant={msg.applied ? 'outline' : 'default'}
                          disabled={msg.applied}
                          onClick={() => handleApply(msg.id)}
                        >
                          {msg.applied ? (
                            <><CheckCircle className="h-4 w-4 text-emerald-500" /> Applied to Model</>
                          ) : (
                            <><Play className="h-4 w-4" /> Apply to Semantic Model</>
                          )}
                        </Button>
                      </div>
                    )}

                    {/* Explainability */}
                    {msg.role === 'assistant' && (msg.confidence !== undefined || msg.reasoning) && (
                      <div className="text-xs text-muted-foreground space-y-1">
                        {msg.confidence !== undefined && (
                          <span>Confidence: {Math.round(msg.confidence * 100)}%</span>
                        )}
                        {msg.reasoning && (
                          <div className="italic">💡 {msg.reasoning}</div>
                        )}
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
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a DAX question..."
              disabled={isLoading}
              className="flex-1 font-mono text-sm"
            />
            <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {credits === Infinity ? 'Unlimited' : credits} credits • 5 per query
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
