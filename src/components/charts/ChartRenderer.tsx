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

      // ─── Advanced Combinational Charts ───

      case 'violin': {
        // Violin = mirrored density/distribution shape
        const vals = data.map(d => Number(d[yAxis]) || 0).sort((a, b) => a - b);
        if (vals.length < 5) return <div className="flex items-center justify-center h-full text-muted-foreground">Need 5+ data points for violin</div>;
        const min = vals[0], max = vals[vals.length - 1], range = max - min || 1;
        const binCount = Math.min(20, Math.ceil(Math.sqrt(vals.length)));
        const binWidth = range / binCount;
        const bins = Array.from({ length: binCount }, (_, i) => {
          const lo = min + i * binWidth;
          const hi = lo + binWidth;
          const count = vals.filter(v => v >= lo && (i === binCount - 1 ? v <= hi : v < hi)).length;
          return { y: lo + binWidth / 2, count };
        });
        const maxCount = Math.max(...bins.map(b => b.count), 1);
        const q1 = vals[Math.floor(vals.length * 0.25)];
        const median = vals[Math.floor(vals.length * 0.5)];
        const q3 = vals[Math.floor(vals.length * 0.75)];
        const pY = (v: number) => 90 - ((v - min) / range) * 80;
        return (
          <div className="flex items-center justify-center h-full px-4">
            <svg viewBox="0 0 200 100" className="w-full max-w-xs" style={{ height: height * 0.8 }}>
              {/* Violin shape */}
              {bins.map((bin, i) => {
                const w = (bin.count / maxCount) * 60;
                const y = pY(bin.y);
                return <rect key={i} x={100 - w / 2} y={y - 2} width={w} height={4} fill={colors[0]} fillOpacity={0.4} rx={2} />;
              })}
              {/* Box */}
              <rect x={90} y={pY(q3)} width={20} height={pY(q1) - pY(q3)} fill={colors[0]} fillOpacity={0.6} stroke={colors[0]} strokeWidth={1} rx={3} />
              {/* Median line */}
              <line x1={88} y1={pY(median)} x2={112} y2={pY(median)} stroke="hsl(var(--foreground))" strokeWidth={2} />
              {/* Whiskers */}
              <line x1={100} y1={pY(max)} x2={100} y2={pY(q3)} stroke="hsl(var(--muted-foreground))" strokeWidth={1} />
              <line x1={100} y1={pY(q1)} x2={100} y2={pY(min)} stroke="hsl(var(--muted-foreground))" strokeWidth={1} />
              <line x1={95} y1={pY(max)} x2={105} y2={pY(max)} stroke="hsl(var(--muted-foreground))" strokeWidth={1} />
              <line x1={95} y1={pY(min)} x2={105} y2={pY(min)} stroke="hsl(var(--muted-foreground))" strokeWidth={1} />
              {/* Labels */}
              <text x={120} y={pY(median) + 3} fill="hsl(var(--foreground))" fontSize="7" fontWeight="bold">Med: {median.toFixed(0)}</text>
              <text x={120} y={pY(q1) + 3} fill="hsl(var(--muted-foreground))" fontSize="6">Q1: {q1.toFixed(0)}</text>
              <text x={120} y={pY(q3) + 3} fill="hsl(var(--muted-foreground))" fontSize="6">Q3: {q3.toFixed(0)}</text>
            </svg>
          </div>
        );
      }

      case 'density': {
        const vals = data.map(d => Number(d[yAxis]) || 0).sort((a, b) => a - b);
        if (vals.length < 3) return <div className="flex items-center justify-center h-full text-muted-foreground">Need 3+ data points</div>;
        const min = vals[0], max = vals[vals.length - 1], range = max - min || 1;
        const binCount = Math.min(30, Math.ceil(Math.sqrt(vals.length)));
        const binWidth = range / binCount;
        const densityData = Array.from({ length: binCount }, (_, i) => {
          const lo = min + i * binWidth;
          const hi = lo + binWidth;
          const count = vals.filter(v => v >= lo && (i === binCount - 1 ? v <= hi : v < hi)).length;
          return { x: `${lo.toFixed(1)}`, density: count / vals.length };
        });
        return (
          <AreaChart data={densityData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
            {showGrid ? <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /> : null}
            <XAxis dataKey="x" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotoneX" dataKey="density" stroke={colors[0]} fill={colors[0]} fillOpacity={0.35} strokeWidth={2} />
          </AreaChart>
        );
      }

      case 'stripplot': {
        const stripData = data.map((d, i) => ({
          x: String(d[xAxis] || i),
          y: Number(d[yAxis]) || 0,
          jitter: Math.random() * 0.8 - 0.4,
        }));
        const categories = [...new Set(stripData.map(d => d.x))];
        return (
          <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
            {showGrid ? <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /> : null}
            <XAxis type="category" dataKey="x" stroke="hsl(var(--muted-foreground))" fontSize={10} allowDuplicatedCategory={false} />
            <YAxis type="number" dataKey="y" stroke="hsl(var(--muted-foreground))" fontSize={10} />
            <Tooltip contentStyle={tooltipStyle} />
            <Scatter data={stripData} fill={colors[0]} fillOpacity={0.7}>
              {stripData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Scatter>
          </ScatterChart>
        );
      }

      case 'swarmplot': {
        // Swarm = jittered strip but spread out to avoid overlap
        const vals = data.map(d => Number(d[yAxis]) || 0);
        const minV = Math.min(...vals), maxV = Math.max(...vals), rangeV = maxV - minV || 1;
        const placed: { x: number; y: number }[] = [];
        const swarmData = data.map((d, i) => {
          const y = Number(d[yAxis]) || 0;
          const yNorm = ((y - minV) / rangeV) * 80 + 10;
          let x = 100;
          // Shift horizontally to avoid overlap
          for (const p of placed) {
            if (Math.abs(p.y - yNorm) < 4) {
              x += (placed.filter(pp => Math.abs(pp.y - yNorm) < 4).length % 2 === 0 ? 1 : -1) * 
                   (Math.ceil(placed.filter(pp => Math.abs(pp.y - yNorm) < 4).length / 2) * 6);
            }
          }
          placed.push({ x, y: yNorm });
          return { x, y: yNorm, value: y, label: String(d[xAxis] || i) };
        });
        return (
          <div className="flex items-center justify-center h-full">
            <svg viewBox="0 0 200 100" className="w-full max-w-md" style={{ height: height * 0.8 }}>
              {swarmData.slice(0, 200).map((d, i) => (
                <circle key={i} cx={d.x} cy={d.y} r={2.5} fill={colors[i % colors.length]} fillOpacity={0.7}>
                  <title>{d.label}: {d.value}</title>
                </circle>
              ))}
              <text x={10} y={10} fill="hsl(var(--muted-foreground))" fontSize="6">{maxV.toFixed(0)}</text>
              <text x={10} y={90} fill="hsl(var(--muted-foreground))" fontSize="6">{minV.toFixed(0)}</text>
            </svg>
          </div>
        );
      }

      case 'jointplot': {
        // Scatter in center + histograms on margins
        const xVals = data.map(d => Number(d[xAxis]) || 0);
        const yVals = data.map(d => Number(d[yAxis]) || 0);
        if (xVals.length < 3) return <div className="flex items-center justify-center h-full text-muted-foreground">Need 3+ numeric data points</div>;
        // Create bins for top histogram
        const xMin = Math.min(...xVals), xMax = Math.max(...xVals), xRange = xMax - xMin || 1;
        const yMin = Math.min(...yVals), yMax = Math.max(...yVals), yRange = yMax - yMin || 1;
        const bins = 15;
        const xBinW = xRange / bins, yBinW = yRange / bins;
        const xHist = Array.from({ length: bins }, (_, i) => ({
          pos: xMin + i * xBinW + xBinW / 2,
          count: xVals.filter(v => v >= xMin + i * xBinW && v < xMin + (i + 1) * xBinW).length,
        }));
        const yHist = Array.from({ length: bins }, (_, i) => ({
          pos: yMin + i * yBinW + yBinW / 2,
          count: yVals.filter(v => v >= yMin + i * yBinW && v < yMin + (i + 1) * yBinW).length,
        }));
        const xHistMax = Math.max(...xHist.map(b => b.count), 1);
        const yHistMax = Math.max(...yHist.map(b => b.count), 1);
        const px = (v: number) => 30 + ((v - xMin) / xRange) * 140;
        const py = (v: number) => 80 - ((v - yMin) / yRange) * 60;
        return (
          <div className="flex items-center justify-center h-full">
            <svg viewBox="0 0 200 100" className="w-full max-w-lg" style={{ height: height * 0.9 }}>
              {/* Top histogram */}
              {xHist.map((b, i) => (
                <rect key={`xh${i}`} x={px(b.pos) - 4} y={5 + (15 - (b.count / xHistMax) * 15)} width={8} height={(b.count / xHistMax) * 15} fill={colors[0]} fillOpacity={0.3} rx={1} />
              ))}
              {/* Right histogram */}
              {yHist.map((b, i) => (
                <rect key={`yh${i}`} x={175} y={py(b.pos) - 2} width={(b.count / yHistMax) * 20} height={4} fill={colors[1] || colors[0]} fillOpacity={0.3} rx={1} />
              ))}
              {/* Scatter points */}
              {data.slice(0, 300).map((d, i) => (
                <circle key={i} cx={px(Number(d[xAxis]) || 0)} cy={py(Number(d[yAxis]) || 0)} r={2} fill={colors[0]} fillOpacity={0.6}>
                  <title>{xAxis}: {d[xAxis]}, {yAxis}: {d[yAxis]}</title>
                </circle>
              ))}
              {/* Axes */}
              <line x1={30} y1={80} x2={170} y2={80} stroke="hsl(var(--muted-foreground))" strokeWidth={0.5} />
              <line x1={30} y1={20} x2={30} y2={80} stroke="hsl(var(--muted-foreground))" strokeWidth={0.5} />
              <text x={100} y={95} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="6">{xAxis}</text>
              <text x={8} y={50} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="6" transform="rotate(-90 8 50)">{yAxis}</text>
            </svg>
          </div>
        );
      }

      case 'rugplot': {
        const xVals = data.map(d => Number(d[xAxis]) || 0);
        const yVals = data.map(d => Number(d[yAxis]) || 0);
        const xMin = Math.min(...xVals), xMax = Math.max(...xVals), xRange = xMax - xMin || 1;
        const yMin = Math.min(...yVals), yMax = Math.max(...yVals), yRange = yMax - yMin || 1;
        const px = (v: number) => 20 + ((v - xMin) / xRange) * 160;
        const py = (v: number) => 80 - ((v - yMin) / yRange) * 65;
        return (
          <div className="flex items-center justify-center h-full">
            <svg viewBox="0 0 200 100" className="w-full max-w-lg" style={{ height: height * 0.8 }}>
              {/* Scatter */}
              {data.slice(0, 300).map((d, i) => (
                <circle key={i} cx={px(Number(d[xAxis]) || 0)} cy={py(Number(d[yAxis]) || 0)} r={2} fill={colors[0]} fillOpacity={0.5} />
              ))}
              {/* X rug ticks (bottom) */}
              {data.slice(0, 200).map((d, i) => (
                <line key={`rx${i}`} x1={px(Number(d[xAxis]) || 0)} y1={82} x2={px(Number(d[xAxis]) || 0)} y2={88} stroke={colors[0]} strokeWidth={0.5} strokeOpacity={0.6} />
              ))}
              {/* Y rug ticks (left) */}
              {data.slice(0, 200).map((d, i) => (
                <line key={`ry${i}`} x1={12} y1={py(Number(d[yAxis]) || 0)} x2={18} y2={py(Number(d[yAxis]) || 0)} stroke={colors[1] || colors[0]} strokeWidth={0.5} strokeOpacity={0.6} />
              ))}
              <line x1={20} y1={80} x2={180} y2={80} stroke="hsl(var(--muted-foreground))" strokeWidth={0.5} />
              <line x1={20} y1={15} x2={20} y2={80} stroke="hsl(var(--muted-foreground))" strokeWidth={0.5} />
              <text x={100} y={97} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="6">{xAxis}</text>
              <text x={5} y={50} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="6" transform="rotate(-90 5 50)">{yAxis}</text>
            </svg>
          </div>
        );
      }

      case 'ridgeline': {
        // Multiple density curves stacked vertically by category
        const categories = [...new Set(data.map(d => String(d[xAxis])))].slice(0, 8);
        const numCol = yAxis;
        const allVals = data.map(d => Number(d[numCol]) || 0);
        const gMin = Math.min(...allVals), gMax = Math.max(...allVals), gRange = gMax - gMin || 1;
        const binCount = 20;
        const binWidth = gRange / binCount;
        const rowH = 80 / categories.length;
        return (
          <div className="flex items-center justify-center h-full">
            <svg viewBox="0 0 200 100" className="w-full max-w-lg" style={{ height: height * 0.9 }}>
              {categories.map((cat, ci) => {
                const catVals = data.filter(d => String(d[xAxis]) === cat).map(d => Number(d[numCol]) || 0);
                const bins = Array.from({ length: binCount }, (_, i) => {
                  const lo = gMin + i * binWidth;
                  const count = catVals.filter(v => v >= lo && v < lo + binWidth).length;
                  return { x: 30 + (i / binCount) * 150, count };
                });
                const maxC = Math.max(...bins.map(b => b.count), 1);
                const baseY = 10 + ci * rowH + rowH;
                const points = bins.map(b => `${b.x},${baseY - (b.count / maxC) * (rowH * 0.8)}`).join(' ');
                const closedPath = `${bins[0].x},${baseY} ${points} ${bins[bins.length - 1].x},${baseY}`;
                return (
                  <g key={cat}>
                    <polygon points={closedPath} fill={colors[ci % colors.length]} fillOpacity={0.4} stroke={colors[ci % colors.length]} strokeWidth={1} />
                    <text x={5} y={baseY - rowH * 0.3} fill="hsl(var(--muted-foreground))" fontSize="5" textAnchor="start">{cat.substring(0, 10)}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        );
      }

      case 'lollipop':
        return (
          <ComposedChart data={data} layout="vertical" margin={{ top: 10, right: 20, left: 60, bottom: 10 }}>
            {showGrid ? <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /> : null}
            <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
            <YAxis dataKey={xAxis} type="category" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} width={55} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey={yAxis} fill={colors[0]} barSize={2} />
            <Scatter dataKey={yAxis} fill={colors[0]}>
              {data.map((_, i) => <Cell key={i} fill={colors[0]} />)}
            </Scatter>
          </ComposedChart>
        );

      case 'dumbbell': {
        // Compare two numeric values per category
        const numCols = data.length > 0 ? Object.keys(data[0]).filter(k => k !== xAxis && typeof data[0][k] === 'number') : [];
        const col1 = yAxis;
        const col2 = numCols.find(c => c !== yAxis) || yAxis;
        const allVals = data.flatMap(d => [Number(d[col1]) || 0, Number(d[col2]) || 0]);
        const min = Math.min(...allVals), max = Math.max(...allVals), range = max - min || 1;
        const px = (v: number) => 40 + ((v - min) / range) * 140;
        const rowH = Math.min(12, 80 / data.length);
        return (
          <div className="flex items-center justify-center h-full">
            <svg viewBox="0 0 200 100" className="w-full max-w-lg" style={{ height: height * 0.85 }}>
              {data.slice(0, 15).map((d, i) => {
                const v1 = Number(d[col1]) || 0;
                const v2 = Number(d[col2]) || 0;
                const y = 10 + i * rowH + rowH / 2;
                return (
                  <g key={i}>
                    <text x={2} y={y + 2} fill="hsl(var(--muted-foreground))" fontSize="5" textAnchor="start">{String(d[xAxis]).substring(0, 12)}</text>
                    <line x1={px(v1)} y1={y} x2={px(v2)} y2={y} stroke="hsl(var(--border))" strokeWidth={1.5} />
                    <circle cx={px(v1)} cy={y} r={3} fill={colors[0]} />
                    <circle cx={px(v2)} cy={y} r={3} fill={colors[1] || colors[0]} />
                  </g>
                );
              })}
              {/* Legend */}
              <circle cx={50} cy={96} r={2} fill={colors[0]} />
              <text x={54} y={97} fill="hsl(var(--muted-foreground))" fontSize="5">{col1}</text>
              <circle cx={100} cy={96} r={2} fill={colors[1] || colors[0]} />
              <text x={104} y={97} fill="hsl(var(--muted-foreground))" fontSize="5">{col2}</text>
            </svg>
          </div>
        );
      }

      case 'slope': {
        // Slope chart: connect two points per category
        const numCols = data.length > 0 ? Object.keys(data[0]).filter(k => k !== xAxis && typeof data[0][k] === 'number') : [];
        const col1 = yAxis;
        const col2 = numCols.find(c => c !== yAxis) || yAxis;
        const allVals = data.flatMap(d => [Number(d[col1]) || 0, Number(d[col2]) || 0]);
        const min = Math.min(...allVals), max = Math.max(...allVals), range = max - min || 1;
        const py = (v: number) => 85 - ((v - min) / range) * 70;
        return (
          <div className="flex items-center justify-center h-full">
            <svg viewBox="0 0 200 100" className="w-full max-w-md" style={{ height: height * 0.85 }}>
              <text x={50} y={8} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="6" fontWeight="bold">{col1}</text>
              <text x={150} y={8} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="6" fontWeight="bold">{col2}</text>
              {data.slice(0, 12).map((d, i) => {
                const v1 = Number(d[col1]) || 0;
                const v2 = Number(d[col2]) || 0;
                const color = colors[i % colors.length];
                return (
                  <g key={i}>
                    <line x1={50} y1={py(v1)} x2={150} y2={py(v2)} stroke={color} strokeWidth={1.5} strokeOpacity={0.7} />
                    <circle cx={50} cy={py(v1)} r={3} fill={color} />
                    <circle cx={150} cy={py(v2)} r={3} fill={color} />
                    <text x={25} y={py(v1) + 2} textAnchor="end" fill="hsl(var(--muted-foreground))" fontSize="5">{String(d[xAxis]).substring(0, 8)}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        );
      }

      case 'marimekko': {
        // Width = proportion of total, height = segments
        const categories = [...new Set(data.map(d => String(d[xAxis])))].slice(0, 10);
        const total = data.reduce((s, d) => s + (Number(d[yAxis]) || 0), 0) || 1;
        let cumX = 5;
        return (
          <div className="flex items-center justify-center h-full">
            <svg viewBox="0 0 200 100" className="w-full max-w-lg" style={{ height: height * 0.85 }}>
              {categories.map((cat, i) => {
                const catTotal = data.filter(d => String(d[xAxis]) === cat).reduce((s, d) => s + (Number(d[yAxis]) || 0), 0);
                const w = (catTotal / total) * 180;
                const x = cumX;
                cumX += w + 2;
                return (
                  <g key={cat}>
                    <rect x={x} y={10} width={Math.max(w, 4)} height={75} fill={colors[i % colors.length]} fillOpacity={0.6} rx={2} stroke={colors[i % colors.length]} strokeWidth={0.5} />
                    <text x={x + Math.max(w, 4) / 2} y={50} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="6" fontWeight="bold">{catTotal.toFixed(0)}</text>
                    <text x={x + Math.max(w, 4) / 2} y={93} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="5">{cat.substring(0, 8)}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        );
      }

      case 'combo': {
        // Bar + Line combination
        const numCols = data.length > 0 ? Object.keys(data[0]).filter(k => k !== xAxis && typeof data[0][k] === 'number') : [];
        const barCol = yAxis;
        const lineCol = numCols.find(c => c !== yAxis) || yAxis;
        return (
          <ComposedChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: showLegend ? 30 : 10 }}>
            {showGrid ? <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /> : null}
            <XAxis dataKey={xAxis} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
            <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
            <YAxis yAxisId="right" orientation="right" stroke={colors[1] || colors[0]} fontSize={11} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            {legendProps ? <Legend {...legendProps} /> : null}
            <Bar yAxisId="left" dataKey={barCol} fill={colors[0]} radius={[4, 4, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey={lineCol} stroke={colors[1] || colors[0]} strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
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
