import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, Lock, Palette, AlertTriangle, Wand2, ArrowUpDown, Columns, Layers,
  TrendingUp, AlertCircle, Calculator, Sparkles, Eye, Download, Copy, ChevronDown,
  Grid3X3, LayoutGrid, Maximize2, Minimize2, Share2, Image, FileText, Search,
  Save, X, Check, Filter, ArrowUp, ArrowDown, Loader2
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useData } from '@/contexts/DataContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useExport } from '@/hooks/useExport';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { forecast, detectAnomalies, ForecastPoint, AnomalyPoint } from '@/lib/forecasting';
import { toast } from '@/hooks/use-toast';

// ─── Helpers ──────────────────────────────────────────────────────

const formatColumnName = (col: string) =>
  col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

const formatChartTitle = (xAxis: string, yAxis: string) =>
  `${formatColumnName(yAxis)} by ${formatColumnName(xAxis)}`;

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
  violin: 'Violin Plot', density: 'Density Plot', stripplot: 'Strip Plot',
  swarmplot: 'Swarm Plot', jointplot: 'Joint Plot', rugplot: 'Rug Plot',
  ridgeline: 'Ridgeline Plot', lollipop: 'Lollipop Chart', dumbbell: 'Dumbbell Chart',
  slope: 'Slope Chart', marimekko: 'Marimekko Chart', combo: 'Combo Chart',
};

const CHART_CATEGORIES: Record<string, { charts: string[]; proOnly?: boolean }> = {
  'Comparison': { charts: ['bar', 'grouped-bar', 'stacked-bar', 'bullet', 'pareto', 'lollipop', 'dumbbell'] },
  'Trend': { charts: ['line', 'area', 'stacked-area', 'stream', 'slope', 'combo'] },
  'Composition': { charts: ['pie', 'donut', 'treemap', 'sunburst', 'funnel', 'marimekko'] },
  'Distribution': { charts: ['scatter', 'bubble', 'histogram', 'boxplot', 'heatmap', 'violin', 'density', 'stripplot', 'swarmplot', 'ridgeline', 'rugplot'] },
  'Relationship': { charts: ['radar', 'polar', 'sankey', 'network', 'force', 'parallel', 'jointplot'] },
  'Specialized': { charts: ['waterfall', 'candlestick', 'gauge', 'progress', 'kpi-card', 'calendar', 'timeline', 'tree', 'word-cloud', 'geo', 'choropleth', '3d-scatter', '3d-surface'] },
};

const CHART_BEST_FOR: Record<string, string> = {
  bar: 'Comparing values across categories',
  line: 'Tracking trends over time',
  pie: 'Showing proportions of a whole',
  area: 'Visualizing volume changes over time',
  scatter: 'Finding correlations between variables',
  radar: 'Multi-axis comparison across categories',
  heatmap: 'Density patterns across two dimensions',
  treemap: 'Hierarchical data proportions',
  funnel: 'Conversion or pipeline stages',
  gauge: 'Single metric vs target',
  boxplot: 'Distribution spread and outliers',
  histogram: 'Frequency distribution of values',
  waterfall: 'Running totals and changes',
  bubble: 'Three-variable comparison',
  donut: 'Proportions with center metric',
  'stacked-bar': 'Part-to-whole comparisons',
  'grouped-bar': 'Side-by-side category comparison',
  'stacked-area': 'Composition changes over time',
  pareto: '80/20 analysis',
  violin: 'Distribution shape with quartiles',
  density: 'Smooth probability distribution',
  lollipop: 'Clean ranked comparisons',
  combo: 'Bar + line dual-axis analysis',
  slope: 'Before/after changes',
  dumbbell: 'Range between two values',
};

// Mini SVG icons for chart types
function ChartMiniIcon({ type, className }: { type: string; className?: string }) {
  const c = "hsl(var(--muted-foreground))";
  const p = "hsl(var(--primary))";
  return (
    <svg viewBox="0 0 24 24" className={cn("w-5 h-5", className)} fill="none" stroke={c} strokeWidth="1.5">
      {type === 'bar' || type === 'grouped-bar' || type === 'stacked-bar' ? (
        <>
          <rect x="3" y="12" width="4" height="9" fill={p} opacity="0.6" rx="1" />
          <rect x="10" y="6" width="4" height="15" fill={p} opacity="0.8" rx="1" />
          <rect x="17" y="9" width="4" height="12" fill={p} opacity="0.4" rx="1" />
        </>
      ) : type === 'line' || type === 'slope' ? (
        <polyline points="3,18 8,12 13,14 18,6 23,10" stroke={p} strokeWidth="2" fill="none" />
      ) : type === 'area' || type === 'stacked-area' || type === 'stream' ? (
        <>
          <polyline points="3,18 8,12 13,14 18,6 23,10" stroke={p} strokeWidth="1.5" fill="none" />
          <polygon points="3,18 8,12 13,14 18,6 23,10 23,21 3,21" fill={p} opacity="0.2" />
        </>
      ) : type === 'pie' || type === 'donut' ? (
        <>
          <circle cx="12" cy="12" r="8" fill="none" stroke={p} strokeWidth="2" opacity="0.3" />
          <path d="M12,4 A8,8 0 0,1 20,12 L12,12 Z" fill={p} opacity="0.7" />
        </>
      ) : type === 'scatter' || type === 'bubble' ? (
        <>
          <circle cx="6" cy="16" r="2" fill={p} opacity="0.5" />
          <circle cx="10" cy="10" r="2" fill={p} opacity="0.7" />
          <circle cx="15" cy="14" r="2" fill={p} opacity="0.4" />
          <circle cx="19" cy="7" r="2" fill={p} opacity="0.8" />
        </>
      ) : type === 'radar' || type === 'polar' ? (
        <polygon points="12,3 20,9 18,18 6,18 4,9" fill={p} opacity="0.2" stroke={p} strokeWidth="1.5" />
      ) : (
        <rect x="3" y="3" width="18" height="18" rx="3" stroke={c} fill="none" opacity="0.3" />
      )}
    </svg>
  );
}

// Suggestion card mini chart preview SVGs
function MiniChartPreview({ type }: { type: string }) {
  const bars = [40, 70, 55, 85, 30, 65];
  const linePoints = "5,35 20,20 35,25 50,10 65,18 80,12";
  const areaPoints = "5,35 20,20 35,25 50,10 65,18 80,12 80,40 5,40";
  
  return (
    <div className="w-full h-12 flex items-end justify-center gap-0.5 opacity-60">
      {(type === 'bar' || type === 'grouped-bar' || type === 'stacked-bar' || type === 'histogram' || type === 'waterfall' || type === 'pareto' || type === 'bullet' || type === 'lollipop') ? (
        <svg viewBox="0 0 80 40" className="w-full h-full">
          {bars.map((h, i) => (
            <rect key={i} x={i * 13 + 2} y={40 - h * 0.4} width="10" height={h * 0.4} fill={`hsl(var(--chart-${(i % 5) + 1}))`} rx="1.5" />
          ))}
        </svg>
      ) : (type === 'line' || type === 'slope' || type === 'combo') ? (
        <svg viewBox="0 0 85 40" className="w-full h-full">
          <polyline points={linePoints} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />
          {[{x:5,y:35},{x:20,y:20},{x:35,y:25},{x:50,y:10},{x:65,y:18},{x:80,y:12}].map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="2" fill="hsl(var(--primary))" />
          ))}
        </svg>
      ) : (type === 'area' || type === 'stacked-area' || type === 'stream' || type === 'density' || type === 'ridgeline') ? (
        <svg viewBox="0 0 85 42" className="w-full h-full">
          <polygon points={areaPoints} fill="hsl(var(--primary))" opacity="0.3" />
          <polyline points={linePoints} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" />
        </svg>
      ) : (type === 'pie' || type === 'donut') ? (
        <svg viewBox="0 0 40 40" className="w-8 h-8 mx-auto">
          <circle cx="20" cy="20" r="16" fill="none" stroke="hsl(var(--chart-1))" strokeWidth="6" strokeDasharray="25 75" />
          <circle cx="20" cy="20" r="16" fill="none" stroke="hsl(var(--chart-2))" strokeWidth="6" strokeDasharray="30 70" strokeDashoffset="-25" />
          <circle cx="20" cy="20" r="16" fill="none" stroke="hsl(var(--chart-3))" strokeWidth="6" strokeDasharray="20 80" strokeDashoffset="-55" />
        </svg>
      ) : (type === 'scatter' || type === 'bubble' || type === 'swarmplot' || type === 'stripplot' || type === 'jointplot' || type === 'rugplot') ? (
        <svg viewBox="0 0 80 40" className="w-full h-full">
          {[{x:8,y:28},{x:15,y:15},{x:25,y:22},{x:32,y:10},{x:42,y:18},{x:50,y:30},{x:58,y:12},{x:68,y:25},{x:75,y:8}].map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={`hsl(var(--chart-${(i % 5) + 1}))`} opacity="0.7" />
          ))}
        </svg>
      ) : (type === 'radar' || type === 'polar') ? (
        <svg viewBox="0 0 40 40" className="w-8 h-8 mx-auto">
          <polygon points="20,4 34,14 30,32 10,32 6,14" fill="hsl(var(--primary))" opacity="0.2" stroke="hsl(var(--primary))" strokeWidth="1" />
        </svg>
      ) : (
        <svg viewBox="0 0 80 40" className="w-full h-full">
          <rect x="5" y="5" width="70" height="30" rx="4" fill="hsl(var(--muted))" opacity="0.3" />
          <text x="40" y="24" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="8">📊</text>
        </svg>
      )}
    </div>
  );
}

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
    if (!hasNumericX) return `"${formatColumnName(xAxis)}" must be numeric for ${ALL_CHART_LABELS[chartType]}.`;
    if (!hasNumericY) return `"${formatColumnName(yAxis)}" must be numeric for ${ALL_CHART_LABELS[chartType]}.`;
  }
  if (NEEDS_NUMERIC_Y.includes(chartType) && !hasNumericY) return `"${formatColumnName(yAxis)}" is not numeric. ${ALL_CHART_LABELS[chartType]} requires numeric Y values.`;
  if (NEEDS_CATEGORIES.includes(chartType) && uniqueX > 50) return `${ALL_CHART_LABELS[chartType]} works best with < 50 categories. "${formatColumnName(xAxis)}" has ${uniqueX}.`;
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
    recs.push({ type: 'bar', reason: `Compare ${formatColumnName(numCols[0])} across ${formatColumnName(strCols[0])} categories`, score: 90 });
    recs.push({ type: 'line', reason: `Track ${formatColumnName(numCols[0])} trend over ${formatColumnName(strCols[0])}`, score: 85 });
  }
  if (uniqueCategories > 0 && uniqueCategories <= 10) {
    recs.push({ type: 'pie', reason: `Show composition across ${uniqueCategories} ${formatColumnName(strCols[0])} values`, score: 80 });
    recs.push({ type: 'donut', reason: `Ring chart for ${formatColumnName(strCols[0])} distribution`, score: 78 });
  }
  if (numCols.length >= 2) {
    recs.push({ type: 'scatter', reason: `Correlate ${formatColumnName(numCols[0])} vs ${formatColumnName(numCols[1])}`, score: 82 });
    recs.push({ type: 'jointplot', reason: `Joint distribution of ${formatColumnName(numCols[0])} & ${formatColumnName(numCols[1])}`, score: 72 });
    recs.push({ type: 'combo', reason: `Bar + Line combo: ${formatColumnName(numCols[0])} & ${formatColumnName(numCols[1])}`, score: 74 });
    recs.push({ type: 'dumbbell', reason: `Compare ${formatColumnName(numCols[0])} vs ${formatColumnName(numCols[1])} per category`, score: 62 });
    recs.push({ type: 'slope', reason: `Change from ${formatColumnName(numCols[0])} to ${formatColumnName(numCols[1])}`, score: 60 });
  }
  if (numCols.length >= 1) {
    recs.push({ type: 'area', reason: `Visualize ${formatColumnName(numCols[0])} volume over time`, score: 75 });
    recs.push({ type: 'histogram', reason: `Distribution of ${formatColumnName(numCols[0])} values`, score: 70 });
    recs.push({ type: 'violin', reason: `Distribution shape of ${formatColumnName(numCols[0])} with quartiles`, score: 67 });
    recs.push({ type: 'lollipop', reason: `Clean comparison of ${formatColumnName(numCols[0])} values`, score: 63 });
  }
  if (data.length > 20 && numCols.length >= 1 && strCols.length >= 1) {
    recs.push({ type: 'heatmap', reason: `Density map of ${formatColumnName(numCols[0])} by categories`, score: 65 });
    recs.push({ type: 'treemap', reason: `Hierarchical view of ${formatColumnName(numCols[0])}`, score: 60 });
    recs.push({ type: 'ridgeline', reason: `Distribution across ${formatColumnName(strCols[0])} groups`, score: 59 });
  }
  if (uniqueCategories >= 3 && uniqueCategories <= 8 && numCols.length >= 1) {
    recs.push({ type: 'radar', reason: `Multi-axis comparison across ${uniqueCategories} categories`, score: 68 });
  }
  return recs.sort((a, b) => b.score - a.score).slice(0, 12);
}

// ─── Sub-components ───────────────────────────────────────────────

function ChartTypeSelector({ selectedChart, onSelect, isChartAvailable, searchQuery }: {
  selectedChart: string;
  onSelect: (chart: string) => void;
  isChartAvailable: (chart: string) => boolean;
  searchQuery: string;
}) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Comparison');
  const navigate = useNavigate();

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-1">
        {Object.entries(CHART_CATEGORIES).map(([category, { charts }]) => {
          const filteredCharts = searchQuery
            ? charts.filter(c => (ALL_CHART_LABELS[c] || c).toLowerCase().includes(searchQuery.toLowerCase()))
            : charts;
          if (searchQuery && filteredCharts.length === 0) return null;

          const availableCount = filteredCharts.filter(c => isChartAvailable(c)).length;
          const lockedCount = filteredCharts.length - availableCount;

          return (
            <div key={category}>
              <button
                onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="flex items-center gap-2">
                  {category}
                  <span className="text-[10px] font-normal normal-case text-muted-foreground/70">
                    ({filteredCharts.length})
                  </span>
                </span>
                <div className="flex items-center gap-1.5">
                  {lockedCount > 0 && (
                    <Badge variant="outline" className="text-[9px] h-4 px-1 border-primary/20 text-primary/60">
                      <Lock className="h-2.5 w-2.5 mr-0.5" />{lockedCount}
                    </Badge>
                  )}
                  <ChevronDown className={cn("h-3 w-3 transition-transform", (expandedCategory === category || searchQuery) && "rotate-180")} />
                </div>
              </button>
              <AnimatePresence>
                {(expandedCategory === category || searchQuery) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="pb-2 space-y-0.5">
                      {filteredCharts.map(chart => {
                        const available = isChartAvailable(chart);
                        const bestFor = CHART_BEST_FOR[chart];
                        return (
                          <Tooltip key={chart}>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => available ? onSelect(chart) : toast({
                                  title: '🔒 Pro Feature',
                                  description: `Unlock ${ALL_CHART_LABELS[chart]} and 35+ more chart types with DataVora Pro`,
                                })}
                                className={cn(
                                  "w-full px-3 py-2 rounded-lg text-left transition-all text-sm flex items-center justify-between group",
                                  selectedChart === chart
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : available
                                      ? "hover:bg-muted/80 text-foreground"
                                      : "opacity-50 cursor-pointer hover:opacity-70"
                                )}
                              >
                                <span className="flex items-center gap-2 truncate">
                                  <ChartMiniIcon type={chart} className={cn("shrink-0", selectedChart === chart && "brightness-200")} />
                                  <span className="truncate">{ALL_CHART_LABELS[chart] || chart}</span>
                                </span>
                                {!available && <Lock className="h-3 w-3 shrink-0" />}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-[220px]">
                              {available ? (
                                <p className="text-xs">
                                  {bestFor ? `Best for: ${bestFor}` : ALL_CHART_LABELS[chart]}
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-1.5">
                                    <Lock className="h-3 w-3 text-primary" />
                                    <span className="font-semibold text-xs">Pro Feature</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Unlock {ALL_CHART_LABELS[chart]} and 35+ more chart types with DataVora Pro
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">₹999/month • Cancel anytime</p>
                                  <Button size="sm" className="w-full h-6 text-[10px]" onClick={(e) => { e.stopPropagation(); navigate('/dashboard/settings'); }}>
                                    Upgrade Now →
                                  </Button>
                                </div>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </TooltipProvider>
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
    <TooltipProvider delayDuration={300}>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {recommendations.map((r, i) => {
            const available = isChartAvailable(r.type);
            return (
              <Tooltip key={r.type}>
                <TooltipTrigger asChild>
                  <motion.button
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => available ? onSelect(r.type) : toast({
                      title: '🔒 Pro Feature',
                      description: `Unlock ${ALL_CHART_LABELS[r.type]} with DataVora Pro — ₹999/month`,
                    })}
                    className={cn(
                      "relative rounded-xl p-3 text-left transition-all group border overflow-hidden",
                      selectedChart === r.type
                        ? "bg-primary/10 border-primary shadow-sm ring-2 ring-primary/30"
                        : "bg-card hover:bg-muted/50 border-border hover:border-primary/30"
                    )}
                  >
                    {/* Selected checkmark */}
                    {selectedChart === r.type && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                    
                    {/* Pro lock overlay */}
                    {!available && (
                      <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex flex-col items-center justify-center z-10 rounded-xl">
                        <Lock className="h-4 w-4 text-muted-foreground mb-1" />
                        <Badge className="text-[9px] h-4 bg-amber-500/20 text-amber-600 border-amber-500/30 hover:bg-amber-500/20">Pro</Badge>
                      </div>
                    )}

                    {/* Mini chart preview */}
                    <MiniChartPreview type={r.type} />
                    
                    <div className="mt-2">
                      <div className="text-xs font-semibold truncate">{ALL_CHART_LABELS[r.type]}</div>
                      <div className="text-[10px] mt-0.5 text-muted-foreground line-clamp-2 leading-relaxed">{r.reason}</div>
                    </div>
                  </motion.button>
                </TooltipTrigger>
                {!available && (
                  <TooltipContent className="max-w-[220px]">
                    <div className="space-y-1.5">
                      <p className="font-semibold text-xs">🔒 Pro Feature</p>
                      <p className="text-xs text-muted-foreground">
                        Unlock {ALL_CHART_LABELS[r.type]} and 35+ more chart types with DataVora Pro
                      </p>
                      <p className="text-[10px] text-muted-foreground">₹999/month • Cancel anytime</p>
                    </div>
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </div>
      </motion.div>
    </TooltipProvider>
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

// Quick filter presets
function QuickFilterChips({ data, yAxis, onApplyFilter }: {
  data: Record<string, unknown>[];
  yAxis: string;
  onApplyFilter: (topN: string, sort: string, dir: string) => void;
}) {
  const [active, setActive] = useState<string | null>(null);

  const chips = [
    { id: 'top10', label: 'Top 10', action: () => onApplyFilter('10', yAxis, 'desc') },
    { id: 'bottom10', label: 'Bottom 10', action: () => onApplyFilter('10', yAxis, 'asc') },
    { id: 'aboveAvg', label: 'Above Average', action: () => onApplyFilter('', yAxis, 'desc') },
    { id: 'belowAvg', label: 'Below Average', action: () => onApplyFilter('', yAxis, 'asc') },
  ];

  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {chips.map(chip => (
        <button
          key={chip.id}
          onClick={() => {
            if (active === chip.id) {
              setActive(null);
              onApplyFilter('', '', 'asc');
            } else {
              setActive(chip.id);
              chip.action();
            }
          }}
          className={cn(
            "text-[11px] px-2.5 py-1 rounded-full border transition-all",
            active === chip.id
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-muted/50 text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
          )}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────

export default function Visualizations() {
  const { datasets, currentDataset, currentData, selectDataset } = useData();
  const { plan, isChartAvailable, getAvailableCharts } = useSubscription();
  const { user } = useAuth();
  const { exportCSV, exportPNG } = useExport();
  const navigate = useNavigate();

  const [selectedChart, setSelectedChart] = useState('bar');
  const [xAxis, setXAxis] = useState('');
  const [yAxis, setYAxis] = useState('');
  const [colorPalette, setColorPalette] = useState('default');
  const [aggregation, setAggregation] = useState('sum');
  const [showLegend, setShowLegend] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(false);
  const [sortColumn, setSortColumn] = useState('');
  const [sortDirection, setSortDirection] = useState('desc');
  const [topN, setTopN] = useState('10');
  const [configTab, setConfigTab] = useState('axes');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chartSearch, setChartSearch] = useState('');

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

  // Save to library
  const [savedCharts, setSavedCharts] = useState<Array<{ id: string; title: string; description: string; tags: string; chartType: string; xAxis: string; yAxis: string; savedAt: Date }>>([]);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [saveTags, setSaveTags] = useState('');

  // Load saved charts from Supabase on mount
  useEffect(() => {
    const loadSavedCharts = async () => {
      if (!supabase || !user?.id) return;
      const { data, error } = await supabase
        .from('saved_charts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (!error && data) {
        setSavedCharts(data.map((c: any) => ({
          id: c.id,
          title: c.title,
          description: c.description || '',
          tags: c.tags || '',
          chartType: c.chart_type,
          xAxis: c.x_axis,
          yAxis: c.y_axis,
          savedAt: new Date(c.created_at),
        })));
      }
    };
    loadSavedCharts();
  }, [user?.id]);

  // Download state
  const [downloading, setDownloading] = useState(false);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);

  const allCharts = Object.keys(ALL_CHART_LABELS);
  const availableCharts = getAvailableCharts();

  // Pick up insight context from sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem('datapulse_viz_context');
    if (raw) {
      try {
        const ctx = JSON.parse(raw);
        if (ctx.chartType && isChartAvailable(ctx.chartType)) {
          setSelectedChart(ctx.chartType);
        }
        sessionStorage.removeItem('datapulse_viz_context');
        if (ctx.title) {
          toast({ title: 'Insight Visualization', description: ctx.title });
        }
      } catch { /* ignore parse errors */ }
    }
  }, []);

  // Auto-select axes + smart defaults
  useEffect(() => {
    if (currentDataset && currentData.length > 0) {
      const keys = Object.keys(currentData[0]);
      const stringCols = keys.filter(k => typeof currentData[0][k] === 'string');
      const numCols = keys.filter(k => typeof currentData[0][k] === 'number');
      
      if (stringCols.length > 0) setXAxis(stringCols[0]);
      if (numCols.length > 0) {
        setYAxis(numCols[0]);
        setSortColumn(numCols[0]);
      }
      // Auto-suggest filter column (first categorical)
      if (stringCols.length > 0) setFilterColumn('');
      // Default Top 10
      setTopN('10');
      setSortDirection('desc');
    }
  }, [currentDataset, currentData]);

  const columns = currentData.length > 0
    ? Object.keys(currentData[0]).map(name => ({
        name,
        type: typeof currentData[0][name] === 'number' ? 'number' as const : 'string' as const
      }))
    : [];

  const categoricalColumns = columns.filter(c => c.type === 'string');
  const numericColumns = columns.filter(c => c.type === 'number');

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

  // Chart stats
  const chartStats = useMemo(() => {
    if (!chartData.length || !yAxis) return null;
    const vals = chartData.map(d => Number(d[yAxis]) || 0);
    const max = Math.max(...vals);
    const min = Math.min(...vals);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const maxLabel = chartData.find(d => Number(d[yAxis]) === max)?.[xAxis];
    const minLabel = chartData.find(d => Number(d[yAxis]) === min)?.[xAxis];
    return {
      max: max.toFixed(2), maxLabel: String(maxLabel || ''),
      min: min.toFixed(2), minLabel: String(minLabel || ''),
      avg: avg.toFixed(2),
      count: chartData.length,
    };
  }, [chartData, yAxis, xAxis]);

  const handleSaveChart = async () => {
    if (!supabase || !user?.id) {
      toast({ title: 'Error', description: 'You must be logged in to save charts', variant: 'destructive' });
      return;
    }
    const title = saveTitle || formatChartTitle(xAxis, yAxis);
    const { data, error } = await supabase
      .from('saved_charts')
      .insert({
        user_id: user.id,
        title,
        description: saveDescription,
        tags: saveTags,
        chart_type: selectedChart,
        x_axis: xAxis,
        y_axis: yAxis,
        color_palette: colorPalette,
        aggregation,
        show_legend: showLegend,
        show_grid: showGrid,
        show_labels: showLabels,
        sort_column: sortColumn,
        sort_direction: sortDirection,
        top_n: topN,
        dataset_id: currentDataset?.id || '',
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Save Failed', description: error.message, variant: 'destructive' });
      return;
    }

    const newChart = {
      id: data.id,
      title,
      description: saveDescription,
      tags: saveTags,
      chartType: selectedChart,
      xAxis,
      yAxis,
      savedAt: new Date(data.created_at),
    };
    setSavedCharts(prev => [newChart, ...prev]);
    setSaveModalOpen(false);
    setSaveTitle('');
    setSaveDescription('');
    setSaveTags('');
    toast({ title: 'Chart Saved', description: `"${title}" saved to your library` });
  };

  const handleLoadSavedChart = (chart: typeof savedCharts[0]) => {
    setSelectedChart(chart.chartType);
    setXAxis(chart.xAxis);
    setYAxis(chart.yAxis);
    toast({ title: 'Chart Loaded', description: `Loaded "${chart.title}"` });
  };

  const handleDownloadPNG = async () => {
    setDownloading(true);
    setDownloadMenuOpen(false);
    await exportPNG('chart-preview-container', formatChartTitle(xAxis, yAxis).replace(/\s+/g, '_'));
    setDownloading(false);
  };

  const handleDownloadCSV = () => {
    setDownloadMenuOpen(false);
    exportCSV(chartData, formatChartTitle(xAxis, yAxis).replace(/\s+/g, '_'));
  };

  const handleDownloadSVG = () => {
    setDownloadMenuOpen(false);
    const el = document.getElementById('chart-preview-container');
    if (!el) return;
    const svg = el.querySelector('svg');
    if (!svg) { toast({ title: 'No SVG found', variant: 'destructive' }); return; }
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${formatChartTitle(xAxis, yAxis).replace(/\s+/g, '_')}.svg`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast({ title: 'SVG Downloaded' });
  };

  const handleApplyQuickFilter = (newTopN: string, newSortCol: string, newDir: string) => {
    setTopN(newTopN);
    setSortColumn(newSortCol);
    setSortDirection(newDir);
  };

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
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Grid3X3 className="h-4 w-4 text-muted-foreground" />
                  Chart Library
                </CardTitle>
                <span className="text-[11px] text-muted-foreground">{allCharts.length} types</span>
              </div>
              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={chartSearch}
                  onChange={e => setChartSearch(e.target.value)}
                  placeholder={`Search ${allCharts.length} chart types...`}
                  className="h-8 pl-8 text-xs"
                />
                {chartSearch && (
                  <button onClick={() => setChartSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[55vh] px-2 pb-3">
                <ChartTypeSelector
                  selectedChart={selectedChart}
                  onSelect={setSelectedChart}
                  isChartAvailable={isChartAvailable}
                  searchQuery={chartSearch}
                />

                {/* Pro Charts CTA */}
                <div className="mx-2 mt-3 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                  <div className="flex items-center gap-2 mb-1">
                    <Lock className="h-3.5 w-3.5 text-amber-600" />
                    <span className="text-xs font-semibold text-amber-600">Pro Charts ({allCharts.length - availableCharts.length} types)</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-2">Unlock all chart types with DataVora Pro</p>
                  <Button size="sm" variant="outline" className="w-full h-6 text-[10px] border-amber-500/30 text-amber-600 hover:bg-amber-500/10">
                    Upgrade to unlock →
                  </Button>
                </div>
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
                          {columns.map(col => <SelectItem key={col.name} value={col.name}>{formatColumnName(col.name)} <span className="text-muted-foreground">({col.type})</span></SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Y Axis (Measure)</Label>
                      <Select value={yAxis} onValueChange={setYAxis}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select column" /></SelectTrigger>
                        <SelectContent className="bg-popover">
                          {columns.map(col => <SelectItem key={col.name} value={col.name}>{formatColumnName(col.name)} <span className="text-muted-foreground">({col.type})</span></SelectItem>)}
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
                          {columns.map(col => <SelectItem key={col.name} value={col.name}>{formatColumnName(col.name)}</SelectItem>)}
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
                          {/* Categorical columns first */}
                          {categoricalColumns.length > 0 && (
                            <>
                              {categoricalColumns.map(col => <SelectItem key={col.name} value={col.name}>📋 {formatColumnName(col.name)}</SelectItem>)}
                            </>
                          )}
                          {numericColumns.map(col => <SelectItem key={col.name} value={col.name}>🔢 {formatColumnName(col.name)}</SelectItem>)}
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

                  {/* Quick filter chips */}
                  {yAxis && (
                    <QuickFilterChips data={currentData} yAxis={yAxis} onApplyFilter={handleApplyQuickFilter} />
                  )}

                  {filterColumn && filterValue && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {formatColumnName(filterColumn)} {filterOperator} "{filterValue}" → {filteredData.length} rows
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
              <Card className="bg-card border-border overflow-hidden rounded-2xl">
                {/* Header row with title + actions */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {formatChartTitle(xAxis, yAxis)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Fullscreen */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setIsFullscreen(!isFullscreen)}>
                            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p className="text-xs">Fullscreen</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {/* Save to Library */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => {
                            setSaveTitle(formatChartTitle(xAxis, yAxis));
                            setSaveModalOpen(true);
                          }}>
                            <Save className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p className="text-xs">Save to Library</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {/* Download dropdown */}
                    <div className="relative">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDownloadMenuOpen(!downloadMenuOpen)}>
                              {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p className="text-xs">Download</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <AnimatePresence>
                        {downloadMenuOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="absolute right-0 top-8 z-50 w-52 rounded-xl border border-border bg-popover shadow-lg p-1.5"
                          >
                            <button onClick={handleDownloadPNG} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg hover:bg-muted transition-colors text-left">
                              <Image className="h-3.5 w-3.5 text-muted-foreground" />
                              <div>
                                <div className="font-medium">Download as PNG</div>
                                <div className="text-[10px] text-muted-foreground">High resolution (2x)</div>
                              </div>
                            </button>
                            <button onClick={handleDownloadSVG} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg hover:bg-muted transition-colors text-left">
                              <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                              <div>
                                <div className="font-medium">Download as SVG</div>
                                <div className="text-[10px] text-muted-foreground">Vector format, scalable</div>
                              </div>
                            </button>
                            <button onClick={handleDownloadCSV} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg hover:bg-muted transition-colors text-left">
                              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                              <div>
                                <div className="font-medium">Download as CSV</div>
                                <div className="text-[10px] text-muted-foreground">Chart data export</div>
                              </div>
                            </button>
                            <Separator className="my-1" />
                            <button onClick={() => { setDownloadMenuOpen(false); toast({ title: 'Add to Report', description: 'Chart will be included in your next report export' }); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg hover:bg-muted transition-colors text-left">
                              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                              <div>
                                <div className="font-medium">Add to Report</div>
                                <div className="text-[10px] text-muted-foreground">Insert into next report</div>
                              </div>
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {/* Chart container */}
                <CardContent className={cn("p-5", isFullscreen && "p-8")} id="chart-preview-container">
                  <VisualizationEngine
                    chartType={selectedChart as any}
                    data={chartData}
                    xAxis={xAxis}
                    yAxis={yAxis}
                    height={isFullscreen ? 600 : 420}
                    colorPalette={colorPalette}
                    showLegend={showLegend}
                    showGrid={showGrid}
                    showLabels={showLabels}
                  />
                </CardContent>

                {/* Stats bar */}
                {chartStats && (
                  <div className="px-5 py-2.5 border-t border-border/50 flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
                    <span>Max: <span className="font-mono font-medium text-foreground">{chartStats.max}</span> ({chartStats.maxLabel})</span>
                    <span className="text-border">|</span>
                    <span>Min: <span className="font-mono font-medium text-foreground">{chartStats.min}</span> ({chartStats.minLabel})</span>
                    <span className="text-border">|</span>
                    <span>Avg: <span className="font-mono font-medium text-foreground">{chartStats.avg}</span></span>
                    <span className="text-border">|</span>
                    <span><span className="font-mono font-medium text-foreground">{chartStats.count}</span> items</span>
                  </div>
                )}
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

          {/* Saved Charts Section */}
          {savedCharts.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="bg-card border-border">
                <CardHeader className="pb-2 px-5 pt-4">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Save className="h-4 w-4 text-muted-foreground" />
                    My Saved Charts ({savedCharts.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {savedCharts.map(chart => (
                      <button
                        key={chart.id}
                        onClick={() => handleLoadSavedChart(chart)}
                        className="p-3 rounded-xl border border-border hover:border-primary/30 bg-muted/20 hover:bg-muted/40 transition-all text-left group"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <ChartMiniIcon type={chart.chartType} className="w-4 h-4" />
                          <span className="text-xs font-medium truncate">{chart.title}</span>
                        </div>
                        {chart.description && (
                          <p className="text-[10px] text-muted-foreground line-clamp-1">{chart.description}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(chart.savedAt).toLocaleDateString()}
                        </p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
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

      {/* Save Chart Modal */}
      <Dialog open={saveModalOpen} onOpenChange={setSaveModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Chart to Library</DialogTitle>
            <DialogDescription>Save this chart configuration for quick access later.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Title</Label>
              <Input value={saveTitle} onChange={e => setSaveTitle(e.target.value)} placeholder="Chart title" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description (optional)</Label>
              <Input value={saveDescription} onChange={e => setSaveDescription(e.target.value)} placeholder="Brief description" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tags (optional)</Label>
              <Input value={saveTags} onChange={e => setSaveTags(e.target.value)} placeholder="e.g. sales, quarterly" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveChart}>
              <Save className="h-4 w-4 mr-1" />Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
