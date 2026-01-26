import { ChartType } from '@/types';
import { useVisuals } from '@/hooks/useVisuals';
import { useCredits } from '@/hooks/useCredits';
import { ChartRenderer } from './ChartRenderer';
import { LockedChart } from './LockedChart';
import { useEffect } from 'react';

interface VisualizationEngineProps {
  chartType: ChartType;
  data: Record<string, unknown>[];
  xAxis?: string;
  yAxis?: string;
  title?: string;
  height?: number;
}

export function VisualizationEngine({
  chartType,
  data,
  xAxis,
  yAxis,
  title,
  height = 300,
}: VisualizationEngineProps) {
  const { isChartAvailable } = useVisuals();
  const { consumeCredits } = useCredits();

  const available = isChartAvailable(chartType);

  useEffect(() => {
    // Consume credits when chart is rendered (only if available)
    if (available && data.length > 0) {
      consumeCredits('render-chart');
    }
  }, [chartType, data.length]);

  if (!available) {
    return <LockedChart chartType={chartType} title={title} height={height} />;
  }

  return (
    <ChartRenderer
      type={chartType}
      data={data}
      xAxis={xAxis}
      yAxis={yAxis}
      title={title}
      height={height}
    />
  );
}
