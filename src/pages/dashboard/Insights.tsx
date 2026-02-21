import { useState } from 'react';
import { 
  Lightbulb, TrendingUp, AlertTriangle, BarChart3, Loader2, Sparkles, Database, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useData } from '@/contexts/DataContext';
import { useInsights } from '@/hooks/useInsights';
import { useSubscription } from '@/hooks/useSubscription';
import { Insight } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export default function Insights() {
  const { datasets, currentDataset, currentData, selectDataset } = useData();
  const { isGenerating, insights, generateInsights } = useInsights();
  const { getCreditCost } = useSubscription();
  const navigate = useNavigate();
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!currentDataset) return;
    await generateInsights(currentDataset.id, currentData);
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

  const handleVisualize = () => {
    navigate('/dashboard/visualizations');
  };

  const getBusinessImpact = (insight: Insight): string => {
    switch (insight.type) {
      case 'trend':
        return `This trend suggests a directional shift in the data. If the pattern continues, decision-makers should consider adjusting strategy accordingly. Monitor for reversal signals.`;
      case 'anomaly':
        return `Anomalies detected may indicate data quality issues, exceptional events, or emerging patterns. Investigate root causes to determine if corrective action is needed.`;
      case 'correlation':
        return `The identified correlation provides leverage for predictive modeling. Changes in one variable may reliably predict changes in the other, enabling proactive decision-making.`;
      default:
        return `This insight reveals an underlying pattern in your data. Use it to inform business strategy, optimize operations, or identify areas requiring attention.`;
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
          <p className="text-muted-foreground">Discover hidden patterns, trends, and anomalies</p>
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
              <p className="text-sm text-muted-foreground text-center py-4">No datasets available.</p>
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
                  {currentDataset ? 'Click "Generate Insights" to analyze your data' : 'Select a dataset first'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{insights.length} insights discovered</p>
                      <p className="text-xs text-muted-foreground">
                        {insights.filter(i => i.type === 'anomaly').length} anomalies • 
                        {insights.filter(i => i.type === 'trend').length} trends • 
                        {insights.filter(i => i.type === 'correlation').length} correlations
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {insights.map((insight: Insight) => {
                const Icon = getTypeIcon(insight.type);
                const isExpanded = expandedInsight === insight.id;
                return (
                  <Card key={insight.id} className="bg-card border-border">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium">{insight.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                          
                          <div className="flex items-center gap-2 flex-wrap mt-3">
                            <Badge className={cn("text-xs", getTypeBadgeColor(insight.type))}>{insight.type}</Badge>
                            <Badge variant="outline" className="text-xs">{insight.chartType}</Badge>
                            <div className="flex items-center gap-1 ml-auto">
                              <span className="text-xs text-muted-foreground">Confidence:</span>
                              <Progress value={insight.confidence * 100} className="h-1.5 w-16" />
                              <span className="text-xs font-medium">{Math.round(insight.confidence * 100)}%</span>
                            </div>
                          </div>

                          <div className="flex gap-2 mt-3">
                            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={handleVisualize}>
                              <Eye className="h-3 w-3" />Visualize
                            </Button>
                            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => setExpandedInsight(isExpanded ? null : insight.id)}>
                              <Lightbulb className="h-3 w-3" />{isExpanded ? 'Hide' : 'Explain'}
                            </Button>
                          </div>

                          {isExpanded && (
                            <div className="mt-3 p-3 rounded-lg bg-muted/50 space-y-3">
                              {insight.reasoning && (
                                <div>
                                  <p className="text-xs font-medium text-foreground mb-1">Statistical Reasoning:</p>
                                  <p className="text-xs text-muted-foreground">{insight.reasoning}</p>
                                </div>
                              )}
                              <div>
                                <p className="text-xs font-medium text-foreground mb-1">Business Impact:</p>
                                <p className="text-xs text-muted-foreground">{getBusinessImpact(insight)}</p>
                              </div>
                              {insight.suggestedActions && insight.suggestedActions.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-foreground mb-1">Recommended Actions:</p>
                                  <ul className="list-disc list-inside space-y-1">
                                    {insight.suggestedActions.map((action, i) => (
                                      <li key={i} className="text-xs text-muted-foreground">{action}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
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
