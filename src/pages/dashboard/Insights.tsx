import { useState } from 'react';
import { 
  Lightbulb, TrendingUp, AlertTriangle, BarChart3, Loader2, Sparkles, Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/contexts/DataContext';
import { useInsights } from '@/hooks/useInsights';
import { useSubscription } from '@/hooks/useSubscription';
import { Insight } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function Insights() {
  const { datasets, currentDataset, selectDataset } = useData();
  const { isGenerating, insights, generateInsights } = useInsights();
  const { getCreditCost } = useSubscription();

  const handleGenerate = async () => {
    if (!currentDataset) return;
    await generateInsights(currentDataset.id);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'trend': return TrendingUp;
      case 'anomaly': return AlertTriangle;
      case 'correlation': return BarChart3;
      default: return Lightbulb;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'trend': return 'bg-emerald-500/20 text-emerald-600';
      case 'anomaly': return 'bg-amber-500/20 text-amber-600';
      case 'correlation': return 'bg-blue-500/20 text-blue-600';
      default: return 'bg-primary/20 text-primary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Lightbulb className="h-7 w-7 text-amber-500" />
            AI Insights
          </h1>
          <p className="text-muted-foreground">Discover hidden patterns and trends in your data</p>
        </div>
        {currentDataset && (
          <Button onClick={handleGenerate} disabled={isGenerating} className="gap-2">
            {isGenerating ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Analyzing...</>
            ) : (
              <><Sparkles className="h-4 w-4" />Generate Insights ({getCreditCost('generate-insights')} credits)</>
            )}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Select Dataset</CardTitle>
          </CardHeader>
          <CardContent>
            {datasets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No datasets available. Upload one first.</p>
            ) : (
              <div className="space-y-2">
                {datasets.map(ds => (
                  <button key={ds.id} onClick={() => selectDataset(ds.id)}
                    className={cn("w-full p-3 rounded-lg text-left transition-colors",
                      currentDataset?.id === ds.id ? "bg-primary/10 border border-primary/20" : "hover:bg-muted")}>
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{ds.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-3">
          {insights.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg">No Insights Yet</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {currentDataset ? 'Click Generate Insights to analyze your data' : 'Select a dataset first'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.map((insight: Insight) => {
                const Icon = getTypeIcon(insight.type);
                return (
                  <Card key={insight.id} className="bg-card border-border">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{insight.title}</h3>
                          <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={cn("text-xs", getTypeBadgeColor(insight.type))}>{insight.type}</Badge>
                            <Badge variant="outline" className="text-xs">{insight.chartType}</Badge>
                            <span className="text-xs text-muted-foreground ml-auto">{Math.round(insight.confidence * 100)}% confidence</span>
                          </div>
                          {/* Explainability */}
                          {insight.reasoning && (
                            <p className="text-xs text-muted-foreground mt-2 italic">💡 {insight.reasoning}</p>
                          )}
                          {insight.suggestedActions && insight.suggestedActions.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {insight.suggestedActions.map((action: string, i: number) => (
                                <Badge key={i} variant="secondary" className="text-xs">{action}</Badge>
                              ))}
                            </div>
                          )}
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
