import { useState, useRef, useEffect, useCallback } from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import { useData } from '@/contexts/DataContext';
import { useSubscription } from '@/hooks/useSubscription';
import { DashboardCanvas } from '@/components/dashboard/DashboardCanvas';
import { WidgetConfigPanel } from '@/components/dashboard/WidgetConfigPanel';
import { PanelContent } from '@/components/dashboard/PanelContent';
import TemplateGallery from '@/components/dashboard/TemplateGallery';
import { DASHBOARD_TEMPLATES } from '@/lib/dashboardTemplates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard, Plus, Undo2, Redo2, Save, ZoomIn, ZoomOut,
  BarChart3, Hash, Table2, Type, Filter as FilterIcon, Trash2,
  ChevronLeft, ChevronRight, Download, FolderOpen, Lock, Copy, FileText, Presentation, File,
  PanelLeft, Eye, RefreshCw, Database, X, Pencil, Check,
  TrendingUp, Sparkline, SlidersHorizontal
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { buildReportData, exportPDF, exportPPTX, exportDOCX } from '@/lib/exportEngine';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const WIDGET_LIMITS: Record<string, number> = {
  free: 6, basic: 15, pro: 40, enterprise: Infinity,
};

// Human-readable title generator
function generateWidgetTitle(chartType: string, xAxis?: string, yAxis?: string): string {
  const typeNames: Record<string, string> = {
    bar: 'Distribution', line: 'Trend', pie: 'Breakdown', area: 'Growth',
    scatter: 'Correlation', donut: 'Composition', radar: 'Profile',
    'stacked-bar': 'Stacked View', 'grouped-bar': 'Comparison',
    funnel: 'Funnel', treemap: 'Treemap', histogram: 'Histogram',
    heatmap: 'Heatmap', waterfall: 'Waterfall', gauge: 'Gauge',
  };
  const suffix = typeNames[chartType] || 'Chart';
  const col = (yAxis || xAxis || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
  return col ? `${col} ${suffix}` : suffix;
}

export default function DashboardBuilder() {
  const {
    dashboard, currentPage, currentPageId,
    createDashboard, loadDashboard, renameDashboard, closeDashboard,
    addPage, removePage, renamePage, setCurrentPage,
    addWidget, removeWidget, selectedWidgetId,
    undo, redo, canUndo, canRedo,
    saveDashboard, savedDashboards, deleteSavedDashboard,
    zoom, setZoom, crossFilter, setCrossFilter,
  } = useDashboard();
  const { currentDataset, currentData, datasets, selectDataset } = useData();
  const { user } = useAuth();
  const { plan, isChartAvailable } = useSubscription();
  const [showTemplates, setShowTemplates] = useState(!dashboard);
  const [showSaved, setShowSaved] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [pageNameValue, setPageNameValue] = useState('');
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(900);

  const widgetLimit = WIDGET_LIMITS[plan] || 6;
  const currentWidgetCount = currentPage?.widgets.length || 0;
  const canAddWidget = currentWidgetCount < widgetLimit;

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width;
      if (w) setContainerWidth(w);
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const handleAddWidget = useCallback((type: any, config?: any) => {
    if (!canAddWidget) {
      toast({ title: 'Widget Limit Reached', description: `${plan} plan allows ${widgetLimit} widgets per page.`, variant: 'destructive' });
      return;
    }
    if (type === 'chart' && config?.chartType && !isChartAvailable(config.chartType)) {
      toast({ title: 'Chart Locked', description: `${config.chartType} is not available on your ${plan} plan.`, variant: 'destructive' });
      return;
    }
    // Auto-generate readable title for charts
    if (type === 'chart' && config?.chartType) {
      config.title = config.title || generateWidgetTitle(config.chartType, config.xAxis, config.yAxis);
    }
    addWidget(type, config);
  }, [canAddWidget, plan, widgetLimit, isChartAvailable, addWidget]);

  const handleCopyFromVisualization = useCallback(() => {
    if (!currentData.length) {
      toast({ title: 'No data available', variant: 'destructive' });
      return;
    }
    const keys = Object.keys(currentData[0]);
    const numCols = keys.filter(k => typeof currentData[0][k] === 'number');
    const strCols = keys.filter(k => typeof currentData[0][k] === 'string');

    const existingCharts = currentPage?.widgets.filter(w => w.type === 'chart') || [];
    existingCharts.forEach(w => removeWidget(w.id));

    const chartTypes = ['bar', 'line', 'pie', 'area', 'scatter'];
    const added: string[] = [];
    const nonChartCount = (currentPage?.widgets.length || 0) - existingCharts.length;
    chartTypes.forEach((type, i) => {
      if (nonChartCount + added.length >= widgetLimit) return;
      if (!isChartAvailable(type)) return;
      const xAxis = strCols[0] || keys[0];
      const yAxis = numCols[i % numCols.length] || numCols[0] || keys[1];
      if (xAxis && yAxis) {
        addWidget('chart', { chartType: type, title: generateWidgetTitle(type, xAxis, yAxis), xAxis, yAxis, aggregation: 'sum' });
        added.push(type);
      }
    });
    toast({ title: 'Charts Replaced', description: `Replaced with ${added.length} recommended charts.` });
  }, [currentData, currentPage, widgetLimit, isChartAvailable, addWidget, removeWidget]);

  const handleExportDashboard = useCallback(async (format: 'pdf' | 'pptx' | 'docx') => {
    if (!currentData.length) { toast({ title: 'No data', variant: 'destructive' }); return; }
    try {
      const report = buildReportData(currentData, currentDataset?.name || 'Dashboard', user?.name || 'User', dashboard?.name);
      switch (format) {
        case 'pdf': await exportPDF(report); break;
        case 'pptx': await exportPPTX(report); break;
        case 'docx': await exportDOCX(report); break;
      }
    } catch {
      toast({ title: 'Export Failed', variant: 'destructive' });
    }
  }, [currentData, currentDataset, user, dashboard]);

  const handleExportHTML = useCallback(() => {
    if (!dashboard || !currentData.length) return;
    const schema = JSON.stringify(dashboard);
    const data = JSON.stringify(currentData.slice(0, 500));
    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${dashboard.name}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"><\/script>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#09090b;color:#fafafa;padding:2rem}
h1{font-size:1.5rem;margin-bottom:1.5rem}.grid{display:grid;grid-template-columns:repeat(12,1fr);gap:1rem;margin-top:1rem}
.widget{background:#18181b;border:1px solid #27272a;border-radius:12px;padding:1rem;min-height:200px}
.kpi{text-align:center;padding:2rem}.kpi-val{font-size:2.5rem;font-weight:700}.kpi-label{color:#71717a;font-size:.8rem;margin-top:.5rem}
canvas{max-height:300px}table{width:100%;border-collapse:collapse;font-size:.8rem}th,td{padding:.5rem;text-align:left;border-bottom:1px solid #27272a}th{color:#71717a}
.page-tabs{display:flex;gap:.5rem;margin-bottom:1rem}.page-tab{padding:.5rem 1rem;border-radius:8px;background:#18181b;border:1px solid #27272a;cursor:pointer;color:#fafafa;font-size:.8rem}
.page-tab.active{background:#6366f1;border-color:#6366f1}
.filters{display:flex;gap:.5rem;margin-bottom:1rem;flex-wrap:wrap}
.filter-btn{padding:.25rem .75rem;border-radius:6px;background:#27272a;border:1px solid #3f3f46;color:#fafafa;cursor:pointer;font-size:.75rem}
.filter-btn.active{background:#6366f1;border-color:#6366f1}
.footer{margin-top:3rem;text-align:center;color:#3f3f46;font-size:.7rem}</style>
</head><body>
<h1>${dashboard.name}</h1>
<div id="app"></div>
<div class="footer">Generated by DataPulse Analytics &bull; ${new Date().toLocaleDateString()}</div>
<script>
const schema=${schema};const rawData=${data};
const colors=['#6366f1','#8b5cf6','#a78bfa','#c4b5fd','#22c55e','#f59e0b','#ef4444','#06b6d4','#ec4899','#84cc16'];
let activeFilter=null;let activePage=0;
function filterData(d){if(!activeFilter)return d;return d.filter(r=>String(r[activeFilter.key])===activeFilter.value)}
function aggregate(data,x,y,agg){if(!x||!y)return data;const g={};data.forEach(r=>{const k=String(r[x]||'');if(!g[k])g[k]=[];g[k].push(Number(r[y])||0)});return Object.entries(g).map(([k,vs])=>{let v;switch(agg){case'avg':v=vs.reduce((a,b)=>a+b,0)/vs.length;break;case'count':v=vs.length;break;case'min':v=Math.min(...vs);break;case'max':v=Math.max(...vs);break;default:v=vs.reduce((a,b)=>a+b,0)}return{[x]:k,[y]:Math.round(v*100)/100}})}
function render(){const page=schema.pages[activePage];const data=filterData(rawData);let html='<div class="page-tabs">';schema.pages.forEach((p,i)=>{html+='<div class="page-tab'+(i===activePage?' active':'')+'" onclick="activePage='+i+';render()">'+p.name+'</div>'});html+='</div>';if(activeFilter)html+='<div class="filters"><div class="filter-btn active" onclick="activeFilter=null;render()">Clear: '+activeFilter.key+'='+activeFilter.value+'</div></div>';html+='<div class="grid">';page.widgets.forEach((w,wi)=>{const span='grid-column:span '+w.layout.w;if(w.type==='kpi'){const col=w.config.kpiColumn||w.config.yAxis;const vals=col?data.map(r=>Number(r[col])||0):[];let v=0;if(vals.length){const s=vals.reduce((a,b)=>a+b,0);v=w.config.aggregation==='avg'?s/vals.length:w.config.aggregation==='count'?vals.length:s}html+='<div class="widget kpi" style="'+span+'"><div class="kpi-val">'+v.toLocaleString(undefined,{maximumFractionDigits:1})+'</div><div class="kpi-label">'+(w.config.title||col||'KPI')+'</div></div>'}else if(w.type==='chart'){const cd=aggregate(data,w.config.xAxis,w.config.yAxis,w.config.aggregation);html+='<div class="widget" style="'+span+'"><h3 style="font-size:.85rem;margin-bottom:.75rem;color:#71717a">'+(w.config.title||'Chart')+'</h3><canvas id="c'+wi+'"></canvas></div>';setTimeout(()=>{const el=document.getElementById('c'+wi);if(!el)return;const labels=cd.map(d=>String(d[w.config.xAxis]||''));const values=cd.map(d=>Number(d[w.config.yAxis])||0);const ct=w.config.chartType||'bar';const type=ct==='area'?'line':ct==='pie'||ct==='donut'?'doughnut':ct==='scatter'?'scatter':'bar';const ds=type==='doughnut'?{data:values,backgroundColor:colors}:{label:w.config.yAxis||'Value',data:type==='scatter'?cd.map(d=>({x:Number(d[w.config.xAxis])||0,y:Number(d[w.config.yAxis])||0})):values,backgroundColor:colors[0],borderColor:colors[0],fill:ct==='area',tension:.3};new Chart(el,{type,data:{labels,datasets:[ds]},options:{responsive:true,onClick:(e,els)=>{if(els.length&&w.config.xAxis){activeFilter={key:w.config.xAxis,value:labels[els[0].index]};render()}},plugins:{legend:{position:'bottom',labels:{font:{size:10}}}}}})},50)}else if(w.type==='table'){const cols=data.length?Object.keys(data[0]).slice(0,8):[];const rows=data.slice(0,w.config.tableRowLimit||50);html+='<div class="widget" style="'+span+';overflow:auto"><h3 style="font-size:.85rem;margin-bottom:.75rem;color:#71717a">'+(w.config.title||'Table')+'</h3><table><thead><tr>'+cols.map(c=>'<th>'+c+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+cols.map(c=>'<td>'+(r[c]??'')+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>'}else if(w.type==='text'){html+='<div class="widget" style="'+span+';display:flex;align-items:center;justify-content:center">'+(w.config.textContent||'')+'</div>'}});html+='</div>';document.getElementById('app').innerHTML=html}
render();
<\/script></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${dashboard.name.replace(/\s+/g, '-').toLowerCase()}.html`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast({ title: 'Dashboard Exported', description: 'Interactive HTML file downloaded.' });
  }, [dashboard, currentData]);

  const handleSave = useCallback(() => {
    saveDashboard();
    setLastSaved(new Date());
  }, [saveDashboard]);

  const getTimeSinceSave = () => {
    if (!lastSaved) return null;
    const diff = Math.floor((Date.now() - lastSaved.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  const startEditName = () => {
    setNameValue(dashboard?.name || '');
    setEditingName(true);
  };

  const saveName = () => {
    if (nameValue.trim()) renameDashboard(nameValue.trim());
    setEditingName(false);
  };

  const startEditPageName = (pageId: string, currentName: string) => {
    setEditingPageId(pageId);
    setPageNameValue(currentName);
  };

  const savePageName = () => {
    if (editingPageId && pageNameValue.trim()) {
      renamePage(editingPageId, pageNameValue.trim());
    }
    setEditingPageId(null);
  };

  // Template picker
  if (showTemplates && !dashboard) {
    return (
      <TemplateGallery
        plan={plan}
        widgetLimit={widgetLimit}
        onSelectTemplate={(t) => { createDashboard(t.name, t); setShowTemplates(false); }}
        onShowSaved={() => { setShowSaved(true); setShowTemplates(false); }}
      />
    );
  }

  // Saved dashboards
  if (showSaved && !dashboard) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Saved Dashboards</h1>
            <p className="text-muted-foreground">{savedDashboards.length} dashboard(s)</p>
          </div>
          <Button variant="outline" onClick={() => { setShowSaved(false); setShowTemplates(true); }}>
            <ChevronLeft className="h-4 w-4 mr-2" />Back
          </Button>
        </div>
        {savedDashboards.length === 0 ? (
          <Card className="bg-card border-border"><CardContent className="py-12 text-center text-muted-foreground">No saved dashboards yet.</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedDashboards.map(d => (
              <Card key={d.id} className="bg-card border-border hover:shadow-lg transition-all cursor-pointer"
                onClick={() => { loadDashboard(d); setShowSaved(false); }}>
                <CardHeader className="pb-2"><CardTitle className="text-sm">{d.name}</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{d.pages.length} page(s) · Updated {new Date(d.updatedAt).toLocaleDateString()}</p>
                  <Button variant="destructive" size="sm" className="mt-3 w-full" onClick={e => { e.stopPropagation(); deleteSavedDashboard(d.id); }}>
                    <Trash2 className="h-3 w-3 mr-1" />Delete
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Main builder
  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] gap-0">
      {/* ─── Top Toolbar ─────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-2 py-2 border-b border-border bg-card rounded-t-lg flex-wrap">
        {/* Left: Back + Name + Breadcrumb */}
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { closeDashboard(); setShowTemplates(true); }}>
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex flex-col min-w-0">
          {editingName ? (
            <div className="flex items-center gap-1">
              <Input
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveName()}
                onBlur={saveName}
                autoFocus
                className="h-7 w-48 text-sm font-semibold"
              />
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={saveName}>
                <Check className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <button onClick={startEditName} className="flex items-center gap-1.5 text-left group">
              <span className="text-sm font-semibold text-foreground truncate max-w-[200px]">{dashboard?.name || 'Untitled'}</span>
              <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
          <span className="text-[10px] text-muted-foreground">Dashboards / {dashboard?.name || 'Untitled'}</span>
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Middle: Add Widget dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5" disabled={!canAddWidget}>
              <Plus className="h-3.5 w-3.5" />Add Widget
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={() => handleAddWidget('chart', { chartType: 'bar' })}>
              <BarChart3 className="h-4 w-4 mr-2" />Chart
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddWidget('kpi', { title: 'KPI' })}>
              <Hash className="h-4 w-4 mr-2" />KPI Card
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddWidget('table', { title: 'Data Table' })}>
              <Table2 className="h-4 w-4 mr-2" />Table
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddWidget('text', { textContent: 'Text block', title: '' })}>
              <Type className="h-4 w-4 mr-2" />Text Block
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleCopyFromVisualization} disabled={!currentData.length}>
              <Copy className="h-4 w-4 mr-2" />Auto-generate from Data
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {!canAddWidget && (
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            <Lock className="h-3 w-3 mr-1" />{widgetLimit} limit
          </Badge>
        )}

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Undo/Redo/Zoom */}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={undo} disabled={!canUndo}><Undo2 className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={redo} disabled={!canRedo}><Redo2 className="h-4 w-4" /></Button>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(Math.max(50, zoom - 10))}><ZoomOut className="h-3.5 w-3.5" /></Button>
          <span className="text-[10px] text-muted-foreground w-8 text-center">{zoom}%</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(Math.min(150, zoom + 10))}><ZoomIn className="h-3.5 w-3.5" /></Button>
        </div>

        <div className="flex-1" />

        {/* Right: Save status + Export + Save */}
        {lastSaved && (
          <span className="text-[10px] text-muted-foreground hidden sm:inline">Saved {getTimeSinceSave()}</span>
        )}

        <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => setFilterPanelOpen(!filterPanelOpen)}>
          <FilterIcon className="h-3.5 w-3.5" />Filters
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" disabled={!currentData.length}>
              <Download className="h-3.5 w-3.5" />Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportHTML}><File className="h-4 w-4 mr-2" />HTML (Interactive)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExportDashboard('pdf')}><FileText className="h-4 w-4 mr-2" />PDF Report</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExportDashboard('pptx')}><Presentation className="h-4 w-4 mr-2" />PowerPoint</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExportDashboard('docx')}><FileText className="h-4 w-4 mr-2" />Word Document</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button size="sm" className="gap-1.5 text-xs" onClick={handleSave}>
          <Save className="h-3.5 w-3.5" />Save
        </Button>
      </div>

      {/* ─── Info Bar ────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-3 py-1.5 border-b border-border bg-muted/30 text-xs flex-wrap">
        {currentDataset && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-card border border-border">
            <Database className="h-3 w-3 text-muted-foreground" />
            <span className="text-foreground font-medium">{currentDataset.name}</span>
          </div>
        )}
        {!currentDataset && datasets.length > 0 && (
          <span className="text-muted-foreground">No dataset selected</span>
        )}
        <span className="text-muted-foreground">{currentWidgetCount} widget{currentWidgetCount !== 1 ? 's' : ''}</span>

        {crossFilter && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20">
            <FilterIcon className="h-3 w-3 text-primary" />
            <span className="text-foreground">{crossFilter.key}: {crossFilter.value}</span>
            <button onClick={() => setCrossFilter(null)} className="ml-1 text-muted-foreground hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* ─── Page Tabs ───────────────────────────────────────── */}
      <div className="flex items-center gap-0.5 px-3 py-1 border-b border-border bg-card overflow-x-auto">
        {dashboard?.pages.map(p => (
          <div key={p.id} className="flex items-center">
            {editingPageId === p.id ? (
              <div className="flex items-center gap-0.5">
                <Input
                  value={pageNameValue}
                  onChange={e => setPageNameValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && savePageName()}
                  onBlur={savePageName}
                  autoFocus
                  className="h-7 w-28 text-xs"
                />
              </div>
            ) : (
              <button
                onClick={() => setCurrentPage(p.id)}
                onDoubleClick={() => startEditPageName(p.id, p.name)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-colors relative",
                  p.id === currentPageId
                    ? "text-foreground bg-muted"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {p.name}
                {p.id === currentPageId && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            )}
            {dashboard.pages.length > 1 && p.id === currentPageId && (
              <button onClick={() => removePage(p.id)} className="ml-0.5 p-0.5 text-muted-foreground hover:text-destructive rounded">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-muted-foreground">
              <Plus className="h-3 w-3" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Page</DialogTitle></DialogHeader>
            <div className="flex gap-2">
              <Input value={newPageName} onChange={e => setNewPageName(e.target.value)} placeholder="Page name" onKeyDown={e => { if (e.key === 'Enter' && newPageName.trim()) { addPage(newPageName.trim()); setNewPageName(''); } }} />
              <Button onClick={() => { if (newPageName.trim()) { addPage(newPageName.trim()); setNewPageName(''); } }}>Add</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ─── Canvas Area ─────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden" ref={containerRef}>
        {/* Filter sidebar (pushes canvas) */}
        {filterPanelOpen && (
          <div className="w-64 shrink-0 border-r border-border bg-card overflow-y-auto">
            <div className="flex items-center justify-between p-3 border-b border-border">
              <span className="text-xs font-semibold text-foreground">Filters</span>
              <div className="flex items-center gap-2">
                {crossFilter && (
                  <button onClick={() => setCrossFilter(null)} className="text-[10px] text-primary hover:underline">Clear all</button>
                )}
                <button onClick={() => setFilterPanelOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="p-3">
              <PanelContent />
            </div>
          </div>
        )}

        {/* Main canvas */}
        <div className="flex-1 flex gap-0 overflow-hidden min-w-0">
          <DashboardCanvas
            width={containerWidth - (filterPanelOpen ? 256 : 0) - (selectedWidgetId ? 288 : 0)}
            onAddWidget={handleAddWidget}
          />

          {/* Widget settings (pushes canvas from right) */}
          {selectedWidgetId && (
            <div className="w-72 shrink-0 border-l border-border bg-card overflow-y-auto">
              <WidgetConfigPanel />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
