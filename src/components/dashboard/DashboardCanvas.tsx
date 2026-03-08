import { useMemo, useCallback, useState } from 'react';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import { useDashboard } from '@/contexts/DashboardContext';
import { useData } from '@/contexts/DataContext';
import { DashboardWidget } from '@/types/dashboard';
import { ChartRenderer } from '@/components/charts/ChartRenderer';
import { Button } from '@/components/ui/button';
import { GripVertical, X, Maximize2, MoreHorizontal, BarChart3, Hash, Table2, LayoutDashboard, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

function aggregateData(
  data: Record<string, unknown>[],
  xAxis?: string,
  yAxis?: string,
  agg?: string,
  sortCol?: string,
  sortDir?: string,
): Record<string, unknown>[] {
  if (!xAxis || !yAxis || !data.length) return data;
  const grouped: Record<string, number[]> = {};
  data.forEach(r => {
    const key = String(r[xAxis] ?? '');
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(Number(r[yAxis]) || 0);
  });

  let result = Object.entries(grouped).map(([key, vals]) => {
    let val: number;
    switch (agg) {
      case 'avg': val = vals.reduce((a, b) => a + b, 0) / vals.length; break;
      case 'count': val = vals.length; break;
      case 'min': val = Math.min(...vals); break;
      case 'max': val = Math.max(...vals); break;
      default: val = vals.reduce((a, b) => a + b, 0); break;
    }
    return { [xAxis]: key, [yAxis]: Math.round(val * 100) / 100 };
  });

  if (sortCol) {
    result.sort((a, b) => {
      const av = a[sortCol], bv = b[sortCol];
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }
  return result;
}

function formatNumber(val: number): string {
  if (Math.abs(val) >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(val) >= 1_000) return (val / 1_000).toFixed(1) + 'K';
  return val.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function KPIWidget({ widget, data }: { widget: DashboardWidget; data: Record<string, unknown>[] }) {
  const col = widget.config.kpiColumn || widget.config.yAxis;
  const vals = col ? data.map(r => Number(r[col]) || 0).filter(v => !isNaN(v)) : [];
  const hasData = vals.length > 0 && col;

  let value = 0;
  if (hasData) {
    switch (widget.config.aggregation) {
      case 'avg': value = vals.reduce((a, b) => a + b, 0) / vals.length; break;
      case 'count': value = vals.length; break;
      case 'min': value = Math.min(...vals); break;
      case 'max': value = Math.max(...vals); break;
      default: value = vals.reduce((a, b) => a + b, 0);
    }
  }

  const label = widget.config.title || (col ? col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'KPI');

  return (
    <div className="flex flex-col items-center justify-center h-full gap-1.5 px-3">
      <span className={cn("text-3xl font-bold", hasData ? "text-foreground" : "text-muted-foreground")}>
        {hasData ? formatNumber(value) : '--'}
      </span>
      <span className="text-xs text-muted-foreground text-center leading-tight">{label}</span>
      {!hasData && (
        <span className="text-[10px] text-muted-foreground/60">Connect data to see value</span>
      )}
    </div>
  );
}

function TableWidget({ widget, data }: { widget: DashboardWidget; data: Record<string, unknown>[] }) {
  const cols = widget.config.tableColumns?.length ? widget.config.tableColumns : (data.length ? Object.keys(data[0]).slice(0, 8) : []);
  const rows = data.slice(0, widget.config.tableRowLimit || 50);
  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-xs">
        <thead><tr>{cols.map(c => <th key={c} className="text-left p-1.5 border-b border-border text-muted-foreground font-medium sticky top-0 bg-card">{c}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} className="hover:bg-muted/50">{cols.map(c => <td key={c} className="p-1.5 border-b border-border/50">{String(r[c] ?? '')}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function TextWidget({ widget }: { widget: DashboardWidget }) {
  const sizeClass = { sm: 'text-sm', md: 'text-base', lg: 'text-lg', xl: 'text-xl' }[widget.config.textSize || 'md'];
  return <div className={cn('flex items-center justify-center h-full p-4 text-foreground', sizeClass)}>{widget.config.textContent || 'Text'}</div>;
}

interface DashboardCanvasProps {
  width: number;
  onAddWidget?: (type: any, config?: any) => void;
}

export function DashboardCanvas({ width, onAddWidget }: DashboardCanvasProps) {
  const { currentPage, selectedWidgetId, selectWidget, updateLayouts, removeWidget, crossFilter, setCrossFilter, zoom } = useDashboard();
  const { currentData } = useData();
  const [hoveredWidget, setHoveredWidget] = useState<string | null>(null);

  const filteredData = useMemo(() => {
    if (!crossFilter) return currentData;
    return currentData.filter(r => String(r[crossFilter.key]) === crossFilter.value);
  }, [currentData, crossFilter]);

  const layout = useMemo(() =>
    (currentPage?.widgets || []).map(w => ({
      i: w.id, x: w.layout.x, y: w.layout.y, w: w.layout.w, h: w.layout.h,
      minW: w.layout.minW || 2, minH: w.layout.minH || 2,
    })),
    [currentPage?.widgets]
  );

  const handleLayoutChange = useCallback((newLayout: GridLayout.Layout[]) => {
    updateLayouts(newLayout.map(l => ({ i: l.i, x: l.x, y: l.y, w: l.w, h: l.h })));
  }, [updateLayouts]);

  const handleDataClick = useCallback((widgetId: string, dataPoint: Record<string, unknown>) => {
    const keys = Object.keys(dataPoint);
    const strKey = keys.find(k => typeof dataPoint[k] === 'string');
    if (!strKey) return;
    const val = String(dataPoint[strKey]);
    if (crossFilter?.key === strKey && crossFilter?.value === val) {
      setCrossFilter(null);
    } else {
      setCrossFilter({ key: strKey, value: val });
    }
  }, [crossFilter, setCrossFilter]);

  if (!currentPage) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground">No page selected</div>;
  }

  const scaledWidth = Math.max(600, width * (100 / zoom));
  const cols = 12;

  // Empty state
  if (currentPage.widgets.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-muted/20 rounded-lg gap-4 p-8">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 border border-border flex items-center justify-center">
          <LayoutDashboard className="w-8 h-8 text-muted-foreground/50" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Your dashboard is empty</p>
          <p className="text-xs text-muted-foreground mt-1">Add widgets to start visualizing your data</p>
        </div>
        {onAddWidget && (
          <div className="flex items-center gap-2 mt-2">
            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => onAddWidget('kpi', { title: 'KPI' })}>
              <Hash className="h-3.5 w-3.5" />KPI Card
            </Button>
            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => onAddWidget('chart', { chartType: 'bar' })}>
              <BarChart3 className="h-3.5 w-3.5" />Chart
            </Button>
            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => onAddWidget('table', { title: 'Data Table' })}>
              <Table2 className="h-3.5 w-3.5" />Table
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-muted/20 rounded-lg p-2" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}>
      <GridLayout
        className="layout"
        layout={layout}
        cols={cols}
        rowHeight={60}
        width={scaledWidth}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".drag-handle"
        compactType="vertical"
        isResizable
        isDraggable
        margin={[12, 12]}
      >
        {currentPage.widgets.map(widget => {
          const isSelected = widget.id === selectedWidgetId;
          const isHovered = widget.id === hoveredWidget;
          return (
            <div
              key={widget.id}
              className={cn(
                'rounded-lg border bg-card overflow-hidden transition-all',
                isSelected
                  ? 'ring-2 ring-primary border-primary shadow-md'
                  : isHovered
                    ? 'border-muted-foreground/30 shadow-md'
                    : 'border-border shadow-sm'
              )}
              onClick={(e) => { e.stopPropagation(); selectWidget(widget.id); }}
              onMouseEnter={() => setHoveredWidget(widget.id)}
              onMouseLeave={() => setHoveredWidget(null)}
            >
              {/* Widget header */}
              <div className="drag-handle flex items-center justify-between px-2 py-1 bg-muted/30 cursor-grab active:cursor-grabbing border-b border-border/50">
                <div className="flex items-center gap-1 min-w-0">
                  <GripVertical className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                  <span className="text-[11px] font-medium text-muted-foreground truncate">{widget.config.title || widget.type}</span>
                </div>
                <div className={cn("flex items-center gap-0.5 transition-opacity", isHovered || isSelected ? "opacity-100" : "opacity-0")}>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeWidget(widget.id); }}
                    className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
              {/* Widget body */}
              <div className="p-2 h-[calc(100%-28px)]">
                <WidgetBody widget={widget} data={filteredData} onDataClick={(dp) => handleDataClick(widget.id, dp)} />
              </div>
            </div>
          );
        })}
      </GridLayout>
    </div>
  );
}

function WidgetBody({ widget, data, onDataClick }: { widget: DashboardWidget; data: Record<string, unknown>[]; onDataClick: (dp: Record<string, unknown>) => void }) {
  const chartData = useMemo(() => {
    if (widget.type !== 'chart') return data;
    return aggregateData(data, widget.config.xAxis, widget.config.yAxis, widget.config.aggregation, widget.config.sortColumn, widget.config.sortDirection);
  }, [data, widget.type, widget.config.xAxis, widget.config.yAxis, widget.config.aggregation, widget.config.sortColumn, widget.config.sortDirection]);

  switch (widget.type) {
    case 'chart': {
      if (!data.length) {
        return (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-1">
            <BarChart3 className="h-6 w-6 opacity-30" />
            <span className="text-[10px]">No data — upload or select a dataset</span>
          </div>
        );
      }
      if (!widget.config.xAxis || !widget.config.yAxis) {
        return (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-1">
            <BarChart3 className="h-6 w-6 opacity-30" />
            <span className="text-[10px]">Set X-Axis and Y-Axis in Field Wells</span>
          </div>
        );
      }
      return (
        <ChartRenderer
          type={widget.config.chartType || 'bar'}
          data={chartData}
          xAxis={widget.config.xAxis}
          yAxis={widget.config.yAxis}
          height={(widget.layout.h * 60) - 50}
          colorPalette={widget.config.colorPalette}
          showLegend={widget.config.showLegend}
          showGrid={widget.config.showGrid}
          showLabels={widget.config.showLabels}
          onDataClick={onDataClick}
        />
      );
    }
    case 'kpi':
      return <KPIWidget widget={widget} data={data} />;
    case 'table':
      return <TableWidget widget={widget} data={data} />;
    case 'text':
      return <TextWidget widget={widget} />;
    default:
      return <div className="text-muted-foreground text-sm text-center">Unsupported widget type</div>;
  }
}
