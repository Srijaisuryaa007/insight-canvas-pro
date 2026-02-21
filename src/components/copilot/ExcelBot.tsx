import { useState, useRef, useEffect } from 'react';
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
}

const EXCEL_KEYWORDS = ['vlookup', 'hlookup', 'xlookup', 'sumif', 'countif', 'averageif', 'index', 'match', 'if', 'iferror', 'sumproduct', 'pivot', 'concatenate', 'left', 'right', 'mid', 'len', 'trim', 'text', 'value', 'date', 'year', 'month', 'day', 'now', 'today', 'unique', 'sort', 'filter', 'lambda', 'let', 'sequence', 'excel', 'formula', 'spreadsheet', 'cell', 'range', 'lookup', 'conditional', 'format'];

function isExcelQuestion(question: string): boolean {
  const lower = question.toLowerCase();
  return EXCEL_KEYWORDS.some(kw => lower.includes(kw)) ||
    lower.includes('excel') ||
    lower.includes('spreadsheet') ||
    lower.includes('formula') ||
    lower.includes('cell') ||
    lower.includes('worksheet');
}

function generateExcelResponse(question: string): { formula: string; explanation: string; measureName: string } {
  const lower = question.toLowerCase();

  if (lower.includes('vlookup') || lower.includes('lookup')) {
    return {
      measureName: 'VLOOKUP Result',
      formula: '=VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup])\n\nExample:\n=VLOOKUP(A2, Sheet2!A:C, 3, FALSE)',
      explanation: 'VLOOKUP searches for a value in the first column of a range and returns a value from a specified column. Use FALSE for exact match.',
    };
  }
  if (lower.includes('sumif') || (lower.includes('sum') && lower.includes('condition'))) {
    return {
      measureName: 'Conditional Sum',
      formula: '=SUMIFS(sum_range, criteria_range1, criteria1, [criteria_range2, criteria2])\n\nExample:\n=SUMIFS(D:D, B:B, "Sales", C:C, ">1000")',
      explanation: 'SUMIFS adds values that meet multiple criteria. The first argument is the range to sum, followed by pairs of criteria ranges and criteria.',
    };
  }
  if (lower.includes('index') && lower.includes('match')) {
    return {
      measureName: 'INDEX MATCH',
      formula: '=INDEX(return_range, MATCH(lookup_value, lookup_range, 0))\n\nExample:\n=INDEX(C:C, MATCH(A2, B:B, 0))',
      explanation: 'INDEX/MATCH is more flexible than VLOOKUP. MATCH finds the row position, INDEX returns the value from that position in another column.',
    };
  }
  if (lower.includes('countif') || (lower.includes('count') && lower.includes('condition'))) {
    return {
      measureName: 'Conditional Count',
      formula: '=COUNTIFS(criteria_range1, criteria1, [criteria_range2, criteria2])\n\nExample:\n=COUNTIFS(B:B, "Active", C:C, ">=2024-01-01")',
      explanation: 'COUNTIFS counts cells that meet multiple criteria. Each pair specifies a range and its corresponding criterion.',
    };
  }
  if (lower.includes('xlookup')) {
    return {
      measureName: 'XLOOKUP Result',
      formula: '=XLOOKUP(lookup_value, lookup_array, return_array, [if_not_found], [match_mode], [search_mode])\n\nExample:\n=XLOOKUP(A2, Products!A:A, Products!C:C, "Not Found")',
      explanation: 'XLOOKUP is the modern replacement for VLOOKUP. It can look in any direction and returns a default value if not found.',
    };
  }
  if (lower.includes('pivot') || lower.includes('summary')) {
    return {
      measureName: 'Pivot Summary',
      formula: '=SUMPRODUCT((criteria_range=criteria)*value_range)\n\nExample:\n=SUMPRODUCT((B2:B100="East")*(D2:D100))',
      explanation: 'SUMPRODUCT can simulate pivot table calculations by multiplying condition arrays with value arrays.',
    };
  }
  if (lower.includes('percentage') || lower.includes('percent') || lower.includes('growth')) {
    return {
      measureName: 'Growth %',
      formula: '=((New_Value - Old_Value) / Old_Value) * 100\n\nExample:\n=((B2-B1)/B1)*100',
      explanation: 'Calculates percentage change between two values. Multiply by 100 for percentage format, or format the cell as percentage.',
    };
  }

  return {
    measureName: 'Custom Formula',
    formula: '=IF(condition, value_if_true, value_if_false)\n\nExample:\n=IF(AND(B2>100, C2="Active"), "High Priority", "Normal")',
    explanation: 'A conditional formula that returns different values based on a logical test. Combine with AND/OR for multiple conditions.',
  };
}

export function ExcelBot({ datasetId, onApplyMeasure }: ExcelBotProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ExcelMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { consumeCredits, credits } = useSubscription();

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
        content: "I'm the Excel Formula Bot — I only handle Excel formulas, functions, and spreadsheet calculations. For DAX measures, use the **DAX Bot**."
      }]);
      return;
    }

    if (!consumeCredits('copilot-query')) return;
    setIsLoading(true);

    try {
      await new Promise(r => setTimeout(r, 300));
      const { formula, explanation, measureName } = generateExcelResponse(question);
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
        const name = m.formula.split('=')[0]?.trim() || 'Excel Measure';
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

  const suggestions = [
    'Write a VLOOKUP formula',
    'SUMIFS with multiple criteria',
    'INDEX MATCH example',
    'Calculate growth percentage',
  ];

  return (
    <Card className="bg-card border-border h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
            Excel Formula Bot
          </CardTitle>
          <Badge variant="outline" className="text-xs">Excel Only</Badge>
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
                <p className="text-sm text-muted-foreground mt-1">I generate Excel formulas, functions, and spreadsheet calculations.</p>
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
