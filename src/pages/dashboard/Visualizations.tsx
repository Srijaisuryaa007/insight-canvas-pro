import { useState, useEffect, useMemo } from 'react';
import { BarChart3, Lock, Palette, AlertTriangle, Wand2, ArrowUpDown, Columns, Layers } from 'lucide-react';
import { VisualizationEngine } from '@/components/charts/VisualizationEngine';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useData } from '@/contexts/DataContext';
import { useSubscription } from '@/hooks/useSubscription';
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
  donut: 'Donut Chart', 'stacked-bar': 'Stacked Bar', 'grouped-bar': 'Grouped Bar',
  'stacked-area': 'Stacked Area', pareto: 'Pareto Chart', bullet: 'Bullet',
  progress: 'Progress', 'kpi-card': 'KPI Card',
};

const NEEDS_NUMERIC_XY = ['scatter', 'bubble'];
const NEEDS_NUMERIC_Y = ['bar', 'line', 'area', 'histogram', 'boxplot', 'waterfall', 'pareto', 'gauge', 'bullet', 'progress', 'kpi-card', 'funnel', 'treemap', 'heatmap', 'candlestick', 'stacked-bar', 'grouped-bar', 'stacked-area'];
const NEEDS_CATEGORIES = ['pie', 'donut', 'radar', 'polar'];

function getSuitabilityWarning(chartType: string, data: Record<string, unknown>[], xAxis: string, yAxis: string): string | null {
  if (!data.length) return 'No data available. Upload or select a dataset.';
  if (!xAxis || !yAxis) return 'Select both X and Y axis columns.';
  const hasNumericY = data.some(d => typeof d[yAxis] === 'number');
  const hasNumericX = data.some(d => typeof d[xAxis] === 'number');
  const uniqueX = new Set(data.map(d => String(d[xAxis]))).size;
  if (NEEDS_NUMERIC_XY.includes(chartType)) {
    if (!hasNumericX) return `"${xAxis}" must be numeric for ${ALL_CHART_LABELS[chartType]}.`;
    if (!hasNumericY) return `"${yAxis}" must be numeric for ${ALL_CHART_LABELS[chartType]}.`;
  }
  if (NEEDS_NUMERIC_Y.includes(chartType) && !hasNumericY) return `"${yAxis}" is not numeric. ${ALL_CHART_LABELS[chartType]} requires numeric Y values.`;
  if (NEEDS_CATEGORIES.includes(chartType) && uniqueX > 50) return `${ALL_CHART_LABELS[chartType]} works best with < 50 categories. "${xAxis}" has ${uniqueX}.`;
  if (chartType === 'boxplot' && data.length < 5) return 'Box Plot requires at least 5 data points.';
  if (['radar', 'polar'].includes(chartType) && data.length < 3) return `${ALL_CHART_LABELS[chartType]} requires at least 3 categories.`;
  return null;
}

function recommendCharts(data: Record<string, unknown>[]): Array<{ type: string; reason: string; score: number }> {
  if (!data.length) return [];
  const keys = Object.keys(data[0]);
  const numCols = keys.filter(k => typeof data[0][k] === 'number');
  const strCols = keys.filter(k => typeof data[0][k] === 'string');
  const uniqueCategories = strCols.length > 0 ? new Set(data.map(r => String(r[strCols[0]]))).size : 0;
  const rowCount = data.length;
  const recs: Array<{ type: string; reason: string; score: number }> = [];

  if (numCols.length >= 1 && strCols.length >= 1) {
    recs.push({ type: 'bar', reason: `Compare ${numCols[0]} across ${strCols[0]} categories`, score: 90 });
    recs.push({ type: 'line', reason: `Track ${numCols[0]} trend over ${strCols[0]}`, score: 85 });
  }
  if (uniqueCategories > 0 && uniqueCategories <= 10) {
    recs.push({ type: 'pie', reason: `Show composition across ${uniqueCategories} ${strCols[0]} values`, score: 80 });
    recs.push({ type: 'donut', reason: `Ring chart for ${strCols[0]} distribution`, score: 78 });
  }
  if (numCols.length >= 2) {
    recs.push({ type: 'scatter', reason: `Correlate ${numCols[0]} vs ${numCols[1]}`, score: 82 });
  }
  if (numCols.length >= 1) {
    recs.push({ type: 'area', reason: `Visualize ${numCols[0]} volume over time`, score: 75 });
    recs.push({ type: 'histogram', reason: `Distribution of ${numCols[0]} values`, score: 70 });
  }
  if (rowCount > 20 && numCols.length >= 1 && strCols.length >= 1) {
    recs.push({ type: 'heatmap', reason: `Density map of ${numCols[0]} by categories`, score: 65 });
    recs.push({ type: 'treemap', reason: `Hierarchical view of ${numCols[0]}`, score: 60 });
  }
  if (uniqueCategories >= 3 && uniqueCategories <= 8 && numCols.length >= 1) {
    recs.push({ type: 'radar', reason: `Multi-axis comparison across ${uniqueCategories} categories`, score: 68 });
    recs.push({ type: 'funnel', reason: `Stage-wise flow from ${strCols[0]}`, score: 55 });
  }

  return recs.sort((a, b) => b.score - a.score).slice(0, 6);
}

export default function Visualizations() {
  const { datasets, currentDataset, currentData, selectDataset } = useData();
  const { plan, isChartAvailable, getAvailableCharts } = useSubscription();

  const [selectedChart, setSelectedChart] = useState('bar');
  const [xAxis, setXAxis] = useState('');
  const [yAxis, setYAxis] = useState('');
  const [colorPalette, setColorPalette] = useState('default');
  const [aggregation, setAggregation] = useState('sum');
  const [showLegend, setShowLegend] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(false);
  const [sortColumn, setSortColumn] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [topN, setTopN] = useState('');
  const [configTab, setConfigTab] = useState('axes');

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

  const suitabilityWarning = useMemo(() => getSuitabilityWarning(selectedChart, currentData, xAxis, yAxis), [selectedChart, currentData, xAxis, yAxis]);

  const recommendations = useMemo(() => recommendCharts(currentData), [currentData]);

  const getAggregatedData = () => {
    if (!xAxis || !yAxis || currentData.length === 0) return [];
    let result = currentData.reduce((acc, row) => {
      const key = String(row[xAxis]);
      const val = Number(row[yAxis]) || 0;
      const existing = acc.find((a: any) => a[xAxis] === key);
      if (existing) {
        const prev = Number(existing[yAxis]) || 0;
        switch (aggregation) {
          case 'sum': existing[yAxis] = prev + val; break;
          case 'avg': existing[yAxis] = (prev * (existing._count - 1) + val) / existing._count; break;
          case 'count': existing[yAxis] = existing._count; break;
          case 'min': existing[yAxis] = Math.min(prev, val); break;
          case 'max': existing[yAxis] = Math.max(prev, val); break;
          default: existing[yAxis] = prev + val;
        }
        existing._count = (existing._count || 1) + 1;
      } else {
        acc.push({ [xAxis]: key, [yAxis]: val, _count: 1 });
      }
      return acc;
    }, [] as any[]).map(({ _count, ...rest }: any) => rest);

    if (sortColumn) {
      result.sort((a: any, b: any) => {
        const av = a[sortColumn], bv = b[sortColumn];
        const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
        return sortDirection === 'desc' ? -cmp : cmp;
      });
    }
    if (topN && Number(topN) > 0) {
      result = result.slice(0, Number(topN));
    }
    return result;
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

      {/* Chart Recommendations */}
      {recommendations.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3">
            <div className="flex items-start gap-3">
              <Wand2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium mb-2">Recommended Charts</p>
                <div className="flex flex-wrap gap-2">
                  {recommendations.map(r => (
                    <Button key={r.type} variant={selectedChart === r.type ? 'default' : 'outline'} size="sm"
                      className="text-xs h-7" onClick={() => isChartAvailable(r.type) && setSelectedChart(r.type)}
                      disabled={!isChartAvailable(r.type)} title={r.reason}>
                      {ALL_CHART_LABELS[r.type] || r.type}
                      {!isChartAvailable(r.type) && <Lock className="h-3 w-3 ml-1" />}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{recommendations[0]?.reason}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Chart Types ({allCharts.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[60vh] px-4 pb-4">
              <div className="space-y-1">
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
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-6">
          {/* Advanced Chart Configurer */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Palette className="h-5 w-5" />Chart Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={configTab} onValueChange={setConfigTab}>
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="axes" className="text-xs"><Columns className="h-3 w-3 mr-1" />Axes</TabsTrigger>
                  <TabsTrigger value="style" className="text-xs"><Palette className="h-3 w-3 mr-1" />Style</TabsTrigger>
                  <TabsTrigger value="sort" className="text-xs"><ArrowUpDown className="h-3 w-3 mr-1" />Sort & Filter</TabsTrigger>
                  <TabsTrigger value="advanced" className="text-xs"><Layers className="h-3 w-3 mr-1" />Advanced</TabsTrigger>
                </TabsList>

                <TabsContent value="axes" className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Dataset</Label>
                      <Select value={currentDataset?.id || ''} onValueChange={selectDataset}>
                        <SelectTrigger><SelectValue placeholder="Select dataset" /></SelectTrigger>
                        <SelectContent className="bg-popover">
                          {datasets.map(ds => <SelectItem key={ds.id} value={ds.id}>{ds.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>X Axis (Dimension)</Label>
                      <Select value={xAxis} onValueChange={setXAxis}>
                        <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                        <SelectContent className="bg-popover">
                          {columns.map(col => <SelectItem key={col.name} value={col.name}>{col.name} ({col.type})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Y Axis (Measure)</Label>
                      <Select value={yAxis} onValueChange={setYAxis}>
                        <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                        <SelectContent className="bg-popover">
                          {columns.map(col => <SelectItem key={col.name} value={col.name}>{col.name} ({col.type})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="style" className="mt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Color Theme</Label>
                      <Select value={colorPalette} onValueChange={setColorPalette}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-popover">
                          <SelectItem value="default">Default</SelectItem>
                          <SelectItem value="pastel">Pastel</SelectItem>
                          <SelectItem value="bold">Bold</SelectItem>
                          <SelectItem value="monochrome">Monochrome</SelectItem>
                          <SelectItem value="ocean">Ocean</SelectItem>
                          <SelectItem value="sunset">Sunset</SelectItem>
                          <SelectItem value="gradient">Gradient</SelectItem>
                          <SelectItem value="neon">Neon</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Aggregation</Label>
                      <Select value={aggregation} onValueChange={setAggregation}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-popover">
                          <SelectItem value="sum">Sum</SelectItem>
                          <SelectItem value="avg">Average</SelectItem>
                          <SelectItem value="count">Count</SelectItem>
                          <SelectItem value="min">Min</SelectItem>
                          <SelectItem value="max">Max</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Legend</Label>
                        <Switch checked={showLegend} onCheckedChange={setShowLegend} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Grid</Label>
                        <Switch checked={showGrid} onCheckedChange={setShowGrid} />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Data Labels</Label>
                        <Switch checked={showLabels} onCheckedChange={setShowLabels} />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="sort" className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Sort By</Label>
                      <Select value={sortColumn || '__none__'} onValueChange={v => setSortColumn(v === '__none__' ? '' : v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="None" /></SelectTrigger>
                        <SelectContent className="bg-popover">
                          <SelectItem value="__none__">None</SelectItem>
                          {columns.map(col => <SelectItem key={col.name} value={col.name}>{col.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Direction</Label>
                      <Select value={sortDirection} onValueChange={setSortDirection}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-popover">
                          <SelectItem value="asc">Ascending</SelectItem>
                          <SelectItem value="desc">Descending</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Top N</Label>
                      <Input value={topN} onChange={e => setTopN(e.target.value)} placeholder="All" className="h-9" type="number" min="1" />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="advanced" className="mt-4">
                  <div className="text-sm text-muted-foreground space-y-3">
                    <div className="p-3 rounded-lg bg-muted/40">
                      <p className="font-medium text-foreground mb-1">Conditional Formatting</p>
                      <p className="text-xs">Set threshold rules in the Dashboard Builder widget config panel. Colors auto-applied based on data values.</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40">
                      <p className="font-medium text-foreground mb-1">Drill-down Hierarchy</p>
                      <p className="text-xs">Click data points in the Dashboard Builder to cross-filter across all widgets. Hierarchy traversal is automatic.</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40">
                      <p className="font-medium text-foreground mb-1">Small Multiples</p>
                      <p className="text-xs">Add multiple chart widgets in the Dashboard Builder with the same Y-axis but different X-axis groupings.</p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {suitabilityWarning && (
            <Card className="bg-amber-500/10 border-amber-500/20">
              <CardContent className="py-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-600">Chart Not Suitable</p>
                    <p className="text-xs text-muted-foreground mt-1">{suitabilityWarning}</p>
                    {recommendations.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        💡 Try: {recommendations.slice(0, 3).map(r => ALL_CHART_LABELS[r.type]).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {currentData.length > 0 && !suitabilityWarning ? (
            <VisualizationEngine
              chartType={selectedChart as any}
              data={getAggregatedData()}
              xAxis={xAxis}
              yAxis={yAxis}
              title={`${ALL_CHART_LABELS[selectedChart] || selectedChart}: ${yAxis} by ${xAxis}`}
              height={400}
              colorPalette={colorPalette}
              showLegend={showLegend}
              showGrid={showGrid}
              showLabels={showLabels}
            />
          ) : !suitabilityWarning ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg">No Data</h3>
                <p className="text-muted-foreground text-sm">Upload a dataset and select it to visualize</p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
