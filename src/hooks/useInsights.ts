import { useState } from 'react';
import { generateInsights as apiGenerateInsights, Insight } from '@/lib/api';
import { generateLocalInsights } from '@/lib/insightsEngine';
import { useSubscription } from './useSubscription';
import { toast } from '@/hooks/use-toast';

export function useInsights() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const { consumeCredits } = useSubscription();

  const generateInsights = async (datasetId: string, data?: Record<string, unknown>[]): Promise<Insight[]> => {
    if (!consumeCredits('generate-insights')) {
      return [];
    }

    setIsGenerating(true);

    try {
      const result = await apiGenerateInsights(datasetId);
      
      if (result.insights && result.insights.length > 0) {
        setInsights(result.insights);
        toast({
          title: 'Insights Generated',
          description: `Discovered ${result.insights.length} insights from your data`
        });
        return result.insights;
      }

      throw new Error('Backend unavailable');
    } catch {
      // Local fallback
      if (data && data.length > 0) {
        const localInsights = generateLocalInsights(datasetId, data);
        setInsights(localInsights);
        toast({
          title: 'Insights Generated',
          description: `Discovered ${localInsights.length} insights from your data`
        });
        return localInsights;
      }

      toast({
        title: 'Generation Failed',
        description: 'No data available for analysis.',
        variant: 'destructive'
      });
      return [];
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    isGenerating,
    insights,
    generateInsights,
    setInsights,
  };
}
