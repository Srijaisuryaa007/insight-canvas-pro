import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { askCopilot, CopilotResponse } from '@/lib/api';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: {
    confidence?: number;
    reasoning?: string;
    suggestions?: string[];
    chartRecommendation?: { type: string; reason: string };
  };
}

interface CopilotChatProps {
  datasetId?: string;
}

export function CopilotChat({ datasetId }: CopilotChatProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { consumeCredits, getCreditCost, credits, isFeatureAvailable } = useSubscription();

  const copilotCost = getCreditCost('copilot-query');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    if (!consumeCredits('copilot-query')) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const response = await askCopilot(input, datasetId, history);

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.answer,
        timestamp: new Date().toISOString(),
        metadata: {
          confidence: response.confidence,
          reasoning: response.reasoning,
          suggestions: response.suggestions,
          chartRecommendation: response.chartRecommendation,
        },
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Copilot error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = async (suggestion: string) => {
    if (isLoading) return;
    setInput(suggestion);
  };

  const quickSuggestions = [
    'What are the key trends in this data?',
    'Show me data quality issues',
    'What visualization would you recommend?',
    'Find correlations between columns',
  ];

  return (
    <Card className="bg-card border-border h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Copilot
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {copilotCost} credits/query
          </Badge>
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
                <h3 className="font-semibold text-foreground">AI Data Assistant</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Ask questions about your data and get AI-powered insights
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Try asking:</p>
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
                  <div className="max-w-[80%]">
                    <div
                      className={cn(
                        "rounded-lg px-4 py-2",
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      <p className="text-sm">{message.content}</p>
                    </div>
                    
                    {/* AI Explainability */}
                    {message.metadata && message.role === 'assistant' && (
                      <div className="mt-2 space-y-2 text-xs">
                        {message.metadata.confidence !== undefined && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span>Confidence: {Math.round(message.metadata.confidence * 100)}%</span>
                          </div>
                        )}
                        {message.metadata.reasoning && (
                          <div className="text-muted-foreground italic">
                            💡 {message.metadata.reasoning}
                          </div>
                        )}
                        {message.metadata.suggestions && message.metadata.suggestions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {message.metadata.suggestions.map((s, i) => (
                              <Button
                                key={i}
                                variant="outline"
                                size="sm"
                                className="text-xs h-6"
                                onClick={() => handleSuggestionClick(s)}
                              >
                                {s}
                              </Button>
                            ))}
                          </div>
                        )}
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
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <p className="text-sm text-muted-foreground">Analyzing...</p>
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
              placeholder="Ask about your data..."
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
            {credits === Infinity ? 'Unlimited' : credits} credits remaining
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
