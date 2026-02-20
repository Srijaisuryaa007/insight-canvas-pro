import { ChartType } from '@/types';
import { useSubscription } from '@/hooks/useSubscription';
import { ChartRenderer } from './ChartRenderer';
import { LockedChart } from './LockedChart';
import { useEffect } from 'react';

interface VisualizationEngineProps {
  chartType: ChartType | string;
  data: Record<string, unknown>[];
  xAxis?: string;
  yAxis?: string;
  title?: string;
  height?: number;
  colorPalette?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  showLabels?: boolean;
  onDataClick?: (dataPoint: Record<string, unknown>) => void;
}

export function VisualizationEngine({
  chartType,
  data,
  xAxis,
  yAxis,
  title,
  height = 300,
  colorPalette,
  showLegend = true,
  showGrid = true,
  showLabels = false,
  onDataClick,
}: VisualizationEngineProps) {
  const { isChartAvailable, consumeCredits } = useSubscription();

  const available = isChartAvailable(chartType);

  useEffect(() => {
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
      colorPalette={colorPalette}
      showLegend={showLegend}
      showGrid={showGrid}
      showLabels={showLabels}
      onDataClick={onDataClick}
    />
  );
}
