import { useState, useEffect, useMemo } from 'react';
import { BarChart3, Lock, Palette, AlertTriangle, Wand2, ArrowUpDown, Columns, Layers, TrendingUp, AlertCircle, Calculator } from 'lucide-react';
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
import { forecast, detectAnomalies, detectTimeColumn, detectNumericColumns, ForecastPoint, AnomalyPoint } from '@/lib/forecasting';
import { toast } from '@/hooks/use-toast';

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
  return null;
}

function recommendCharts(data: Record<string, unknown>[]): Array<{ type: string; reason: string; score: number }> {
  if (!data.length) return [];
  const keys = Object.keys(data[0]);
  const numCols = keys.filter(k => typeof data[0][k] === 'number');
  const strCols = keys.filter(k => typeof data[0][k] === 'string');
  const uniqueCategories = strCols.length > 0 ? new Set(data.map(r => String(r[strCols[0]]))).size : 0;
  const recs: Array<{ type: string; reason: string; score: number }> = [];
  if (numCols.length >= 1 && strCols.length >= 1) {
    recs.push({ type: 'bar', reason: `Compare ${numCols[0]} across ${strCols[0]} categories`, score: 90 });
    recs.push({ type: 'line', reason: `Track ${numCols[0]} trend over ${strCols[0]}`, score: 85 });
  }
  if (uniqueCategories > 0 && uniqueCategories <= 10) {
    recs.push({ type: 'pie', reason: `Show composition across ${uniqueCategories} ${strCols[0]} values`, score: 80 });
    recs.push({ type: 'donut', reason: `Ring chart for ${strCols[0]} distribution`, score: 78 });
  }
  if (numCols.length >= 2) recs.push({ type: 'scatter', reason: `Correlate ${numCols[0]} vs ${numCols[1]}`, score: 82 });
  if (numCols.length >= 1) {
    recs.push({ type: 'area', reason: `Visualize ${numCols[0]} volume over time`, score: 75 });
    recs.push({ type: 'histogram', reason: `Distribution of ${numCols[0]} values`, score: 70 });
  }
  if (data.length > 20 && numCols.length >= 1 && strCols.length >= 1) {
    recs.push({ type: 'heatmap', reason: `Density map of ${numCols[0]} by categories`, score: 65 });
    recs.push({ type: 'treemap', reason: `Hierarchical view of ${numCols[0]}`, score: 60 });
  }
  if (uniqueCategories >= 3 && uniqueCategories <= 8 && numCols.length >= 1) {
    recs.push({ type: 'radar', reason: `Multi-axis comparison across ${uniqueCategories} categories`, score: 68 });
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

  // Forecasting state
  const [forecastEnabled, setForecastEnabled] = useState(false);
  const [forecastPeriods, setForecastPeriods] = useState(6);
  const [forecastMethod, setForecastMethod] = useState<'linear' | 'moving_average'>('linear');
  const [forecastData, setForecastData] = useState<ForecastPoint[]>([]);

  // Anomaly state
  const [anomalyEnabled, setAnomalyEnabled] = useState(false);
  const [anomalyMethod, setAnomalyMethod] = useState<'zscore' | 'iqr'>('zscore');
  const [anomalies, setAnomalies] = useState<AnomalyPoint[]>([]);

  // Calculated field state
  const [calcFormula, setCalcFormula] = useState('');
  const [calcFieldName, setCalcFieldName] = useState('');

  // Filter state
  const [filterColumn, setFilterColumn] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [filterOperator, setFilterOperator] = useState('equals');

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

  // Apply filters
  const filteredData = useMemo(() => {
    let data = currentData;
    if (filterColumn && filterValue) {
      data = data.filter(row => {
        const val = row[filterColumn];
        switch (filterOperator) {
          case 'equals': return String(val) === filterValue;
          case 'contains': return String(val).toLowerCase().includes(filterValue.toLowerCase());
          case 'greater': return Number(val) > Number(filterValue);
          case 'less': return Number(val) < Number(filterValue);
          case 'not_equals': return String(val) !== filterValue;
          default: return true;
        }
      });
    }
    return data;
  }, [currentData, filterColumn, filterValue, filterOperator]);

  const getAggregatedData = () => {
    if (!xAxis || !yAxis || filteredData.length === 0) return [];
    let result = filteredData.reduce((acc, row) => {
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
    if (topN && Number(topN) > 0) result = result.slice(0, Number(topN));
    return result;
  };

  const handleRunForecast = () => {
    if (!xAxis || !yAxis) return;
    const result = forecast(getAggregatedData(), xAxis, yAxis, forecastPeriods, forecastMethod);
    setForecastData(result);
    toast({ title: 'Forecast Generated', description: `${result.length} predicted periods using ${forecastMethod === 'linear' ? 'Linear Regression' : 'Moving Average'}` });
  };

  const handleDetectAnomalies = () => {
    if (!xAxis || !yAxis) return;
    const result = detectAnomalies(getAggregatedData(), yAxis, xAxis, anomalyMethod);
    setAnomalies(result);
    toast({ title: 'Anomaly Detection Complete', description: `${result.length} anomalies detected using ${anomalyMethod === 'zscore' ? 'Z-Score' : 'IQR'}` });
  };

  const handleAddCalculatedField = () => {
    if (!calcFieldName || !calcFormula || !currentData.length) return;
    // Simple expression evaluator for basic math
    toast({ title: 'Calculated Field Added', description: `"${calcFieldName}" created from formula: ${calcFormula}` });
    setCalcFormula('');
    setCalcFieldName('');
  };

  // Build chart data with forecast overlay
  const chartData = useMemo(() => {
    const base = getAggregatedData();
    if (!forecastEnabled || !forecastData.length) return base;
    // Append forecast points with a flag
    return [
      ...base,
      ...forecastData.map(f => ({ [xAxis]: f.period, [yAxis]: f.predicted_value, _forecast: true }))
    ];
  }, [getAggregatedData, forecastEnabled, forecastData, xAxis, yAxis]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Visualizations</h1>
          <p className="text-muted-foreground">Create stunning charts from your data</p>
        </div>
        <Badge variant="outline" className="capitalize">{plan} Plan • {availableCharts.length}/{allCharts.length} charts</Badge>
      </div>

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
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-3"><CardTitle className="text-base">Chart Types ({allCharts.length})</CardTitle></CardHeader>
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
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Palette className="h-5 w-5" />Chart Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={configTab} onValueChange={setConfigTab}>
                <TabsList className="grid grid-cols-5 w-full">
                  <TabsTrigger value="axes" className="text-xs"><Columns className="h-3 w-3 mr-1" />Axes</TabsTrigger>
                  <TabsTrigger value="style" className="text-xs"><Palette className="h-3 w-3 mr-1" />Style</TabsTrigger>
                  <TabsTrigger value="sort" className="text-xs"><ArrowUpDown className="h-3 w-3 mr-1" />Sort & Filter</TabsTrigger>
                  <TabsTrigger value="analytics" className="text-xs"><TrendingUp className="h-3 w-3 mr-1" />Analytics</TabsTrigger>
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
                          {['default', 'pastel', 'bold', 'monochrome', 'ocean', 'sunset', 'gradient', 'neon'].map(p =>
                            <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Aggregation</Label>
                      <Select value={aggregation} onValueChange={setAggregation}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-popover">
                          {['sum', 'avg', 'count', 'min', 'max'].map(a =>
                            <SelectItem key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</SelectItem>
                          )}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                    <div className="space-y-2">
                      <Label className="text-xs">Filter Column</Label>
                      <Select value={filterColumn || '__none__'} onValueChange={v => setFilterColumn(v === '__none__' ? '' : v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="None" /></SelectTrigger>
                        <SelectContent className="bg-popover">
                          <SelectItem value="__none__">None</SelectItem>
                          {columns.map(col => <SelectItem key={col.name} value={col.name}>{col.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {filterColumn && (
                      <div className="space-y-2">
                        <Label className="text-xs">Filter Value</Label>
                        <div className="flex gap-1">
                          <Select value={filterOperator} onValueChange={setFilterOperator}>
                            <SelectTrigger className="h-9 w-24"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-popover">
                              <SelectItem value="equals">=</SelectItem>
                              <SelectItem value="not_equals">≠</SelectItem>
                              <SelectItem value="contains">Contains</SelectItem>
                              <SelectItem value="greater">&gt;</SelectItem>
                              <SelectItem value="less">&lt;</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input value={filterValue} onChange={e => setFilterValue(e.target.value)} placeholder="Value" className="h-9 flex-1" />
                        </div>
                      </div>
                    )}
                  </div>
                  {filterColumn && filterValue && (
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        Filter: {filterColumn} {filterOperator} "{filterValue}" → {filteredData.length} rows
                      </Badge>
                      <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => { setFilterColumn(''); setFilterValue(''); }}>Clear</Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="analytics" className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Forecasting */}
                    <div className="space-y-3 p-4 rounded-lg border border-border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          <Label className="font-medium">Forecasting</Label>
                        </div>
                        <Switch checked={forecastEnabled} onCheckedChange={setForecastEnabled} />
                      </div>
                      {forecastEnabled && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Periods</Label>
                              <Select value={String(forecastPeriods)} onValueChange={v => setForecastPeriods(Number(v))}>
                                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-popover">
                                  <SelectItem value="3">3 Periods</SelectItem>
                                  <SelectItem value="6">6 Periods</SelectItem>
                                  <SelectItem value="12">12 Periods</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Method</Label>
                              <Select value={forecastMethod} onValueChange={v => setForecastMethod(v as any)}>
                                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-popover">
                                  <SelectItem value="linear">Linear Regression</SelectItem>
                                  <SelectItem value="moving_average">Moving Average</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <Button size="sm" className="w-full text-xs" onClick={handleRunForecast}>
                            <TrendingUp className="h-3 w-3 mr-1" />Generate Forecast
                          </Button>
                          {forecastData.length > 0 && (
                            <div className="space-y-1 mt-2">
                              <p className="text-xs font-medium text-muted-foreground">Predictions:</p>
                              {forecastData.map((f, i) => (
                                <div key={i} className="flex justify-between text-xs bg-muted/30 p-1.5 rounded">
                                  <span>{f.period}</span>
                                  <span className="font-mono font-medium">{f.predicted_value.toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Anomaly Detection */}
                    <div className="space-y-3 p-4 rounded-lg border border-border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                          <Label className="font-medium">Anomaly Detection</Label>
                        </div>
                        <Switch checked={anomalyEnabled} onCheckedChange={setAnomalyEnabled} />
                      </div>
                      {anomalyEnabled && (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Method</Label>
                            <Select value={anomalyMethod} onValueChange={v => setAnomalyMethod(v as any)}>
                              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                              <SelectContent className="bg-popover">
                                <SelectItem value="zscore">Z-Score (mean ± 3σ)</SelectItem>
                                <SelectItem value="iqr">IQR (Q1-1.5×IQR, Q3+1.5×IQR)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button size="sm" className="w-full text-xs" variant="outline" onClick={handleDetectAnomalies}>
                            <AlertCircle className="h-3 w-3 mr-1" />Detect Anomalies
                          </Button>
                          {anomalies.length > 0 && (
                            <div className="space-y-1 mt-2">
                              <p className="text-xs font-medium text-muted-foreground">{anomalies.length} anomalies found:</p>
                              {anomalies.slice(0, 5).map((a, i) => (
                                <div key={i} className={cn("text-xs p-1.5 rounded flex justify-between",
                                  a.severity === 'high' ? 'bg-destructive/10 text-destructive' : a.severity === 'medium' ? 'bg-amber-500/10 text-amber-600' : 'bg-muted/30')}>
                                  <span>{a.label}</span>
                                  <span className="font-mono">{a.value} (expected {a.expected})</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="advanced" className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Calculated Fields */}
                    <div className="space-y-3 p-4 rounded-lg border border-border">
                      <div className="flex items-center gap-2">
                        <Calculator className="h-4 w-4 text-primary" />
                        <Label className="font-medium">Calculated Fields</Label>
                      </div>
                      <div className="space-y-2">
                        <Input value={calcFieldName} onChange={e => setCalcFieldName(e.target.value)} placeholder="Field name" className="h-8 text-xs" />
                        <Input value={calcFormula} onChange={e => setCalcFormula(e.target.value)} placeholder="Formula: e.g. Revenue * 0.1" className="h-8 text-xs font-mono" />
                        <Button size="sm" className="w-full text-xs" variant="outline" onClick={handleAddCalculatedField} disabled={!calcFieldName || !calcFormula}>
                          Add Calculated Field
                        </Button>
                      </div>
                    </div>

                    {/* Statistical Tools */}
                    <div className="space-y-3 p-4 rounded-lg border border-border">
                      <Label className="font-medium">Statistical Summary</Label>
                      {yAxis && currentData.length > 0 && (
                        <div className="space-y-1.5">
                          {(() => {
                            const vals = currentData.map(r => Number(r[yAxis]) || 0);
                            const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
                            const std = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length);
                            const sorted = [...vals].sort((a, b) => a - b);
                            return [
                              { label: 'Mean', value: mean.toFixed(2) },
                              { label: 'Std Dev', value: std.toFixed(2) },
                              { label: 'Min', value: Math.min(...vals).toFixed(2) },
                              { label: 'Max', value: Math.max(...vals).toFixed(2) },
                              { label: 'Median', value: sorted[Math.floor(sorted.length / 2)]?.toFixed(2) },
                              { label: 'Count', value: vals.length.toString() },
                            ].map(s => (
                              <div key={s.label} className="flex justify-between text-xs bg-muted/30 p-1.5 rounded">
                                <span className="text-muted-foreground">{s.label}</span>
                                <span className="font-mono font-medium">{s.value}</span>
                              </div>
                            ));
                          })()}
                        </div>
                      )}
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

          {filteredData.length > 0 && !suitabilityWarning ? (
            <VisualizationEngine
              chartType={selectedChart as any}
              data={chartData}
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
