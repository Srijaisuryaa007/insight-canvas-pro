import { useState } from 'react';
import { generateInsights as apiGenerateInsights, Insight } from '@/lib/api';
import { useSubscription } from './useSubscription';
import { toast } from '@/hooks/use-toast';

export function useInsights() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const { consumeCredits } = useSubscription();

  const generateInsights = async (datasetId: string): Promise<Insight[]> => {
    if (!consumeCredits('generate-insights')) {
      return [];
    }

    setIsGenerating(true);

    try {
      const result = await apiGenerateInsights(datasetId);
      
      if (result.insights) {
        setInsights(result.insights);
        toast({
          title: 'Insights Generated',
          description: `Discovered ${result.insights.length} insights from your data`
        });
        return result.insights;
      } else {
        toast({
          title: 'Generation Failed',
          description: result.error || 'Unknown error',
          variant: 'destructive'
        });
        return [];
      }
    } catch (error) {
      console.error('Insights error:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
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
