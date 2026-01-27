import { useState } from 'react';
import { askCopilot as apiAskCopilot, CopilotResponse } from '@/lib/api';
import { useSubscription } from './useSubscription';

interface CopilotMessage {
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

export function useCopilot() {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { consumeCredits } = useSubscription();

  const askCopilot = async (question: string, datasetId?: string): Promise<CopilotResponse | null> => {
    if (!consumeCredits('copilot-query')) {
      return null;
    }

    setIsLoading(true);

    const userMessage: CopilotMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const response = await apiAskCopilot(question, datasetId, history);

      const assistantMessage: CopilotMessage = {
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

      setIsLoading(false);
      return response;
    } catch (error) {
      console.error('Copilot error:', error);
      setIsLoading(false);
      return null;
    }
  };

  const clearHistory = () => {
    setMessages([]);
  };

  return {
    messages,
    isLoading,
    askCopilot,
    clearHistory,
  };
}
