import { useState } from 'react';
import { useCredits } from './useCredits';

interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface CopilotResponse {
  answer: string;
  suggestions?: string[];
  chartRecommendation?: {
    type: string;
    reason: string;
  };
}

export function useCopilot() {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { consumeCredits } = useCredits();

  const askCopilot = async (question: string, datasetId?: string): Promise<CopilotResponse | null> => {
    // Check and consume credits
    if (!consumeCredits('copilot-query')) {
      return null;
    }

    setIsLoading(true);

    // Add user message
    const userMessage: CopilotMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Simulate AI response - placeholder for real AI integration
    await new Promise(resolve => setTimeout(resolve, 1500));

    const mockResponses: Record<string, CopilotResponse> = {
      default: {
        answer: "I've analyzed your query. Based on the data patterns, I recommend exploring the correlation between your numeric columns. Would you like me to generate a visualization?",
        suggestions: [
          'Show me the distribution of values',
          'What are the top trends?',
          'Identify any anomalies',
        ],
        chartRecommendation: {
          type: 'bar',
          reason: 'Bar charts are ideal for comparing categorical data',
        },
      },
      trend: {
        answer: "Looking at the temporal patterns in your data, I can see a clear upward trend over the last period. The growth rate appears to be approximately 15% month-over-month.",
        suggestions: [
          'Generate a forecast',
          'What factors drive this trend?',
          'Compare with previous period',
        ],
        chartRecommendation: {
          type: 'line',
          reason: 'Line charts best represent trends over time',
        },
      },
      quality: {
        answer: "I've identified some data quality issues. There are missing values in 3 columns and potential outliers in the numeric fields. I can help you clean this data.",
        suggestions: [
          'Fix missing values',
          'Remove outliers',
          'Standardize formats',
        ],
      },
    };

    const responseKey = question.toLowerCase().includes('trend') ? 'trend' 
      : question.toLowerCase().includes('quality') ? 'quality' 
      : 'default';

    const response = mockResponses[responseKey];

    // Add assistant message
    const assistantMessage: CopilotMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: response.answer,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, assistantMessage]);

    setIsLoading(false);
    return response;
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
