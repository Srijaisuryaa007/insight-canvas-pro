import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, Lock, Palette, AlertTriangle, Wand2, ArrowUpDown, Columns, Layers,
  TrendingUp, AlertCircle, Calculator, Sparkles, Eye, Download, Copy, ChevronDown,
  Grid3X3, LayoutGrid, Maximize2, Minimize2, Share2, Image, FileText
} from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { useData } from '@/contexts/DataContext';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';
import { forecast, detectAnomalies, ForecastPoint, AnomalyPoint } from '@/lib/forecasting';
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

const CHART_CATEGORIES: Record<string, string[]> = {
  'Comparison': ['bar', 'grouped-bar', 'stacked-bar', 'bullet', 'pareto'],
  'Trend': ['line', 'area', 'stacked-area', 'stream'],
  'Composition': ['pie', 'donut', 'treemap', 'sunburst', 'funnel'],
  'Distribution': ['scatter', 'bubble', 'histogram', 'boxplot', 'heatmap'],
  'Relationship': ['radar', 'polar', 'sankey', 'network', 'force', 'parallel'],
  'Specialized': ['waterfall', 'candlestick', 'gauge', 'progress', 'kpi-card', 'calendar', 'timeline', 'tree', 'word-cloud', 'geo', 'choropleth', '3d-scatter', '3d-surface'],
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
  return recs.sort((a, b) => b.score - a.score).slice(0, 8);
}

// ─── Sub-components ───────────────────────────────────────────────

function ChartTypeSelector({ selectedChart, onSelect, isChartAvailable }: {
  selectedChart: string;
  onSelect: (chart: string) => void;
  isChartAvailable: (chart: string) => boolean;
}) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Comparison');

  return (
    <div className="space-y-1">
      {Object.entries(CHART_CATEGORIES).map(([category, charts]) => (
        <div key={category}>
          <button
            onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>{category}</span>
            <ChevronDown className={cn("h-3 w-3 transition-transform", expandedCategory === category && "rotate-180")} />
          </button>
          <AnimatePresence>
            {expandedCategory === category && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pb-2 space-y-0.5">
                  {charts.map(chart => {
                    const available = isChartAvailable(chart);
                    return (
                      <button
                        key={chart}
                        onClick={() => available && onSelect(chart)}
                        disabled={!available}
                        className={cn(
                          "w-full px-3 py-2 rounded-lg text-left transition-all text-sm flex items-center justify-between group",
                          selectedChart === chart
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : available
                              ? "hover:bg-muted/80 text-foreground"
                              : "opacity-30 cursor-not-allowed"
                        )}
                      >
                        <span className="truncate">{ALL_CHART_LABELS[chart] || chart}</span>
                        {!available && <Lock className="h-3 w-3" />}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

function AIRecommendations({ recommendations, selectedChart, onSelect, isChartAvailable }: {
  recommendations: Array<{ type: string; reason: string; score: number }>;
  selectedChart: string;
  onSelect: (chart: string) => void;
  isChartAvailable: (chart: string) => boolean;
}) {
  if (!recommendations.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-primary/20 bg-primary/[0.03] p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
          <Wand2 className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-sm font-medium">AI Recommended</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {recommendations.map((r, i) => (
          <motion.button
            key={r.type}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => isChartAvailable(r.type) && onSelect(r.type)}
            disabled={!isChartAvailable(r.type)}
            className={cn(
              "relative rounded-lg px-3 py-2.5 text-left transition-all group border",
              selectedChart === r.type
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card hover:bg-muted/50 border-border hover:border-primary/30"
            )}
          >
            <div className="text-xs font-medium truncate">{ALL_CHART_LABELS[r.type]}</div>
            <div className={cn("text-[10px] mt-0.5 truncate",
              selectedChart === r.type ? "text-primary-foreground/70" : "text-muted-foreground"
            )}>{r.reason}</div>
            {!isChartAvailable(r.type) && (
              <Lock className="absolute top-2 right-2 h-3 w-3 text-muted-foreground" />
            )}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

function VisualGallery({ recommendations, chartData, xAxis, yAxis, colorPalette, showLegend, showGrid, showLabels }: {
  recommendations: Array<{ type: string; reason: string; score: number }>;
  chartData: Record<string, unknown>[];
  xAxis: string;
  yAxis: string;
  colorPalette: string;
  showLegend: boolean;
  showGrid: boolean;
  showLabels: boolean;
}) {
  if (!recommendations.length || !chartData.length || !xAxis || !yAxis) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="space-y-6"
    >
      <Separator />
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <LayoutGrid className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Visual Gallery</h2>
            <p className="text-sm text-muted-foreground">
              Alternative visualizations generated from your data
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {recommendations.slice(0, 6).map((rec, i) => (
          <motion.div
            key={rec.type}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08 }}
          >
            <Card className="bg-card border-border overflow-hidden group hover:shadow-md transition-all hover:border-primary/30">
              <div className="px-4 py-3 flex items-center justify-between border-b border-border/50">
                <div>
                  <h3 className="text-sm font-medium">{ALL_CHART_LABELS[rec.type]}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{rec.reason}</p>
                </div>
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                  {rec.score}%
                </Badge>
              </div>
              <CardContent className="p-3">
                <div className="rounded-lg overflow-hidden bg-muted/20 p-1">
                  <VisualizationEngine
                    chartType={rec.type}
                    data={chartData}
                    xAxis={xAxis}
                    yAxis={yAxis}
                    height={200}
                    colorPalette={colorPalette}
                    showLegend={false}
                    showGrid={showGrid}
                    showLabels={false}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────

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
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [forecastEnabled, setForecastEnabled] = useState(false);
  const [forecastPeriods, setForecastPeriods] = useState(6);
  const [forecastMethod, setForecastMethod] = useState<'linear' | 'moving_average'>('linear');
  const [forecastData, setForecastData] = useState<ForecastPoint[]>([]);

  const [anomalyEnabled, setAnomalyEnabled] = useState(false);
  const [anomalyMethod, setAnomalyMethod] = useState<'zscore' | 'iqr'>('zscore');
  const [anomalies, setAnomalies] = useState<AnomalyPoint[]>([]);

  const [calcFormula, setCalcFormula] = useState('');
  const [calcFieldName, setCalcFieldName] = useState('');

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
    toast({ title: 'Calculated Field Added', description: `"${calcFieldName}" created from formula: ${calcFormula}` });
    setCalcFormula('');
    setCalcFieldName('');
  };

  const chartData = useMemo(() => {
    const base = getAggregatedData();
    if (!forecastEnabled || !forecastData.length) return base;
    return [
      ...base,
      ...forecastData.map(f => ({ [xAxis]: f.period, [yAxis]: f.predicted_value, _forecast: true }))
    ];
  }, [filteredData, forecastEnabled, forecastData, xAxis, yAxis, aggregation, sortColumn, sortDirection, topN]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Visualizations</h1>
          <p className="text-muted-foreground">Generate visuals from your data — pick a chart or let AI decide.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-normal px-3 py-1">
            {availableCharts.length}/{allCharts.length} charts
          </Badge>
          <Badge variant="secondary" className="text-xs capitalize px-3 py-1">
            {plan} Plan
          </Badge>
        </div>
      </motion.div>

      {/* AI Recommendations */}
      <AIRecommendations
        recommendations={recommendations}
        selectedChart={selectedChart}
        onSelect={setSelectedChart}
        isChartAvailable={isChartAvailable}
      />

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel — Chart Types */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-3"
        >
          <Card className="bg-card border-border sticky top-4">
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Grid3X3 className="h-4 w-4 text-muted-foreground" />
                  Chart Library
                </CardTitle>
                <span className="text-[11px] text-muted-foreground">{allCharts.length} types</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[55vh] px-2 pb-3">
                <ChartTypeSelector
                  selectedChart={selectedChart}
                  onSelect={setSelectedChart}
                  isChartAvailable={isChartAvailable}
                />
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Panel — Config + Chart */}
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-9 space-y-5"
        >
          {/* Configuration Panel */}
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <Tabs value={configTab} onValueChange={setConfigTab}>
                <TabsList className="w-full grid grid-cols-5 bg-muted/50 p-0.5 rounded-lg">
                  <TabsTrigger value="axes" className="text-xs gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-md"><Columns className="h-3 w-3" />Axes</TabsTrigger>
                  <TabsTrigger value="style" className="text-xs gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-md"><Palette className="h-3 w-3" />Style</TabsTrigger>
                  <TabsTrigger value="sort" className="text-xs gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-md"><ArrowUpDown className="h-3 w-3" />Sort & Filter</TabsTrigger>
                  <TabsTrigger value="analytics" className="text-xs gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-md"><TrendingUp className="h-3 w-3" />Analytics</TabsTrigger>
                  <TabsTrigger value="advanced" className="text-xs gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-md"><Layers className="h-3 w-3" />Advanced</TabsTrigger>
                </TabsList>

                <TabsContent value="axes" className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Dataset</Label>
                      <Select value={currentDataset?.id || ''} onValueChange={selectDataset}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select dataset" /></SelectTrigger>
                        <SelectContent className="bg-popover">
                          {datasets.map(ds => <SelectItem key={ds.id} value={ds.id}>{ds.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">X Axis (Dimension)</Label>
                      <Select value={xAxis} onValueChange={setXAxis}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select column" /></SelectTrigger>
                        <SelectContent className="bg-popover">
                          {columns.map(col => <SelectItem key={col.name} value={col.name}>{col.name} <span className="text-muted-foreground">({col.type})</span></SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Y Axis (Measure)</Label>
                      <Select value={yAxis} onValueChange={setYAxis}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select column" /></SelectTrigger>
                        <SelectContent className="bg-popover">
                          {columns.map(col => <SelectItem key={col.name} value={col.name}>{col.name} <span className="text-muted-foreground">({col.type})</span></SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="style" className="mt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Color Theme</Label>
                      <Select value={colorPalette} onValueChange={setColorPalette}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-popover">
                          {['default', 'pastel', 'bold', 'monochrome', 'ocean', 'sunset', 'gradient', 'neon'].map(p =>
                            <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Aggregation</Label>
                      <Select value={aggregation} onValueChange={setAggregation}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-popover">
                          {['sum', 'avg', 'count', 'min', 'max'].map(a =>
                            <SelectItem key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Legend</Label>
                        <Switch checked={showLegend} onCheckedChange={setShowLegend} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Grid Lines</Label>
                        <Switch checked={showGrid} onCheckedChange={setShowGrid} />
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Data Labels</Label>
                        <Switch checked={showLabels} onCheckedChange={setShowLabels} />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="sort" className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Sort By</Label>
                      <Select value={sortColumn || '__none__'} onValueChange={v => setSortColumn(v === '__none__' ? '' : v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="None" /></SelectTrigger>
                        <SelectContent className="bg-popover">
                          <SelectItem value="__none__">None</SelectItem>
                          {columns.map(col => <SelectItem key={col.name} value={col.name}>{col.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Direction</Label>
                      <Select value={sortDirection} onValueChange={setSortDirection}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-popover">
                          <SelectItem value="asc">Ascending</SelectItem>
                          <SelectItem value="desc">Descending</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Top N</Label>
                      <Input value={topN} onChange={e => setTopN(e.target.value)} placeholder="All" className="h-9" type="number" min="1" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Filter Column</Label>
                      <Select value={filterColumn || '__none__'} onValueChange={v => setFilterColumn(v === '__none__' ? '' : v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="None" /></SelectTrigger>
                        <SelectContent className="bg-popover">
                          <SelectItem value="__none__">None</SelectItem>
                          {columns.map(col => <SelectItem key={col.name} value={col.name}>{col.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {filterColumn && (
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Filter Value</Label>
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
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {filterColumn} {filterOperator} "{filterValue}" → {filteredData.length} rows
                      </Badge>
                      <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => { setFilterColumn(''); setFilterValue(''); }}>Clear</Button>
                    </motion.div>
                  )}
                </TabsContent>

                <TabsContent value="analytics" className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-3 p-4 rounded-xl border border-border bg-muted/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <TrendingUp className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <Label className="font-medium text-sm">Forecasting</Label>
                        </div>
                        <Switch checked={forecastEnabled} onCheckedChange={setForecastEnabled} />
                      </div>
                      {forecastEnabled && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">Periods</Label>
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
                              <Label className="text-[11px] text-muted-foreground">Method</Label>
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
                            <div className="space-y-1 mt-1">
                              {forecastData.map((f, i) => (
                                <div key={i} className="flex justify-between text-xs bg-card p-2 rounded-lg border border-border/50">
                                  <span className="text-muted-foreground">{f.period}</span>
                                  <span className="font-mono font-medium">{f.predicted_value.toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </div>

                    <div className="space-y-3 p-4 rounded-xl border border-border bg-muted/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center">
                            <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                          </div>
                          <Label className="font-medium text-sm">Anomaly Detection</Label>
                        </div>
                        <Switch checked={anomalyEnabled} onCheckedChange={setAnomalyEnabled} />
                      </div>
                      {anomalyEnabled && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">Method</Label>
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
                            <div className="space-y-1 mt-1">
                              {anomalies.slice(0, 5).map((a, i) => (
                                <div key={i} className={cn("text-xs p-2 rounded-lg flex justify-between border",
                                  a.severity === 'high' ? 'bg-destructive/5 border-destructive/20 text-destructive' : a.severity === 'medium' ? 'bg-amber-500/5 border-amber-500/20 text-amber-600' : 'bg-muted/30 border-border')}>
                                  <span>{a.label}</span>
                                  <span className="font-mono">{a.value} (exp. {a.expected})</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="advanced" className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-3 p-4 rounded-xl border border-border bg-muted/20">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <Calculator className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <Label className="font-medium text-sm">Calculated Fields</Label>
                      </div>
                      <div className="space-y-2">
                        <Input value={calcFieldName} onChange={e => setCalcFieldName(e.target.value)} placeholder="Field name" className="h-8 text-xs" />
                        <Input value={calcFormula} onChange={e => setCalcFormula(e.target.value)} placeholder="Formula: e.g. Revenue * 0.1" className="h-8 text-xs font-mono" />
                        <Button size="sm" className="w-full text-xs" variant="outline" onClick={handleAddCalculatedField} disabled={!calcFieldName || !calcFormula}>
                          Add Calculated Field
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3 p-4 rounded-xl border border-border bg-muted/20">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <FileText className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <Label className="font-medium text-sm">Statistical Summary</Label>
                      </div>
                      {yAxis && currentData.length > 0 ? (
                        <div className="space-y-1">
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
                              <div key={s.label} className="flex justify-between text-xs bg-card p-2 rounded-lg border border-border/50">
                                <span className="text-muted-foreground">{s.label}</span>
                                <span className="font-mono font-medium">{s.value}</span>
                              </div>
                            ));
                          })()}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Select a numeric Y axis to view stats</p>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Suitability Warning */}
          <AnimatePresence>
            {suitabilityWarning && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <Card className="bg-amber-500/5 border-amber-500/20">
                  <CardContent className="py-3 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-600">Not suitable for this data</p>
                      <p className="text-xs text-muted-foreground mt-1">{suitabilityWarning}</p>
                      {recommendations.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Try: {recommendations.slice(0, 3).map(r => ALL_CHART_LABELS[r.type]).join(', ')}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chart Canvas */}
          {filteredData.length > 0 && !suitabilityWarning ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-card border-border overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {ALL_CHART_LABELS[selectedChart]}: {yAxis} by {xAxis}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setIsFullscreen(!isFullscreen)}>
                      {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
                <CardContent className={cn("p-4", isFullscreen && "p-8")}>
                  <VisualizationEngine
                    chartType={selectedChart as any}
                    data={chartData}
                    xAxis={xAxis}
                    yAxis={yAxis}
                    height={isFullscreen ? 600 : 400}
                    colorPalette={colorPalette}
                    showLegend={showLegend}
                    showGrid={showGrid}
                    showLabels={showLabels}
                  />
                </CardContent>
              </Card>
            </motion.div>
          ) : !suitabilityWarning ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="bg-card border-border border-dashed">
                <CardContent className="py-20 text-center">
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                  >
                    <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                      <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <h3 className="font-semibold text-lg">No data to visualize</h3>
                    <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">
                      Upload a dataset from the Datasets page, then come back here to create stunning visuals.
                    </p>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          ) : null}
        </motion.div>
      </div>

      {/* Visual Gallery Sub-Section */}
      <VisualGallery
        recommendations={recommendations}
        chartData={chartData}
        xAxis={xAxis}
        yAxis={yAxis}
        colorPalette={colorPalette}
        showLegend={showLegend}
        showGrid={showGrid}
        showLabels={showLabels}
      />
    </div>
  );
}
