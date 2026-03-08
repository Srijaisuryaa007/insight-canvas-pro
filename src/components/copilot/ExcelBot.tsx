import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Loader2, Copy, Play, CheckCircle, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { askCopilot } from '@/lib/api';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { searchExcelKnowledge, EXCEL_FORMULAS, EXCEL_CONCEPTS, EXCEL_TROUBLESHOOTING } from '@/lib/excelKnowledgeBase';

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

/** Returns true when the question wants a concrete Excel formula */
function wantsFormula(question: string): boolean {
  const lower = question.toLowerCase();
  const signals = [
    'sum', 'average', 'count', 'max', 'min', 'round', 'if(', 'vlookup', 'hlookup',
    'xlookup', 'sumif', 'countif', 'averageif', 'index', 'match', 'concat',
    'left(', 'right(', 'mid(', 'trim', 'len', 'sumproduct', 'iferror',
    'total', 'calculate', 'formula for', 'write a formula', 'give me a formula',
    'create a formula', 'percentage', 'percent', 'growth', 'margin',
    'difference', 'subtract', 'multiply', 'divide', 'profit', 'combine',
  ];
  return signals.some(kw => lower.includes(kw));
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

  if (lower.includes('vlookup') || (lower.includes('lookup') && !lower.includes('xlookup'))) {
    const col1 = columns[0] || 'Key';
    const col2 = numeric[0] || columns[1] || 'Value';
    return { measureName: 'VLOOKUP Result', formula: `=VLOOKUP(lookup_value, ${col1}:${col2}, 2, FALSE)\n\nSearches "${col1}" and returns matching "${col2}" value.`, explanation: `VLOOKUP searches for a value in ${col1} and returns the corresponding value from ${col2}. FALSE means exact match.` };
  }
  if (lower.includes('xlookup')) {
    const col1 = columns[0] || 'Key';
    const col2 = numeric[0] || columns[1] || 'Value';
    return { measureName: 'XLOOKUP Result', formula: `=XLOOKUP(lookup_value, ${col1}, ${col2}, "Not Found")\n\nModern lookup: searches "${col1}", returns "${col2}".`, explanation: `XLOOKUP is the modern replacement for VLOOKUP. Searches ${col1} and returns from ${col2}.` };
  }
  if (lower.includes('index') && lower.includes('match')) {
    const col1 = columns[0] || 'Key';
    const col2 = numeric[0] || columns[1] || 'Value';
    return { measureName: 'INDEX MATCH', formula: `=INDEX(${col2}, MATCH(lookup_value, ${col1}, 0))\n\nFinds position in "${col1}" and returns value from "${col2}".`, explanation: `INDEX/MATCH is more flexible than VLOOKUP. Works with ${col1} and ${col2} from your dataset.` };
  }
  if (lower.includes('sumif') || (lower.includes('sum') && lower.includes('condition'))) {
    const numCol = pickNumeric();
    const catCol = pickCategory();
    const sampleVal = data.length > 0 ? String(data[0][catCol] || 'Target') : 'Target';
    return { measureName: `Conditional Sum ${numCol}`, formula: `=SUMIF(${catCol}, "${sampleVal}", ${numCol})\n\nSums ${numCol} where ${catCol} = "${sampleVal}".`, explanation: `Adds ${numCol} values only for rows where ${catCol} matches "${sampleVal}".` };
  }
  if (lower.includes('countif') || (lower.includes('count') && lower.includes('condition'))) {
    const catCol = pickCategory();
    const sampleVal = data.length > 0 ? String(data[0][catCol] || 'Target') : 'Target';
    return { measureName: `Count ${catCol}`, formula: `=COUNTIF(${catCol}, "${sampleVal}")\n\nCounts rows where ${catCol} = "${sampleVal}".`, explanation: `Counts cells in ${catCol} that match "${sampleVal}".` };
  }
  if (lower.includes('averageif')) {
    const numCol = pickNumeric();
    const catCol = pickCategory();
    const sampleVal = data.length > 0 ? String(data[0][catCol] || 'Target') : 'Target';
    return { measureName: `Avg ${numCol}`, formula: `=AVERAGEIF(${catCol}, "${sampleVal}", ${numCol})\n\nAverage of ${numCol} where ${catCol} = "${sampleVal}".`, explanation: `Calculates the average of ${numCol} for rows matching the condition.` };
  }
  if (lower.includes('sum') || lower.includes('total')) {
    const col = pickNumeric(lower.match(/(?:sum|total)\s+(?:of\s+)?(\w+)/i)?.[1]?.toLowerCase());
    const result = data.length > 0 ? data.reduce((s, r) => s + (Number(r[col]) || 0), 0) : 0;
    return { measureName: `Total ${col}`, formula: `=SUM(${col})\n\nResult: ${result.toLocaleString()}`, explanation: `Sums all values in the ${col} column (${data.length} rows).` };
  }
  if (lower.includes('average') || lower.includes('avg')) {
    const col = pickNumeric(lower.match(/(?:average|avg)\s+(?:of\s+)?(\w+)/i)?.[1]?.toLowerCase());
    const vals = data.map(r => Number(r[col]) || 0);
    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return { measureName: `Average ${col}`, formula: `=AVERAGE(${col})\n\nResult: ${avg.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, explanation: `Average of ${col} across ${data.length} rows.` };
  }
  if (lower.includes('count')) {
    const col = pickNumeric() || pickCategory();
    return { measureName: `Count ${col}`, formula: `=COUNT(${col})\n\nResult: ${data.filter(r => r[col] !== null && r[col] !== undefined).length}`, explanation: `Counts non-empty entries in ${col}.` };
  }
  if (lower.includes('max')) {
    const col = pickNumeric();
    const max = data.length > 0 ? Math.max(...data.map(r => Number(r[col]) || 0)) : 0;
    return { measureName: `Max ${col}`, formula: `=MAX(${col})\n\nResult: ${max.toLocaleString()}`, explanation: `Maximum value in ${col}.` };
  }
  if (lower.includes('min')) {
    const col = pickNumeric();
    const min = data.length > 0 ? Math.min(...data.map(r => Number(r[col]) || 0)) : 0;
    return { measureName: `Min ${col}`, formula: `=MIN(${col})\n\nResult: ${min.toLocaleString()}`, explanation: `Minimum value in ${col}.` };
  }
  if (lower.includes('if') && !lower.includes('sumif') && !lower.includes('countif') && !lower.includes('averageif') && !lower.includes('iferror')) {
    const col = pickNumeric();
    const median = data.length > 0 ? data.reduce((s, r) => s + (Number(r[col]) || 0), 0) / data.length : 1000;
    return { measureName: `${col} Category`, formula: `=IF(${col} > ${Math.round(median)}, "High", "Low")\n\nCategorizes each row based on ${col}.`, explanation: `Labels rows as "High" or "Low" based on whether ${col} exceeds the average (${Math.round(median)}).` };
  }
  if (lower.includes('round')) {
    const col = pickNumeric();
    return { measureName: `Rounded ${col}`, formula: `=ROUND(${col}, 2)\n\nRounds ${col} to 2 decimal places.`, explanation: `Rounds values for cleaner display.` };
  }
  if (lower.includes('concat') || lower.includes('combine')) {
    const col1 = columns[0] || 'A'; const col2 = columns[1] || 'B';
    return { measureName: 'Combined', formula: `=CONCAT(${col1}, " - ", ${col2})\n\nCombines "${col1}" and "${col2}".`, explanation: `Concatenates values from ${col1} and ${col2}.` };
  }
  if (lower.includes('percentage') || lower.includes('percent') || lower.includes('growth') || lower.includes('margin')) {
    const col1 = numeric[0] || 'Value1'; const col2 = numeric[1] || numeric[0] || 'Value2';
    return { measureName: `${col1} Margin %`, formula: `=((${col1} - ${col2}) / ${col1}) * 100\n\nPercentage difference between "${col1}" and "${col2}".`, explanation: `Computes margin percentage using ${col1} and ${col2}.` };
  }
  if (lower.includes('iferror')) {
    const col = pickNumeric();
    return { measureName: `Safe ${col}`, formula: `=IFERROR(${col} / 0, 0)\n\nReturns 0 if formula errors.`, explanation: `IFERROR catches errors and returns a fallback value.` };
  }
  if (lower.includes('sumproduct') || lower.includes('pivot')) {
    const numCol = pickNumeric();
    const catCol = pickCategory();
    const sampleVal = data.length > 0 ? String(data[0][catCol] || 'Target') : 'Target';
    return { measureName: 'SUMPRODUCT', formula: `=SUMPRODUCT((${catCol}="${sampleVal}")*(${numCol}))\n\nSimulates pivot: sums ${numCol} for "${sampleVal}".`, explanation: `SUMPRODUCT multiplies condition arrays with value arrays to simulate filtered sums.` };
  }

  // Default
  if (numeric.length >= 2) {
    return { measureName: `${numeric[0]} minus ${numeric[1]}`, formula: `=${numeric[0]} - ${numeric[1]}\n\nSubtracts "${numeric[1]}" from "${numeric[0]}" for each row.`, explanation: `Difference between ${numeric[0]} and ${numeric[1]}.` };
  }
  const col = pickNumeric();
  return { measureName: `Calculated ${col}`, formula: `=ROUND(${col} * 1.1, 2)\n\n10% increase on "${col}", rounded.`, explanation: `Sample formula on ${col}. Modify as needed.` };
}

/** Generates a conceptual answer for non-formula Excel questions */
function generateConceptualAnswer(question: string): string {
  const lower = question.toLowerCase();

  // First, search the comprehensive knowledge base
  const kbResult = searchExcelKnowledge(question);
  if (kbResult) return kbResult;

  // Check concepts
  for (const [key, content] of Object.entries(EXCEL_CONCEPTS)) {
    if (lower.includes(key.split(' ')[0])) return content;
  }

  // Check troubleshooting
  for (const [key, content] of Object.entries(EXCEL_TROUBLESHOOTING)) {
    if (lower.includes(key)) return content;
  }

  // List all functions if user asks
  if (lower.includes('list') && (lower.includes('function') || lower.includes('formula'))) {
    const categories = [...new Set(Object.values(EXCEL_FORMULAS).map(f => f.category))];
    let response = '**Excel Function Categories:**\n\n';
    for (const cat of categories) {
      const funcs = Object.entries(EXCEL_FORMULAS).filter(([, v]) => v.category === cat);
      response += `**${cat.charAt(0).toUpperCase() + cat.slice(1)}:** ${funcs.map(([k]) => k.toUpperCase()).join(', ')}\n\n`;
    }
    return response + '\nAsk about any function for details!';
  }

  // Specific function lookup
  for (const [key, info] of Object.entries(EXCEL_FORMULAS)) {
    if (lower.includes(key) || lower.includes(key.toUpperCase())) {
      return `**${info.formula}**\n\n${info.description}\n\n**Example:**\n\`${info.example}\`\n\n**Category:** ${info.category}`;
    }
  }

  // Fallback with help
  return `**I'm your Excel Expert!** Here's what I can help with:\n\n📊 **Formula Categories:**\n- Math: SUM, AVERAGE, COUNT, MAX, MIN, ROUND\n- Conditional: SUMIF, COUNTIF, AVERAGEIF, SUMIFS\n- Lookup: VLOOKUP, XLOOKUP, INDEX/MATCH\n- Logical: IF, IFS, AND, OR, SWITCH, IFERROR\n- Text: CONCAT, LEFT, RIGHT, MID, TRIM, TEXT\n- Date: TODAY, DATE, EOMONTH, NETWORKDAYS\n- Arrays: FILTER, SORT, UNIQUE, SEQUENCE\n\n🧠 **Concepts:**\nPivot Tables, Conditional Formatting, Data Validation, Named Ranges, Tables, Charts, Power Query, Macros\n\n🔧 **Troubleshooting:**\n#REF!, #VALUE!, #N/A, #DIV/0!, Slow workbook, Circular reference\n\nTry: *"How does VLOOKUP work?"*, *"Explain pivot tables"*, or *"Excel shortcuts"*`;
}

export function ExcelBot({ datasetId, onApplyMeasure, columns = [], data = [] }: ExcelBotProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ExcelMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { consumeCredits, credits } = useSubscription();

  const { numeric } = useMemo(() => detectColumnTypes(columns, data), [columns, data]);

  const suggestions = useMemo(() => {
    const s: string[] = [];
    if (numeric[0]) s.push(`Calculate total ${numeric[0]}`);
    if (numeric[1]) s.push(`Average of ${numeric[1]}`);
    s.push('How do Pivot Tables work?');
    s.push('Excel keyboard shortcuts');
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
        // Try API first for formula generation
        let apiAnswer = '';
        try {
          const history = messages.map(m => ({ role: m.role, content: m.content }));
          const apiResponse = await askCopilot(`[EXCEL EXPERT MODE] You are an Excel specialist. Generate the exact Excel formula, explain what each part does, give example output. Question: ${question}`, datasetId, history);
          apiAnswer = apiResponse.answer || '';
        } catch {}

        const { formula, explanation } = generateExcelResponse(question, columns, data);
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(), role: 'assistant',
          content: apiAnswer || 'Here\'s the Excel formula for your request:',
          formula, explanation, applied: false,
        }]);
      } else {
        // Try API first for conceptual answers
        let apiAnswer = '';
        try {
          const history = messages.map(m => ({ role: m.role, content: m.content }));
          const apiResponse = await askCopilot(`[EXCEL EXPERT MODE] You are an Excel specialist with deep knowledge. Answer this Excel question thoroughly: ${question}`, datasetId, history);
          apiAnswer = apiResponse.answer || '';
        } catch {}

        const answer = apiAnswer || generateConceptualAnswer(question);
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(), role: 'assistant',
          content: answer,
        }]);
      }
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

  const schemaInfo = columns.length > 0 ? `${columns.length} cols • ${data.length} rows` : 'No dataset';

  return (
    <Card className="bg-card border-border h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-500" />Excel Formula Bot
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px] font-mono">{schemaInfo}</Badge>
            <Badge variant="outline" className="text-xs">Excel Expert</Badge>
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
                <p className="text-sm text-muted-foreground mt-1">Ask me anything about Excel — formulas, features, shortcuts, and troubleshooting.</p>
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
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
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
                    <p className="text-sm text-muted-foreground">Thinking...</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
        <div className="p-4 border-t border-border">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask anything about Excel..." disabled={isLoading} className="flex-1 text-sm" />
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
