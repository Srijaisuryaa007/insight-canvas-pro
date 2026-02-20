import { useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, ScatterChart, Scatter,
  PieChart, Pie, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
  Treemap, FunnelChart, Funnel, LabelList, ComposedChart,
} from 'recharts';
import { ChartType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ChartRendererProps {
  type: ChartType | string;
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

const COLOR_PALETTES: Record<string, string[]> = {
  default: ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'],
  pastel: ['#a8d8ea', '#aa96da', '#fcbad3', '#ffffd2', '#b5eaea'],
  bold: ['#e63946', '#457b9d', '#1d3557', '#f1faee', '#a8dadc'],
  monochrome: ['hsl(var(--primary))', 'hsl(var(--primary) / 0.8)', 'hsl(var(--primary) / 0.6)', 'hsl(var(--primary) / 0.4)', 'hsl(var(--primary) / 0.2)'],
  ocean: ['#0077b6', '#00b4d8', '#90e0ef', '#caf0f8', '#03045e'],
  sunset: ['#ff6b6b', '#ffa06b', '#ffd93d', '#6bff6b', '#6bc5ff'],
};

const tooltipStyle = {
  backgroundColor: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 'var(--radius)',
};

// Check data suitability for chart type
function checkSuitability(type: string, data: Record<string, unknown>[], xAxis?: string, yAxis?: string): string | null {
  if (!data.length) return 'No data available.';
  if (!xAxis && !yAxis) return null;

  const hasNumericY = yAxis && data.some(d => typeof d[yAxis] === 'number');
  const hasStringX = xAxis && data.some(d => typeof d[xAxis] === 'string');
  const hasNumericX = xAxis && data.some(d => typeof d[xAxis] === 'number');

  switch (type) {
    case 'scatter':
    case 'bubble':
      if (!hasNumericX || !hasNumericY) return `Scatter/Bubble requires numeric X and Y axes. Current: X="${xAxis}" (${hasNumericX ? 'numeric' : 'non-numeric'}), Y="${yAxis}" (${hasNumericY ? 'numeric' : 'non-numeric'}). Change column types or select numeric columns.`;
      break;
    case 'histogram':
    case 'boxplot':
      if (!hasNumericY) return `${type} requires a numeric column. "${yAxis}" is not numeric.`;
      if (data.length < 5) return `${type} needs at least 5 data points. You have ${data.length}.`;
      break;
    case 'radar':
    case 'polar':
      if (data.length < 3) return `${type} needs at least 3 categories. You have ${data.length}.`;
      break;
    case 'pie':
    case 'donut':
      if (!hasNumericY) return `Pie/Donut requires numeric values. "${yAxis}" is not numeric.`;
      break;
  }
  return null;
}

export function ChartRenderer({
  type, data, xAxis, yAxis, title, height = 300,
  colorPalette = 'default', showLegend = true, showGrid = true, showLabels = false,
  onDataClick,
}: ChartRendererProps) {
  const colors = COLOR_PALETTES[colorPalette] || COLOR_PALETTES.default;

  const suitabilityIssue = useMemo(() => checkSuitability(type, data, xAxis, yAxis), [type, data, xAxis, yAxis]);

  const handleClick = (payload: any) => {
    if (onDataClick && payload) {
      const point = payload.payload || payload;
      onDataClick(point);
    }
  };

  // Legend config: placed outside chart, wrapping enabled
  const legendProps = showLegend ? {
    verticalAlign: 'bottom' as const,
    align: 'center' as const,
    wrapperStyle: { paddingTop: '12px', fontSize: '12px', lineHeight: '20px' },
    iconSize: 10,
  } : null;

  const chartContent = useMemo(() => {
    const commonProps = { data, margin: { top: 10, right: 20, left: 10, bottom: showLegend ? 30 : 10 } };
    const gridEl = showGrid ? <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /> : null;
    const xEl = <XAxis dataKey={xAxis} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />;
    const yEl = <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={50} />;
    const ttEl = <Tooltip contentStyle={tooltipStyle} />;
    const lgEl = legendProps ? <Legend {...legendProps} /> : null;

    switch (type) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            {gridEl}{xEl}{yEl}{ttEl}{lgEl}
            <Bar dataKey={yAxis} fill={colors[0]} radius={[4, 4, 0, 0]} cursor="pointer" onClick={(d: any) => handleClick(d)}>
              {showLabels && <LabelList dataKey={yAxis} position="top" fontSize={10} />}
            </Bar>
          </BarChart>
        );

      case 'stacked-bar':
      case 'grouped-bar': {
        const keys = data.length > 0 ? Object.keys(data[0]).filter(k => k !== xAxis && typeof data[0][k] === 'number') : [];
        return (
          <BarChart {...commonProps}>
            {gridEl}{xEl}{yEl}{ttEl}{lgEl}
            {keys.slice(0, 5).map((k, i) => (
              <Bar key={k} dataKey={k} fill={colors[i % colors.length]} stackId={type === 'stacked-bar' ? 'stack' : undefined} radius={[2, 2, 0, 0]} cursor="pointer" onClick={(d: any) => handleClick(d)} />
            ))}
          </BarChart>
        );
      }

      case 'line':
        return (
          <LineChart {...commonProps}>
            {gridEl}{xEl}{yEl}{ttEl}{lgEl}
            <Line type="monotone" dataKey={yAxis} stroke={colors[0]} strokeWidth={2} dot={{ fill: colors[0], r: 3, cursor: 'pointer' }} activeDot={{ r: 5, onClick: (e: any, payload: any) => handleClick(payload) }} />
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            {gridEl}{xEl}{yEl}{ttEl}{lgEl}
            <Area type="monotone" dataKey={yAxis} stroke={colors[0]} fill={colors[0]} fillOpacity={0.3} />
          </AreaChart>
        );

      case 'stacked-area': {
        const keys = data.length > 0 ? Object.keys(data[0]).filter(k => k !== xAxis && typeof data[0][k] === 'number') : [];
        return (
          <AreaChart {...commonProps}>
            {gridEl}{xEl}{yEl}{ttEl}{lgEl}
            {keys.slice(0, 5).map((k, i) => (
              <Area key={k} type="monotone" dataKey={k} stackId="stack" stroke={colors[i % colors.length]} fill={colors[i % colors.length]} fillOpacity={0.4} />
            ))}
          </AreaChart>
        );
      }

      case 'scatter':
      case 'bubble':
        return (
          <ScatterChart {...commonProps}>
            {gridEl}
            <XAxis type="number" dataKey={xAxis} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
            <YAxis type="number" dataKey={yAxis} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
            {ttEl}
            <Scatter data={data} fill={colors[0]} cursor="pointer" onClick={(d: any) => handleClick(d)} />
          </ScatterChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie data={data} dataKey={yAxis || 'value'} nameKey={xAxis || 'name'} cx="50%" cy="45%" outerRadius={Math.min(height * 0.3, 100)} label={showLabels} cursor="pointer" onClick={(d: any) => handleClick(d)}>
              {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Pie>
            {ttEl}
            {legendProps && <Legend {...legendProps} layout="horizontal" />}
          </PieChart>
        );

      case 'donut':
        return (
          <PieChart>
            <Pie data={data} dataKey={yAxis || 'value'} nameKey={xAxis || 'name'} cx="50%" cy="45%" innerRadius={50} outerRadius={Math.min(height * 0.3, 100)} label={showLabels} cursor="pointer" onClick={(d: any) => handleClick(d)}>
              {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Pie>
            {ttEl}
            {legendProps && <Legend {...legendProps} layout="horizontal" />}
          </PieChart>
        );

      case 'radar':
        return (
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis dataKey={xAxis} stroke="hsl(var(--muted-foreground))" fontSize={11} />
            <PolarRadiusAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
            <Radar dataKey={yAxis} stroke={colors[0]} fill={colors[0]} fillOpacity={0.5} />
            {ttEl}
            {lgEl}
          </RadarChart>
        );

      case 'treemap': {
        const treemapData = data.map((d, i) => ({ name: String(d[xAxis || 'name']), size: Number(d[yAxis || 'value']) || 0, fill: colors[i % colors.length] }));
        return (
          <Treemap data={treemapData} dataKey="size" aspectRatio={4 / 3} stroke="hsl(var(--border))">
            {treemapData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
            {ttEl}
          </Treemap>
        );
      }

      case 'funnel':
        return (
          <FunnelChart>
            <Tooltip contentStyle={tooltipStyle} />
            <Funnel dataKey={yAxis || 'value'} data={data.map((d, i) => ({ ...d, fill: colors[i % colors.length] }))} isAnimationActive>
              <LabelList position="right" fill="hsl(var(--foreground))" stroke="none" dataKey={xAxis || 'name'} fontSize={12} />
            </Funnel>
          </FunnelChart>
        );

      case 'histogram': {
        const vals = data.map(d => Number(d[yAxis]) || 0);
        const min = Math.min(...vals);
        const max = Math.max(...vals);
        const binCount = Math.min(20, Math.ceil(Math.sqrt(vals.length)));
        const binWidth = (max - min) / binCount || 1;
        const bins: Record<string, unknown>[] = [];
        for (let i = 0; i < binCount; i++) {
          const lo = min + i * binWidth;
          const hi = lo + binWidth;
          const count = vals.filter(v => v >= lo && (i === binCount - 1 ? v <= hi : v < hi)).length;
          bins.push({ range: `${lo.toFixed(0)}-${hi.toFixed(0)}`, count });
        }
        return (
          <BarChart data={bins} margin={{ top: 10, right: 20, left: 10, bottom: showLegend ? 30 : 10 }}>
            {gridEl}
            <XAxis dataKey="range" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
            {ttEl}
            <Bar dataKey="count" fill={colors[0]} radius={[4, 4, 0, 0]} />
          </BarChart>
        );
      }

      case 'waterfall': {
        let cumulative = 0;
        const waterfallData = data.map((d, i) => {
          const val = Number(d[yAxis]) || 0;
          const start = cumulative;
          cumulative += val;
          return { name: String(d[xAxis] || i), value: val, start, end: cumulative };
        });
        return (
          <BarChart data={waterfallData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
            {gridEl}
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
            {ttEl}
            <Bar dataKey="start" stackId="waterfall" fill="transparent" />
            <Bar dataKey="value" stackId="waterfall" fill={colors[0]} radius={[2, 2, 0, 0]}>
              {waterfallData.map((d, i) => (
                <Cell key={i} fill={d.value >= 0 ? colors[0] : colors[1] || '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        );
      }

      case 'pareto': {
        const sorted = [...data].sort((a, b) => (Number(b[yAxis]) || 0) - (Number(a[yAxis]) || 0));
        const totalVal = sorted.reduce((s, d) => s + (Number(d[yAxis]) || 0), 0);
        let cum = 0;
        const paretoData = sorted.map(d => {
          cum += Number(d[yAxis]) || 0;
          return { ...d, cumPercent: totalVal ? Math.round((cum / totalVal) * 100) : 0 };
        });
        return (
          <ComposedChart data={paretoData} margin={{ top: 10, right: 30, left: 10, bottom: showLegend ? 30 : 10 }}>
            {gridEl}
            <XAxis dataKey={xAxis} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
            <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke={colors[1]} fontSize={11} tickLine={false} />
            {ttEl}{lgEl}
            <Bar yAxisId="left" dataKey={yAxis} fill={colors[0]} radius={[4, 4, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="cumPercent" stroke={colors[1]} strokeWidth={2} dot={false} />
          </ComposedChart>
        );
      }

      case 'gauge': {
        const value = data.length > 0 ? Number(data[0][yAxis]) || 0 : 0;
        const max = data.length > 1 ? Number(data[1][yAxis]) || 100 : 100;
        const pct = Math.min(100, Math.round((value / max) * 100));
        return (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <svg viewBox="0 0 200 120" className="w-48 h-28">
              <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="hsl(var(--muted))" strokeWidth="16" strokeLinecap="round" />
              <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={colors[0]} strokeWidth="16" strokeLinecap="round"
                strokeDasharray={`${pct * 2.51} 251`} />
              <text x="100" y="95" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="28" fontWeight="bold">{pct}%</text>
            </svg>
            <span className="text-sm text-muted-foreground">{value} / {max}</span>
          </div>
        );
      }

      case 'heatmap': {
        const cats = [...new Set(data.map(d => String(d[xAxis])))];
        const vals = data.map(d => Number(d[yAxis]) || 0);
        const maxVal = Math.max(...vals, 1);
        return (
          <div className="grid gap-1 p-4" style={{ gridTemplateColumns: `repeat(${Math.min(cats.length, 10)}, 1fr)` }}>
            {data.slice(0, 100).map((d, i) => {
              const val = Number(d[yAxis]) || 0;
              const intensity = val / maxVal;
              return (
                <div key={i} className="aspect-square rounded flex items-center justify-center text-xs font-medium cursor-pointer"
                  style={{ backgroundColor: `hsl(var(--chart-1) / ${0.1 + intensity * 0.9})`, color: intensity > 0.5 ? 'hsl(var(--background))' : 'hsl(var(--foreground))' }}
                  title={`${d[xAxis]}: ${val}`}
                  onClick={() => handleClick(d)}>
                  {val.toFixed(0)}
                </div>
              );
            })}
          </div>
        );
      }

      case 'boxplot': {
        const vals = data.map(d => Number(d[yAxis]) || 0).sort((a, b) => a - b);
        if (vals.length < 5) return <div className="flex items-center justify-center h-full text-muted-foreground">Need at least 5 data points</div>;
        const q1 = vals[Math.floor(vals.length * 0.25)];
        const median = vals[Math.floor(vals.length * 0.5)];
        const q3 = vals[Math.floor(vals.length * 0.75)];
        const min = vals[0];
        const max = vals[vals.length - 1];
        const range = max - min || 1;
        const pct = (v: number) => ((v - min) / range) * 80 + 10;
        return (
          <div className="flex items-center justify-center h-full px-8">
            <svg viewBox="0 0 400 100" className="w-full h-20">
              <line x1={`${pct(min)}%`} y1="50" x2={`${pct(q1)}%`} y2="50" stroke="hsl(var(--muted-foreground))" strokeWidth="2" />
              <line x1={`${pct(q3)}%`} y1="50" x2={`${pct(max)}%`} y2="50" stroke="hsl(var(--muted-foreground))" strokeWidth="2" />
              <line x1={`${pct(min)}%`} y1="35" x2={`${pct(min)}%`} y2="65" stroke="hsl(var(--muted-foreground))" strokeWidth="2" />
              <line x1={`${pct(max)}%`} y1="35" x2={`${pct(max)}%`} y2="65" stroke="hsl(var(--muted-foreground))" strokeWidth="2" />
              <rect x={`${pct(q1)}%`} y="25" width={`${pct(q3) - pct(q1)}%`} height="50" fill={colors[0]} fillOpacity={0.3} stroke={colors[0]} strokeWidth="2" rx="4" />
              <line x1={`${pct(median)}%`} y1="25" x2={`${pct(median)}%`} y2="75" stroke={colors[0]} strokeWidth="3" />
              <text x={`${pct(min)}%`} y="90" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">{min.toFixed(0)}</text>
              <text x={`${pct(q1)}%`} y="18" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">Q1: {q1.toFixed(0)}</text>
              <text x={`${pct(median)}%`} y="90" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="10" fontWeight="bold">Med: {median.toFixed(0)}</text>
              <text x={`${pct(q3)}%`} y="18" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">Q3: {q3.toFixed(0)}</text>
              <text x={`${pct(max)}%`} y="90" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">{max.toFixed(0)}</text>
            </svg>
          </div>
        );
      }

      case 'candlestick':
        return (
          <BarChart data={data} {...commonProps}>
            {gridEl}{xEl}{yEl}{ttEl}
            <Bar dataKey={yAxis} fill={colors[0]} radius={[2, 2, 0, 0]}>
              {data.map((d, i) => {
                const val = Number(d[yAxis]) || 0;
                const prev = i > 0 ? Number(data[i - 1][yAxis]) || 0 : val;
                return <Cell key={i} fill={val >= prev ? '#22c55e' : '#ef4444'} />;
              })}
            </Bar>
          </BarChart>
        );

      case 'polar':
        return (
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis dataKey={xAxis} stroke="hsl(var(--muted-foreground))" fontSize={11} />
            <PolarRadiusAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
            <Radar dataKey={yAxis} stroke={colors[0]} fill={colors[0]} fillOpacity={0.4} />
            {ttEl}{lgEl}
          </RadarChart>
        );

      case 'timeline':
      case 'calendar':
      case 'stream':
        return (
          <AreaChart {...commonProps}>
            {gridEl}{xEl}{yEl}{ttEl}{lgEl}
            <Area type="monotone" dataKey={yAxis} stroke={colors[0]} fill={colors[0]} fillOpacity={0.3} />
          </AreaChart>
        );

      case 'bullet':
      case 'progress': {
        const val = data.length > 0 ? Number(data[0][yAxis]) || 0 : 0;
        const target = data.length > 1 ? Number(data[1][yAxis]) || 100 : 100;
        const pctVal = Math.min(100, Math.round((val / (target || 1)) * 100));
        return (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-8">
            <div className="w-full h-8 rounded-full bg-muted overflow-hidden relative">
              <div className="h-full rounded-full transition-all" style={{ width: `${pctVal}%`, backgroundColor: colors[0] }} />
            </div>
            <div className="flex justify-between w-full text-sm text-muted-foreground">
              <span>Current: {val.toLocaleString()}</span>
              <span>Target: {target.toLocaleString()}</span>
            </div>
          </div>
        );
      }

      case 'kpi-card': {
        const val = data.length > 0 ? Number(data[0][yAxis]) || 0 : 0;
        const label = data.length > 0 ? String(data[0][xAxis] || yAxis) : yAxis;
        return (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <span className="text-4xl font-bold text-foreground">{val.toLocaleString()}</span>
            <span className="text-sm text-muted-foreground">{label}</span>
          </div>
        );
      }

      case 'sankey':
      case 'sunburst':
      case 'word-cloud':
      case 'geo':
      case 'choropleth':
      case 'network':
      case 'force':
      case 'tree':
      case 'parallel':
      case '3d-scatter':
      case '3d-surface':
        return (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <span className="text-2xl">🔧</span>
            </div>
            <p className="font-medium">{type}</p>
            <p className="text-xs">Advanced visualization — requires additional setup</p>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Chart type "{type}" coming soon
          </div>
        );
    }
  }, [type, data, xAxis, yAxis, colors, showGrid, showLegend, showLabels, legendProps]);

  return (
    <Card className="bg-card border-border">
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="pt-4">
        {suitabilityIssue ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8" style={{ minHeight: height }}>
            <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/10">
              Not suitable for this chart
            </Badge>
            <p className="text-sm text-muted-foreground text-center max-w-md">{suitabilityIssue}</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            {chartContent}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
