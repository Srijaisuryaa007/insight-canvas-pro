import { useState, useEffect } from 'react';
import { BarChart3, Lock, Sparkles } from 'lucide-react';
import { VisualizationEngine } from '@/components/charts/VisualizationEngine';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useData } from '@/contexts/DataContext';
import { useSubscription } from '@/hooks/useSubscription';
import { CHART_TYPES_BY_PLAN } from '@/types/subscription';
import { cn } from '@/lib/utils';

const ALL_CHART_LABELS: Record<string, string> = {
  bar: 'Bar Chart', line: 'Line Chart', pie: 'Pie Chart', area: 'Area Chart',
  scatter: 'Scatter Plot', radar: 'Radar Chart', heatmap: 'Heatmap', treemap: 'Treemap',
  funnel: 'Funnel', gauge: 'Gauge', boxplot: 'Box Plot', histogram: 'Histogram',
  waterfall: 'Waterfall', bubble: 'Bubble', candlestick: 'Candlestick', sankey: 'Sankey',
  sunburst: 'Sunburst', polar: 'Polar', stream: 'Stream', calendar: 'Calendar',
  geo: 'Geo Map', choropleth: 'Choropleth', network: 'Network', force: 'Force',
  tree: 'Tree', parallel: 'Parallel', 'word-cloud': 'Word Cloud', timeline: 'Timeline',
  '3d-scatter': '3D Scatter', '3d-surface': '3D Surface',
};

export default function Visualizations() {
  const { datasets, currentDataset, currentData, selectDataset } = useData();
  const { plan, isChartAvailable, getAvailableCharts } = useSubscription();

  const [selectedChart, setSelectedChart] = useState('bar');
  const [xAxis, setXAxis] = useState('');
  const [yAxis, setYAxis] = useState('');

  // All 30 chart types
  const allCharts = Object.keys(ALL_CHART_LABELS);
  const availableCharts = getAvailableCharts();

  useEffect(() => {
    if (currentDataset && currentData.length > 0) {
      const keys = Object.keys(currentData[0]);
      const stringKey = keys.find(k => typeof currentData[0][k] === 'string');
      const numKey = keys.find(k => typeof currentData[0][k] === 'number');
      if (stringKey) setXAxis(stringKey);
      if (numKey) setYAxis(numKey);
    }
  }, [currentDataset, currentData]);

  const columns = currentData.length > 0
    ? Object.keys(currentData[0]).map(name => ({
        name,
        type: typeof currentData[0][name] === 'number' ? 'number' as const : 'string' as const
      }))
    : [];

  const getAggregatedData = () => {
    if (!xAxis || !yAxis || currentData.length === 0) return [];
    return currentData.reduce((acc, row) => {
      const key = String(row[xAxis]);
      const val = Number(row[yAxis]) || 0;
      const existing = acc.find((a: any) => a[xAxis] === key);
      if (existing) existing[yAxis] = (Number(existing[yAxis]) || 0) + val;
      else acc.push({ [xAxis]: key, [yAxis]: val });
      return acc;
    }, [] as Record<string, unknown>[]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Visualizations</h1>
          <p className="text-muted-foreground">Create stunning charts from your data</p>
        </div>
        <Badge variant="outline" className="capitalize">{plan} Plan • {availableCharts.length}/{allCharts.length} charts</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="bg-card border-border max-h-[70vh] overflow-y-auto">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Chart Types ({allCharts.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {allCharts.map(chart => {
              const available = isChartAvailable(chart);
              return (
                <button key={chart} onClick={() => available && setSelectedChart(chart)}
                  disabled={!available}
                  className={cn("w-full p-2 rounded-lg text-left transition-colors flex items-center justify-between text-sm",
                    selectedChart === chart ? "bg-primary/10 border border-primary/20"
                      : available ? "hover:bg-muted" : "opacity-40 cursor-not-allowed")}>
                  <span>{ALL_CHART_LABELS[chart] || chart}</span>
                  {!available && <Lock className="h-3 w-3 text-muted-foreground" />}
                </button>
              );
            })}
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-6">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3"><CardTitle className="text-base">Configure Chart</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Dataset</Label>
                  <Select value={currentDataset?.id || ''} onValueChange={(v) => selectDataset(v)}>
                    <SelectTrigger><SelectValue placeholder="Select dataset" /></SelectTrigger>
                    <SelectContent className="bg-popover">
                      {datasets.map(ds => (
                        <SelectItem key={ds.id} value={ds.id}>{ds.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>X Axis</Label>
                  <Select value={xAxis} onValueChange={setXAxis}>
                    <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                    <SelectContent className="bg-popover">
                      {columns.map(col => <SelectItem key={col.name} value={col.name}>{col.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Y Axis</Label>
                  <Select value={yAxis} onValueChange={setYAxis}>
                    <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                    <SelectContent className="bg-popover">
                      {columns.filter(c => c.type === 'number').map(col => <SelectItem key={col.name} value={col.name}>{col.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {currentData.length > 0 ? (
            <VisualizationEngine
              chartType={selectedChart as any}
              data={getAggregatedData()}
              xAxis={xAxis}
              yAxis={yAxis}
              title={`${ALL_CHART_LABELS[selectedChart] || selectedChart}: ${yAxis} by ${xAxis}`}
              height={400}
            />
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg">No Data</h3>
                <p className="text-muted-foreground text-sm">Upload a dataset and select it to visualize</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
