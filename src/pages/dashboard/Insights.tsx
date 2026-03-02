import { useState } from 'react';
import { 
  Lightbulb, TrendingUp, AlertTriangle, BarChart3, Loader2, Sparkles, Database, Eye,
  ArrowUpRight, ArrowDownRight, Activity, Zap, Target, ShieldAlert
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

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  trend: { icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'Trend' },
  anomaly: { icon: ShieldAlert, color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20', label: 'Anomaly' },
  correlation: { icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20', label: 'Correlation' },
  distribution: { icon: BarChart3, color: 'text-violet-500', bg: 'bg-violet-500/10 border-violet-500/20', label: 'Distribution' },
  risk: { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20', label: 'Risk' },
  opportunity: { icon: Target, color: 'text-primary', bg: 'bg-primary/10 border-primary/20', label: 'Opportunity' },
};

function getBusinessImpact(insight: Insight): string {
  switch (insight.type) {
    case 'trend':
      return 'Directional shift detected. If the pattern continues, consider adjusting strategy. Monitor for reversal signals.';
    case 'anomaly':
      return 'Anomalies may indicate data quality issues, exceptional events, or emerging patterns. Investigate root causes.';
    case 'correlation':
      return 'Identified correlation enables predictive modeling. Changes in one variable may predict changes in the other.';
    default:
      return 'This pattern reveals an underlying data structure. Use it to inform strategy or identify areas for attention.';
  }
}

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Lightbulb className="h-7 w-7 text-amber-500" />
            AI Insights
          </h1>
          <p className="text-muted-foreground">Advanced patterns, risks, and business opportunities</p>
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
              {/* Summary bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['trend', 'anomaly', 'correlation', 'distribution'].map(type => {
                  const count = insights.filter(i => i.type === type).length;
                  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.distribution;
                  const Icon = cfg.icon;
                  return (
                    <Card key={type} className={cn("border", cfg.bg)}>
                      <CardContent className="py-3 flex items-center gap-3">
                        <Icon className={cn("h-5 w-5", cfg.color)} />
                        <div>
                          <p className="text-xl font-bold">{count}</p>
                          <p className="text-xs text-muted-foreground capitalize">{cfg.label}s</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Insight cards — structured, not paragraph */}
              {insights.map((insight: Insight) => {
                const cfg = TYPE_CONFIG[insight.type] || TYPE_CONFIG.distribution;
                const Icon = cfg.icon;
                const isExpanded = expandedInsight === insight.id;
                return (
                  <Card key={insight.id} className="bg-card border-border overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex">
                        {/* Type stripe */}
                        <div className={cn("w-1 shrink-0", cfg.color.replace('text-', 'bg-'))} />

                        <div className="flex-1 p-5">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-start gap-3">
                              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", cfg.bg.split(' ')[0])}>
                                <Icon className={cn("h-4 w-4", cfg.color)} />
                              </div>
                              <div>
                                <h3 className="font-semibold text-sm">{insight.title}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge className={cn("text-[10px] px-1.5 py-0", cfg.bg)} variant="outline">{cfg.label}</Badge>
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">{insight.chartType}</Badge>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Progress value={insight.confidence * 100} className="h-1.5 w-12" />
                              <span className="text-[10px] font-medium text-muted-foreground">{Math.round(insight.confidence * 100)}%</span>
                            </div>
                          </div>

                          {/* Data Evidence */}
                          <div className="rounded-lg bg-muted/40 p-3 mb-3">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Data Evidence</p>
                            <p className="text-sm">{insight.description}</p>
                          </div>

                          {/* Explanation row */}
                          {insight.reasoning && (
                            <div className="rounded-lg bg-muted/30 p-3 mb-3">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Statistical Reasoning</p>
                              <p className="text-xs text-muted-foreground">{insight.reasoning}</p>
                            </div>
                          )}

                          {/* Actions & expand */}
                          <div className="flex items-center gap-2 mt-2">
                            <Button variant="outline" size="sm" className="text-xs gap-1 h-7" onClick={() => navigate('/dashboard/visualizations')}>
                              <Eye className="h-3 w-3" />Visualize
                            </Button>
                            <Button variant="outline" size="sm" className="text-xs gap-1 h-7" onClick={() => setExpandedInsight(isExpanded ? null : insight.id)}>
                              <Zap className="h-3 w-3" />{isExpanded ? 'Collapse' : 'Impact & Actions'}
                            </Button>
                          </div>

                          {isExpanded && (
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="rounded-lg border border-border p-3">
                                <p className="text-xs font-medium mb-1">Business Impact</p>
                                <p className="text-xs text-muted-foreground">{getBusinessImpact(insight)}</p>
                              </div>
                              {insight.suggestedActions && insight.suggestedActions.length > 0 && (
                                <div className="rounded-lg border border-border p-3">
                                  <p className="text-xs font-medium mb-1">Recommended Actions</p>
                                  <ul className="space-y-1">
                                    {insight.suggestedActions.map((action, i) => (
                                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                        <ArrowUpRight className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                                        {action}
                                      </li>
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
