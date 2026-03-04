import { useDashboard } from '@/contexts/DashboardContext';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Trash2, X } from 'lucide-react';
import { CHART_TYPES_BY_PLAN } from '@/types/subscription';
import { useSubscription } from '@/hooks/useSubscription';

const AGGREGATIONS = ['sum', 'avg', 'count', 'min', 'max'] as const;
const PALETTES = ['default', 'pastel', 'bold', 'monochrome', 'ocean', 'sunset'];

export function WidgetConfigPanel() {
  const { currentPage, selectedWidgetId, updateWidgetConfig, removeWidget, selectWidget } = useDashboard();
  const { currentData, currentDataset } = useData();
  const { plan } = useSubscription();

  const widget = currentPage?.widgets.find(w => w.id === selectedWidgetId);
  if (!widget) return null;

  const columns = currentData.length > 0 ? Object.keys(currentData[0]) : currentDataset?.columns.map(c => c.name) || [];
  const numericCols = columns.filter(c => currentData.length > 0 && typeof currentData[0][c] === 'number');
  const availableCharts = CHART_TYPES_BY_PLAN[plan] || CHART_TYPES_BY_PLAN.free;

  const update = (cfg: Partial<typeof widget.config>) => updateWidgetConfig(widget.id, cfg);

  return (
    <Card className="w-72 shrink-0 bg-card border-border overflow-y-auto max-h-[calc(100vh-10rem)]">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Widget Settings</CardTitle>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => selectWidget(null)}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Title */}
        <div className="space-y-1">
          <Label className="text-xs">Title</Label>
          <Input value={widget.config.title || ''} onChange={e => update({ title: e.target.value })} className="h-8 text-sm" />
        </div>

        {/* Chart Type (for chart widgets) */}
        {widget.type === 'chart' && (
          <div className="space-y-1">
            <Label className="text-xs">Chart Type</Label>
            <Select value={widget.config.chartType || 'bar'} onValueChange={v => update({ chartType: v })}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableCharts.map(ct => (
                  <SelectItem key={ct} value={ct}>{ct.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Axes */}
        {(widget.type === 'chart' || widget.type === 'kpi') && (
          <>
            <div className="space-y-1">
              <Label className="text-xs">{widget.type === 'kpi' ? 'KPI Column' : 'X Axis'}</Label>
              <Select value={widget.type === 'kpi' ? (widget.config.kpiColumn || '') : (widget.config.xAxis || '')} onValueChange={v => update(widget.type === 'kpi' ? { kpiColumn: v } : { xAxis: v })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select column" /></SelectTrigger>
                <SelectContent>
                  {columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {widget.type === 'chart' && (
              <div className="space-y-1">
                <Label className="text-xs">Y Axis</Label>
                <Select value={widget.config.yAxis || ''} onValueChange={v => update({ yAxis: v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select column" /></SelectTrigger>
                  <SelectContent>
                    {numericCols.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </>
        )}

        {/* Aggregation */}
        {(widget.type === 'chart' || widget.type === 'kpi') && (
          <div className="space-y-1">
            <Label className="text-xs">Aggregation</Label>
            <Select value={widget.config.aggregation || 'sum'} onValueChange={v => update({ aggregation: v as any })}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {AGGREGATIONS.map(a => <SelectItem key={a} value={a}>{a.toUpperCase()}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Text content */}
        {widget.type === 'text' && (
          <div className="space-y-1">
            <Label className="text-xs">Content</Label>
            <Input value={widget.config.textContent || ''} onChange={e => update({ textContent: e.target.value })} className="h-8 text-sm" />
          </div>
        )}

        {/* Table columns */}
        {widget.type === 'table' && (
          <div className="space-y-1">
            <Label className="text-xs">Row Limit</Label>
            <Input type="number" value={widget.config.tableRowLimit || 50} onChange={e => update({ tableRowLimit: parseInt(e.target.value) || 50 })} className="h-8 text-sm" />
          </div>
        )}

        <Separator />

        {/* Visual options */}
        <div className="space-y-1">
          <Label className="text-xs">Color Palette</Label>
          <Select value={widget.config.colorPalette || 'default'} onValueChange={v => update({ colorPalette: v })}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PALETTES.map(p => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-xs">Legend</Label>
          <Switch checked={widget.config.showLegend !== false} onCheckedChange={v => update({ showLegend: v })} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-xs">Grid Lines</Label>
          <Switch checked={widget.config.showGrid !== false} onCheckedChange={v => update({ showGrid: v })} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-xs">Data Labels</Label>
          <Switch checked={widget.config.showLabels === true} onCheckedChange={v => update({ showLabels: v })} />
        </div>

        {/* Sorting */}
        {widget.type === 'chart' && (
          <>
            <Separator />
            <div className="space-y-1">
              <Label className="text-xs">Sort By</Label>
              <Select value={widget.config.sortColumn || '__none__'} onValueChange={v => update({ sortColumn: v === '__none__' ? '' : v })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {widget.config.sortColumn && (
              <div className="space-y-1">
                <Label className="text-xs">Direction</Label>
                <Select value={widget.config.sortDirection || 'asc'} onValueChange={v => update({ sortDirection: v as 'asc' | 'desc' })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </>
        )}

        <Separator />
        <Button variant="destructive" size="sm" className="w-full" onClick={() => removeWidget(widget.id)}>
          <Trash2 className="h-4 w-4 mr-2" />Remove Widget
        </Button>
      </CardContent>
    </Card>
  );
}
