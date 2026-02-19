import { Lock, Sparkles } from 'lucide-react';
import { ChartType } from '@/types';
import { useSubscription } from '@/hooks/useSubscription';
import { CHART_TYPES_BY_PLAN, PlanType } from '@/types/subscription';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const ALL_CHART_LABELS: Record<string, string> = {
  bar: 'Bar Chart', line: 'Line Chart', pie: 'Pie Chart', area: 'Area Chart',
  scatter: 'Scatter Plot', radar: 'Radar Chart', heatmap: 'Heatmap', treemap: 'Treemap',
  funnel: 'Funnel', gauge: 'Gauge', boxplot: 'Box Plot', histogram: 'Histogram',
  waterfall: 'Waterfall', bubble: 'Bubble', candlestick: 'Candlestick', sankey: 'Sankey',
  sunburst: 'Sunburst', polar: 'Polar', stream: 'Stream', calendar: 'Calendar',
  geo: 'Geo Map', choropleth: 'Choropleth', network: 'Network', force: 'Force',
  tree: 'Tree', parallel: 'Parallel', 'word-cloud': 'Word Cloud', timeline: 'Timeline',
  '3d-scatter': '3D Scatter', '3d-surface': '3D Surface',
  donut: 'Donut Chart', 'stacked-bar': 'Stacked Bar', 'grouped-bar': 'Grouped Bar',
  'stacked-area': 'Stacked Area', pareto: 'Pareto Chart', bullet: 'Bullet Chart',
  progress: 'Progress Chart', 'kpi-card': 'KPI Card',
};

interface LockedChartProps {
  chartType: ChartType | string;
  title?: string;
  height?: number;
}

function getRequiredPlan(chartType: string): string {
  const planOrder: PlanType[] = ['free', 'basic', 'pro', 'enterprise'];
  for (const plan of planOrder) {
    if (CHART_TYPES_BY_PLAN[plan].includes(chartType)) {
      return plan.charAt(0).toUpperCase() + plan.slice(1);
    }
  }
  return 'Enterprise';
}

export function LockedChart({ chartType, title, height = 300 }: LockedChartProps) {
  const navigate = useNavigate();
  const requiredPlan = getRequiredPlan(chartType);
  const label = ALL_CHART_LABELS[chartType] || chartType;

  return (
    <Card className="bg-card border-border relative overflow-hidden">
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            {title}
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="pt-4">
        <div
          className="flex flex-col items-center justify-center gap-4 bg-muted/30 rounded-lg border-2 border-dashed border-border"
          style={{ height }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-chart-1/5 to-chart-2/5 blur-xl" />

          <div className="relative z-10 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">
                {label} Locked
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Upgrade to <span className="font-medium text-primary">{requiredPlan}</span> to unlock this visualization
              </p>
            </div>

            <Button
              onClick={() => navigate('/dashboard/settings')}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Upgrade to Unlock
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
