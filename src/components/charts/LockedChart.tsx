import { Lock, Sparkles } from 'lucide-react';
import { ChartType, CHART_LABELS } from '@/types';
import { useVisuals } from '@/hooks/useVisuals';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface LockedChartProps {
  chartType: ChartType;
  title?: string;
  height?: number;
}

export function LockedChart({ chartType, title, height = 300 }: LockedChartProps) {
  const { getRequiredPlanForChart } = useVisuals();
  const navigate = useNavigate();
  const requiredPlan = getRequiredPlanForChart(chartType);

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
          {/* Blurred preview background */}
          <div className="absolute inset-0 bg-gradient-to-br from-chart-1/5 to-chart-2/5 blur-xl" />
          
          <div className="relative z-10 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">
                {CHART_LABELS[chartType]} Locked
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
