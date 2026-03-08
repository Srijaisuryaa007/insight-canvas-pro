import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, Loader2, Terminal, BarChart3, Copy, Trash2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/hooks/useSubscription';
import { useData } from '@/contexts/DataContext';
import { processQuery, CopilotMessage, CopilotMetadata } from '@/lib/copilotEngine';
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
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    await sendMessage(input.trim());
  };

  const sendMessage = async (text: string) => {
    if (!consumeCredits('copilot-query')) return;

    const userMessage: CopilotMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate brief thinking delay for natural feel
    await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 600));

    const schema = getSchema();
    const { answer, metadata } = processQuery(text, schema, currentData, [...messages, userMessage]);

    const assistantMessage: CopilotMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: answer,
      timestamp: new Date().toISOString(),
      metadata,
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsLoading(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (isLoading) return;
    setInput(suggestion);
    inputRef.current?.focus();
  };

  const handleImportToSQL = (sql: string) => {
    sessionStorage.setItem('datapulse_sql_query', sql);
    navigate('/dashboard/sql');
    toast({ title: 'Query imported to SQL Engine', description: 'Switch to SQL Engine tab to run the query.' });
  };

  const handleCopySQL = (sql: string) => {
    navigator.clipboard.writeText(sql);
    toast({ title: 'SQL Copied to clipboard' });
  };

  const clearHistory = () => {
    setMessages([]);
    toast({ title: 'Chat cleared' });
  };

  const quickSuggestions = [
    'Hi, what can you do?',
    'What are the key trends?',
    'Show me top 10 records',
    'Generate a summary query',
  ];

  // Render markdown-like content
  const renderContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, i) => {
      // Headers
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-sm font-semibold mt-3 mb-1 text-foreground">{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-base font-bold mt-3 mb-1 text-foreground">{line.replace('## ', '')}</h2>;
      }
      // Horizontal rule
      if (line.trim() === '---') {
        return <hr key={i} className="my-2 border-border/50" />;
      }
      // Code block
      if (line.startsWith('```')) {
        return null; // handled below
      }
      // List items
      if (line.startsWith('- ')) {
        return <li key={i} className="text-sm text-muted-foreground ml-4 list-disc">{renderInline(line.slice(2))}</li>;
      }
      // Empty line
      if (line.trim() === '') {
        return <div key={i} className="h-1" />;
      }
      // Normal text
      return <p key={i} className="text-sm text-muted-foreground">{renderInline(line)}</p>;
    });
  };

  // Render inline markdown (bold, code)
  const renderInline = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="px-1 py-0.5 rounded bg-muted font-mono text-xs">{part.slice(1, -1)}</code>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  // Extract SQL code blocks
  const extractCodeBlocks = (content: string): { before: string; code: string; language: string; after: string }[] => {
    const regex = /```(\w*)\n([\s\S]*?)```/g;
    const blocks: { before: string; code: string; language: string; after: string }[] = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      blocks.push({
        before: content.slice(lastIndex, match.index),
        code: match[2].trim(),
        language: match[1] || 'text',
        after: '',
      });
      lastIndex = match.index + match[0].length;
    }

    if (blocks.length === 0) {
      return [{ before: content, code: '', language: '', after: '' }];
    }

    // Set the 'after' of the last block
    if (lastIndex < content.length) {
      blocks[blocks.length - 1].after = content.slice(lastIndex);
    }

    return blocks;
  };

  const renderMessage = (message: CopilotMessage) => {
    if (message.role === 'user') {
      return <p className="text-sm">{message.content}</p>;
    }

    const blocks = extractCodeBlocks(message.content);
    const sqlQuery = message.metadata?.sqlQuery;

    return (
      <div className="space-y-1">
        {blocks.map((block, i) => (
          <div key={i}>
            {block.before && <div>{renderContent(block.before)}</div>}
            {block.code && (
              <div className="my-2 rounded-lg overflow-hidden border border-border">
                <div className="flex items-center justify-between px-3 py-1.5 bg-muted/80">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">{block.language}</span>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => handleCopySQL(block.code)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                    {block.language === 'sql' && (
                      <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => handleImportToSQL(block.code)}>
                        <Terminal className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <pre className="p-3 text-xs font-mono bg-muted/30 overflow-x-auto whitespace-pre-wrap">{block.code}</pre>
              </div>
            )}
            {block.after && <div>{renderContent(block.after)}</div>}
          </div>
        ))}

        {/* Import to SQL Engine button */}
        {sqlQuery && (
          <Button size="sm" variant="outline" className="mt-2 text-xs gap-1.5" onClick={() => handleImportToSQL(sqlQuery)}>
            <Terminal className="h-3.5 w-3.5" /> Import to SQL Engine
          </Button>
        )}

        {/* Chart recommendation badge */}
        {message.metadata?.chartRecommendation && (
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] gap-1">
              <BarChart3 className="h-3 w-3" />
              {message.metadata.chartRecommendation.type} chart recommended
            </Badge>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="bg-card border-border h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Copilot
          </CardTitle>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={clearHistory} title="Clear chat">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
            <Badge variant="outline" className="text-xs">
              {copilotCost} credits/query
            </Badge>
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
                <p className="text-sm text-muted-foreground mt-1">
                  Chat naturally or ask about your data — I can do both!
                </p>
                {currentDataset && (
                  <p className="text-xs text-primary mt-2">
                    📊 Dataset loaded: <strong>{currentDataset.name}</strong> ({currentDataset.rowCount} rows)
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Try saying:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {quickSuggestions.map((suggestion, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => handleSuggestionClick(suggestion)}
                      disabled={isLoading}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className="max-w-[85%]">
                    <div
                      className={cn(
                        "rounded-lg px-4 py-2.5",
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/60'
                      )}
                    >
                      {renderMessage(message)}
                    </div>

                    {/* Mode badge + Confidence */}
                    {message.metadata && message.role === 'assistant' && (
                      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                        <Badge variant={message.metadata.mode === 'data-analysis' ? 'default' : 'secondary'} className="text-[9px] h-4">
                          {message.metadata.mode === 'data-analysis' ? '📊 Data Analysis' : '💬 Chat'}
                        </Badge>
                        {message.metadata.confidence !== undefined && (
                          <span className="text-[10px] text-muted-foreground">
                            {Math.round(message.metadata.confidence * 100)}% confidence
                          </span>
                        )}
                      </div>
                    )}

                    {/* Follow-up suggestions */}
                    {message.metadata?.suggestions && message.metadata.suggestions.length > 0 && message.role === 'assistant' && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {message.metadata.suggestions.map((s, i) => (
                          <Button
                            key={i}
                            variant="outline"
                            size="sm"
                            className="text-[10px] h-6 px-2"
                            onClick={() => handleSuggestionClick(s)}
                            disabled={isLoading}
                          >
                            {s}
                          </Button>
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
                      <span className="text-sm text-muted-foreground">Thinking</span>
                      <span className="flex gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '300ms' }} />
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
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={currentDataset ? `Ask about ${currentDataset.name} or chat...` : "Say hi or ask anything..."}
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {credits === Infinity ? 'Unlimited' : credits} credits remaining • Supports natural conversation & data analysis
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
