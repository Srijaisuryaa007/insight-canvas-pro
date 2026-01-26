import { useState, useEffect } from 'react';
import { 
  Lightbulb, 
  TrendingUp, 
  AlertTriangle, 
  BarChart3,
  Loader2,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useCredits } from '@/hooks/useCredits';
import { Insight, ChartType, CHART_LABELS } from '@/types';
import { generateMockData } from '@/lib/dataParser';
import { cn } from '@/lib/utils';

export default function Insights() {
  const { currentDataset, datasets, selectDataset, insights, setInsights } = useWorkspace();
  const { consumeCredits, getCreditCost } = useCredits();
  const [isGenerating, setIsGenerating] = useState(false);
  const [demoInsights, setDemoInsights] = useState<Insight[]>([]);

  useEffect(() => {
    // Generate demo insights
    const mockInsights: Insight[] = [
      {
        id: '1',
        datasetId: 'demo',
        type: 'trend',
        title: 'Revenue Growing Steadily',
        description: 'Revenue has increased by 15% over the analyzed period, with Electronics leading the growth.',
        confidence: 0.92,
        chartType: 'line',
        config: {},
      },
      {
        id: '2',
        datasetId: 'demo',
        type: 'correlation',
        title: 'Strong Price-Quantity Relationship',
        description: 'There is a strong negative correlation (-0.78) between quantity sold and unit price.',
        confidence: 0.85,
        chartType: 'scatter',
        config: {},
      },
      {
        id: '3',
        datasetId: 'demo',
        type: 'anomaly',
        title: 'Unusual Spike Detected',
        description: 'An unusual spike in sales was detected on March 15th, 3.2x above average.',
        confidence: 0.88,
        chartType: 'bar',
        config: {},
      },
      {
        id: '4',
        datasetId: 'demo',
        type: 'distribution',
        title: 'Regional Performance Varies',
        description: 'The North region accounts for 35% of total revenue, while East underperforms at 12%.',
        confidence: 0.95,
        chartType: 'pie',
        config: {},
      },
    ];
    setDemoInsights(mockInsights);
  }, []);

  const handleGenerateInsights = async () => {
    if (!currentDataset) return;
    if (!consumeCredits('generate-insights')) return;

    setIsGenerating(true);

    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 3000));

    const generatedInsights: Insight[] = [
      {
        id: crypto.randomUUID(),
        datasetId: currentDataset.id,
        type: 'trend',
        title: 'Upward Trend Detected',
        description: `Analysis of ${currentDataset.name} shows a positive trend in numeric columns over time.`,
        confidence: 0.87,
        chartType: 'line',
        config: {},
      },
      {
        id: crypto.randomUUID(),
        datasetId: currentDataset.id,
        type: 'distribution',
        title: 'Data Distribution Analysis',
        description: `The dataset shows a varied distribution across ${currentDataset.columns.length} columns.`,
        confidence: 0.91,
        chartType: 'bar',
        config: {},
      },
    ];

    setInsights(currentDataset.id, generatedInsights);
    setIsGenerating(false);
  };

  const getTypeIcon = (type: Insight['type']) => {
    switch (type) {
      case 'trend': return TrendingUp;
      case 'anomaly': return AlertTriangle;
      case 'correlation': return BarChart3;
      default: return Lightbulb;
    }
  };

  const getTypeBadgeColor = (type: Insight['type']) => {
    switch (type) {
      case 'trend': return 'bg-emerald-500/20 text-emerald-600';
      case 'anomaly': return 'bg-amber-500/20 text-amber-600';
      case 'correlation': return 'bg-blue-500/20 text-blue-600';
      default: return 'bg-primary/20 text-primary';
    }
  };

  const currentInsights = currentDataset 
    ? insights[currentDataset.id] || [] 
    : demoInsights;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Lightbulb className="h-7 w-7 text-amber-500" />
            AI Insights
          </h1>
          <p className="text-muted-foreground">
            Discover hidden patterns and trends in your data
          </p>
        </div>
        {currentDataset && (
          <Button 
            onClick={handleGenerateInsights}
            disabled={isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Insights ({getCreditCost('generate-insights')} credits)
              </>
            )}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Dataset Selection */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Select Dataset</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <button
                onClick={() => {}}
                className={cn(
                  "w-full p-3 rounded-lg text-left transition-colors",
                  !currentDataset 
                    ? "bg-primary/10 border border-primary/20" 
                    : "hover:bg-muted"
                )}
              >
                <span className="text-sm font-medium">Demo Data</span>
              </button>
              {datasets.map(ds => (
                <button
                  key={ds.id}
                  onClick={() => selectDataset(ds.id)}
                  className={cn(
                    "w-full p-3 rounded-lg text-left transition-colors",
                    currentDataset?.id === ds.id 
                      ? "bg-primary/10 border border-primary/20" 
                      : "hover:bg-muted"
                  )}
                >
                  <span className="text-sm font-medium">{ds.name}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Insights Grid */}
        <div className="lg:col-span-3">
          {currentInsights.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg">No Insights Yet</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Generate insights to discover patterns in your data
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentInsights.map(insight => {
                const Icon = getTypeIcon(insight.type);
                return (
                  <Card key={insight.id} className="bg-card border-border">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium truncate">{insight.title}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {insight.description}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge className={cn("text-xs", getTypeBadgeColor(insight.type))}>
                              {insight.type}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {CHART_LABELS[insight.chartType]}
                            </Badge>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {Math.round(insight.confidence * 100)}% confidence
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
