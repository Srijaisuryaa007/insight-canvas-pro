import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, Loader2, Terminal, BarChart3, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/hooks/useSubscription';
import { useData } from '@/contexts/DataContext';
import { processQuery, CopilotMessage } from '@/lib/copilotEngine';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface CopilotChatProps {
  datasetId?: string;
}

export function CopilotChat({ datasetId }: CopilotChatProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { consumeCredits, getCreditCost, credits } = useSubscription();
  const { currentData, currentDataset } = useData();
  const navigate = useNavigate();

  const copilotCost = getCreditCost('copilot-query');

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const getSchema = useCallback(() => {
    if (!currentDataset || !currentData.length) return null;
    return {
      tableName: currentDataset.name?.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() || 'dataset',
      columns: currentDataset.columns || [],
      rowCount: currentDataset.rowCount || currentData.length,
      sampleData: currentData.slice(0, 5),
    };
  }, [currentDataset, currentData]);

  const sendMessage = async (text: string) => {
    if (!consumeCredits('copilot-query')) return;

    const userMessage: CopilotMessage = {
      id: crypto.randomUUID(), role: 'user', content: text, timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    await new Promise(r => setTimeout(r, 300 + Math.random() * 500));

    const schema = getSchema();
    const { answer, metadata } = processQuery(text, schema, currentData, [...messages, userMessage]);

    setMessages(prev => [...prev, {
      id: crypto.randomUUID(), role: 'assistant', content: answer, timestamp: new Date().toISOString(), metadata,
    }]);
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    await sendMessage(input.trim());
  };

  const handleSuggestionClick = (s: string) => {
    if (isLoading) return;
    if (s === 'Import to SQL Engine') {
      const lastSql = [...messages].reverse().find(m => m.metadata?.sqlQuery)?.metadata?.sqlQuery;
      if (lastSql) handleImportToSQL(lastSql);
      return;
    }
    setInput(s);
    inputRef.current?.focus();
  };

  const handleImportToSQL = (sql: string) => {
    sessionStorage.setItem('datapulse_sql_query', sql);
    navigate('/dashboard/sql');
    toast({ title: 'Query imported to SQL Engine' });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  const clearHistory = () => { setMessages([]); toast({ title: 'Chat cleared' }); };

  // ── Render helpers ──

  const renderInline = (text: string) => {
    return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
      if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="px-1 py-0.5 rounded bg-muted font-mono text-xs">{part.slice(1, -1)}</code>;
      return <span key={i}>{part}</span>;
    });
  };

  const renderContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      if (line.startsWith('### ')) return <h3 key={i} className="text-sm font-semibold mt-3 mb-1 text-foreground">{line.replace('### ', '')}</h3>;
      if (line.startsWith('## ')) return <h2 key={i} className="text-base font-bold mt-3 mb-1 text-foreground">{line.replace('## ', '')}</h2>;
      if (line.trim() === '---') return <hr key={i} className="my-2 border-border/50" />;
      if (line.startsWith('```')) return null;
      if (line.startsWith('- ')) return <li key={i} className="text-sm text-muted-foreground ml-4 list-disc">{renderInline(line.slice(2))}</li>;
      if (line.startsWith('> ')) return <blockquote key={i} className="text-xs text-primary border-l-2 border-primary/30 pl-2 my-1">{renderInline(line.slice(2))}</blockquote>;
      if (line.trim() === '') return <div key={i} className="h-1" />;
      return <p key={i} className="text-sm text-muted-foreground">{renderInline(line)}</p>;
    });
  };

  const extractCodeBlocks = (content: string) => {
    const regex = /```(\w*)\n([\s\S]*?)```/g;
    const blocks: { before: string; code: string; lang: string; after: string }[] = [];
    let last = 0;
    let match;
    while ((match = regex.exec(content)) !== null) {
      blocks.push({ before: content.slice(last, match.index), code: match[2].trim(), lang: match[1] || 'text', after: '' });
      last = match.index + match[0].length;
    }
    if (blocks.length === 0) return [{ before: content, code: '', lang: '', after: '' }];
    if (last < content.length) blocks[blocks.length - 1].after = content.slice(last);
    return blocks;
  };

  const renderMessage = (msg: CopilotMessage) => {
    if (msg.role === 'user') return <p className="text-sm">{msg.content}</p>;
    const blocks = extractCodeBlocks(msg.content);
    const sqlQuery = msg.metadata?.sqlQuery;

    return (
      <div className="space-y-1">
        {blocks.map((b, i) => (
          <div key={i}>
            {b.before && <div>{renderContent(b.before)}</div>}
            {b.code && (
              <div className="my-2 rounded-lg overflow-hidden border border-border">
                <div className="flex items-center justify-between px-3 py-1.5 bg-muted/80">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">{b.lang}</span>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => handleCopy(b.code)}><Copy className="h-3 w-3" /></Button>
                    {b.lang === 'sql' && (
                      <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => handleImportToSQL(b.code)}><Terminal className="h-3 w-3" /></Button>
                    )}
                  </div>
                </div>
                <pre className="p-3 text-xs font-mono bg-muted/30 overflow-x-auto whitespace-pre-wrap">{b.code}</pre>
              </div>
            )}
            {b.after && <div>{renderContent(b.after)}</div>}
          </div>
        ))}
        {sqlQuery && (
          <Button size="sm" variant="outline" className="mt-2 text-xs gap-1.5" onClick={() => handleImportToSQL(sqlQuery)}>
            <Terminal className="h-3.5 w-3.5" /> Import to SQL Engine
          </Button>
        )}
        {msg.metadata?.sqlLevel && (
          <Badge variant="secondary" className="text-[9px] mt-1 ml-1">{msg.metadata.sqlLevel}</Badge>
        )}
        {msg.metadata?.chartRecommendation && (
          <Badge variant="outline" className="text-[9px] mt-1 ml-1 gap-0.5">
            <BarChart3 className="h-2.5 w-2.5" />{msg.metadata.chartRecommendation.type} chart
          </Badge>
        )}
      </div>
    );
  };

  const quickSuggestions = [
    'Hi, what can you do?',
    'Show all data',
    'Top 10 by value',
    'Generate CTE query',
  ];

  return (
    <Card className="bg-card border-border h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> AI Copilot
          </CardTitle>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={clearHistory}><Trash2 className="h-3.5 w-3.5" /></Button>
            )}
            <Badge variant="outline" className="text-xs">{copilotCost} credits/query</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="py-8 text-center space-y-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">AI Analytics Assistant</h3>
                <p className="text-sm text-muted-foreground mt-1">Chat naturally or ask about your data — I generate SQL at 7 complexity levels!</p>
                {currentDataset && (
                  <p className="text-xs text-primary mt-2">📊 <strong>{currentDataset.name}</strong> loaded ({currentDataset.rowCount} rows, {currentDataset.columns?.length} cols)</p>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Try saying:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {quickSuggestions.map((s, i) => (
                    <Button key={i} variant="outline" size="sm" className="text-xs" onClick={() => handleSuggestionClick(s)} disabled={isLoading}>{s}</Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {messages.map(msg => (
                <div key={msg.id} className={cn("flex gap-3", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className="max-w-[85%]">
                    <div className={cn("rounded-lg px-4 py-2.5", msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted/60')}>
                      {renderMessage(msg)}
                    </div>
                    {msg.metadata && msg.role === 'assistant' && (
                      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                        <Badge variant={msg.metadata.mode === 'data-analysis' ? 'default' : 'secondary'} className="text-[9px] h-4">
                          {msg.metadata.mode === 'data-analysis' ? '📊 Data Analysis' : '💬 Chat'}
                        </Badge>
                        {msg.metadata.confidence !== undefined && (
                          <span className="text-[10px] text-muted-foreground">{Math.round(msg.metadata.confidence * 100)}% confidence</span>
                        )}
                      </div>
                    )}
                    {msg.metadata?.suggestions && msg.role === 'assistant' && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {msg.metadata.suggestions.map((s, i) => (
                          <Button key={i} variant="outline" size="sm" className="text-[10px] h-6 px-2" onClick={() => handleSuggestionClick(s)} disabled={isLoading}>{s}</Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-primary animate-spin" />
                  </div>
                  <div className="bg-muted/60 rounded-lg px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Analyzing</span>
                      <span className="flex gap-0.5">
                        {[0, 150, 300].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t border-border">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              placeholder={currentDataset ? `Ask about ${currentDataset.name} or chat...` : "Say hi or ask anything..."}
              disabled={isLoading} className="flex-1" />
            <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {credits === Infinity ? 'Unlimited' : credits} credits • Natural conversation + 7-level SQL generation
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
