import { useDashboard } from '@/contexts/DashboardContext';
import { useData } from '@/contexts/DataContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Trash2, X, ChevronDown } from 'lucide-react';
import { CHART_TYPES_BY_PLAN } from '@/types/subscription';
import { useSubscription } from '@/hooks/useSubscription';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const AGGREGATIONS = ['sum', 'avg', 'count', 'min', 'max'] as const;
const PALETTES = ['default', 'pastel', 'bold', 'monochrome', 'ocean', 'sunset'];

function Section({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
        {title}
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 pt-2 pb-1">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-semibold text-foreground">Widget Settings</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => selectWidget(null)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Title Section */}
        <Section title="Title" defaultOpen={true}>
          <div className="space-y-1">
            <Input value={widget.config.title || ''} onChange={e => update({ title: e.target.value })} className="h-8 text-sm" placeholder="Widget title" />
          </div>
        </Section>

        <Separator />

        {/* Data Section */}
        <Section title="Data" defaultOpen={true}>
          {widget.type === 'chart' && (
            <div className="space-y-3">
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
              <div className="space-y-1">
                <Label className="text-xs">X Axis</Label>
                <Select value={widget.config.xAxis || ''} onValueChange={v => update({ xAxis: v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select column" /></SelectTrigger>
                  <SelectContent>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Y Axis</Label>
                <Select value={widget.config.yAxis || ''} onValueChange={v => update({ yAxis: v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select column" /></SelectTrigger>
                  <SelectContent>{numericCols.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}

          {widget.type === 'kpi' && (
            <div className="space-y-1">
              <Label className="text-xs">KPI Column</Label>
              <Select value={widget.config.kpiColumn || ''} onValueChange={v => update({ kpiColumn: v })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select column" /></SelectTrigger>
                <SelectContent>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}

          {(widget.type === 'chart' || widget.type === 'kpi') && (
            <div className="space-y-1">
              <Label className="text-xs">Aggregation</Label>
              <Select value={widget.config.aggregation || 'sum'} onValueChange={v => update({ aggregation: v as any })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{AGGREGATIONS.map(a => <SelectItem key={a} value={a}>{a.toUpperCase()}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}

          {widget.type === 'text' && (
            <div className="space-y-1">
              <Label className="text-xs">Content</Label>
              <Input value={widget.config.textContent || ''} onChange={e => update({ textContent: e.target.value })} className="h-8 text-sm" />
            </div>
          )}

          {widget.type === 'table' && (
            <div className="space-y-1">
              <Label className="text-xs">Row Limit</Label>
              <Input type="number" value={widget.config.tableRowLimit || 50} onChange={e => update({ tableRowLimit: parseInt(e.target.value) || 50 })} className="h-8 text-sm" />
            </div>
          )}
        </Section>

        <Separator />

        {/* Style Section */}
        <Section title="Style" defaultOpen={false}>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Color Palette</Label>
              <Select value={widget.config.colorPalette || 'default'} onValueChange={v => update({ colorPalette: v })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{PALETTES.map(p => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>)}</SelectContent>
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
          </div>
        </Section>

        {/* Advanced Section */}
        {widget.type === 'chart' && (
          <>
            <Separator />
            <Section title="Advanced" defaultOpen={false}>
              <div className="space-y-3">
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
              </div>
            </Section>
          </>
        )}

        <Separator />
        <Button variant="destructive" size="sm" className="w-full" onClick={() => removeWidget(widget.id)}>
          <Trash2 className="h-4 w-4 mr-2" />Remove Widget
        </Button>
      </div>
    </div>
  );
}
