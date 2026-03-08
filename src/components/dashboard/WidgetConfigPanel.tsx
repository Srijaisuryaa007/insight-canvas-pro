import { useDashboard } from '@/contexts/DashboardContext';
import { useData } from '@/contexts/DataContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Trash2, X, ChevronDown, GripVertical, Plus } from 'lucide-react';
import { CHART_TYPES_BY_PLAN } from '@/types/subscription';
import { useSubscription } from '@/hooks/useSubscription';
import { useState, useCallback } from 'react';
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

/** A field well that accepts one column (single select) */
function SingleFieldWell({
  label, value, columns, onChange, onClear, icon
}: {
  label: string; value?: string; columns: string[];
  onChange: (v: string) => void; onClear: () => void; icon?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
        {icon && <span className="text-xs">{icon}</span>}
        {label}
      </Label>
      <div className="rounded-md border border-dashed border-border bg-muted/20 p-1.5 min-h-[32px]">
        {value ? (
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className="text-[10px] gap-1 pr-1">
              <GripVertical className="h-2.5 w-2.5 text-muted-foreground" />
              {value}
              <button onClick={onClear} className="ml-0.5 hover:text-destructive">
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          </div>
        ) : (
          <Select value="" onValueChange={onChange}>
            <SelectTrigger className="h-6 text-[10px] border-0 bg-transparent shadow-none p-0 px-1">
              <span className="text-muted-foreground/60">Drop column here</span>
            </SelectTrigger>
            <SelectContent>
              {columns.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}

/** A field well that accepts multiple columns */
function MultiFieldWell({
  label, values, columns, onChange, icon
}: {
  label: string; values: string[]; columns: string[];
  onChange: (vals: string[]) => void; icon?: string;
}) {
  const available = columns.filter(c => !values.includes(c));

  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
        {icon && <span className="text-xs">{icon}</span>}
        {label}
        {values.length > 0 && <span className="text-muted-foreground/60">({values.length})</span>}
      </Label>
      <div className="rounded-md border border-dashed border-border bg-muted/20 p-1.5 min-h-[32px] space-y-1">
        {values.map(v => (
          <Badge key={v} variant="secondary" className="text-[10px] gap-1 pr-1 mr-1">
            <GripVertical className="h-2.5 w-2.5 text-muted-foreground" />
            {v}
            <button onClick={() => onChange(values.filter(x => x !== v))} className="ml-0.5 hover:text-destructive">
              <X className="h-2.5 w-2.5" />
            </button>
          </Badge>
        ))}
        {available.length > 0 && (
          <Select value="" onValueChange={v => onChange([...values, v])}>
            <SelectTrigger className="h-6 text-[10px] border-0 bg-transparent shadow-none p-0 px-1 w-auto inline-flex">
              <Plus className="h-2.5 w-2.5 mr-0.5 text-muted-foreground" />
              <span className="text-muted-foreground/60">Add</span>
            </SelectTrigger>
            <SelectContent>
              {available.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}

export function WidgetConfigPanel() {
  const { currentPage, selectedWidgetId, updateWidgetConfig, removeWidget, selectWidget } = useDashboard();
  const { currentData, currentDataset } = useData();
  const { plan } = useSubscription();

  const widget = currentPage?.widgets.find(w => w.id === selectedWidgetId);
  if (!widget) return null;

  const columns = currentData.length > 0
    ? Object.keys(currentData[0])
    : currentDataset?.columns.map(c => c.name) || [];
  const numericCols = currentData.length > 0
    ? columns.filter(c => typeof currentData[0][c] === 'number')
    : currentDataset?.columns.filter(c => c.type === 'number').map(c => c.name) || [];
  const availableCharts = CHART_TYPES_BY_PLAN[plan] || CHART_TYPES_BY_PLAN.free;
  const noData = columns.length === 0;

  const update = (cfg: Partial<typeof widget.config>) => updateWidgetConfig(widget.id, cfg);

  const isChart = widget.type === 'chart';
  const isTable = widget.type === 'table';

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
        {/* Title */}
        <Section title="Title" defaultOpen={true}>
          <Input value={widget.config.title || ''} onChange={e => update({ title: e.target.value })} className="h-8 text-sm" placeholder="Widget title" />
        </Section>

        <Separator />

        {/* Chart Type */}
        {isChart && (
          <>
            <Section title="Chart Type" defaultOpen={true}>
              <Select value={widget.config.chartType || 'bar'} onValueChange={v => update({ chartType: v })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableCharts.map(ct => (
                    <SelectItem key={ct} value={ct}>{ct.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Section>
            <Separator />
          </>
        )}

        {/* ═══════ FIELD WELLS ═══════ */}
        {(isChart || isTable) && (
          <Section title="Field Wells" defaultOpen={true}>
            {noData && (
              <div className="text-[10px] text-muted-foreground bg-muted/30 rounded-md p-2 mb-2">
                ⚠️ Upload or select a dataset first to see available columns.
              </div>
            )}
            <div className="space-y-2.5">
              {/* X-Axis */}
              <SingleFieldWell
                label="X-Axis" icon="📊"
                value={widget.config.xAxis}
                columns={columns}
                onChange={v => update({ xAxis: v })}
                onClear={() => update({ xAxis: undefined })}
              />

              {/* Y-Axis */}
              <SingleFieldWell
                label="Y-Axis" icon="📈"
                value={widget.config.yAxis}
                columns={numericCols}
                onChange={v => update({ yAxis: v })}
                onClear={() => update({ yAxis: undefined })}
              />

              {/* Values (multi) */}
              <MultiFieldWell
                label="Values" icon="🔢"
                values={widget.config.values || []}
                columns={numericCols}
                onChange={vals => update({ values: vals })}
              />

              {/* Legend */}
              <SingleFieldWell
                label="Legend" icon="🏷️"
                value={widget.config.legend}
                columns={columns}
                onChange={v => update({ legend: v })}
                onClear={() => update({ legend: undefined })}
              />

              {/* Tooltip */}
              <MultiFieldWell
                label="Tooltip" icon="💬"
                values={widget.config.tooltip || []}
                columns={columns}
                onChange={vals => update({ tooltip: vals })}
              />

              {/* Details */}
              <MultiFieldWell
                label="Details" icon="📋"
                values={widget.config.details || []}
                columns={columns}
                onChange={vals => update({ details: vals })}
              />

              {/* Small Multiples */}
              <SingleFieldWell
                label="Small Multiples" icon="🔲"
                value={widget.config.smallMultiples}
                columns={columns}
                onChange={v => update({ smallMultiples: v })}
                onClear={() => update({ smallMultiples: undefined })}
              />

              {/* Filters */}
              <MultiFieldWell
                label="Filters" icon="🔍"
                values={widget.config.filters || []}
                columns={columns}
                onChange={vals => update({ filters: vals })}
              />

              {/* Rows */}
              <MultiFieldWell
                label="Rows" icon="↔️"
                values={widget.config.rows || []}
                columns={columns}
                onChange={vals => update({ rows: vals })}
              />

              {/* Columns */}
              <MultiFieldWell
                label="Columns" icon="↕️"
                values={widget.config.columns || []}
                columns={columns}
                onChange={vals => update({ columns: vals })}
              />

              {/* Drill Through */}
              <MultiFieldWell
                label="Drill Through" icon="🔗"
                values={widget.config.drillThrough || []}
                columns={columns}
                onChange={vals => update({ drillThrough: vals })}
              />

              {/* Secondary Y-Axis */}
              <SingleFieldWell
                label="Secondary Y-Axis" icon="📉"
                value={widget.config.secondaryYAxis}
                columns={numericCols}
                onChange={v => update({ secondaryYAxis: v })}
                onClear={() => update({ secondaryYAxis: undefined })}
              />
            </div>
          </Section>
        )}

        {/* KPI field */}
        {widget.type === 'kpi' && (
          <Section title="Data" defaultOpen={true}>
            <SingleFieldWell
              label="KPI Column" icon="🔢"
              value={widget.config.kpiColumn}
              columns={columns}
              onChange={v => update({ kpiColumn: v })}
              onClear={() => update({ kpiColumn: undefined })}
            />
          </Section>
        )}

        {/* Aggregation */}
        {(isChart || widget.type === 'kpi') && (
          <>
            <Separator />
            <Section title="Aggregation" defaultOpen={true}>
              <Select value={widget.config.aggregation || 'sum'} onValueChange={v => update({ aggregation: v as any })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{AGGREGATIONS.map(a => <SelectItem key={a} value={a}>{a.toUpperCase()}</SelectItem>)}</SelectContent>
              </Select>
            </Section>
          </>
        )}

        {/* Text config */}
        {widget.type === 'text' && (
          <Section title="Content" defaultOpen={true}>
            <Input value={widget.config.textContent || ''} onChange={e => update({ textContent: e.target.value })} className="h-8 text-sm" />
          </Section>
        )}

        {/* Table config */}
        {isTable && (
          <Section title="Table" defaultOpen={true}>
            <div className="space-y-1">
              <Label className="text-xs">Row Limit</Label>
              <Input type="number" value={widget.config.tableRowLimit || 50} onChange={e => update({ tableRowLimit: parseInt(e.target.value) || 50 })} className="h-8 text-sm" />
            </div>
          </Section>
        )}

        <Separator />

        {/* Style */}
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

        {/* Advanced / Sort */}
        {isChart && (
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
