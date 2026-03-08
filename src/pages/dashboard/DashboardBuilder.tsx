import { useState, useRef, useEffect, useCallback } from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import { useData } from '@/contexts/DataContext';
import { useSubscription } from '@/hooks/useSubscription';
import { DashboardCanvas } from '@/components/dashboard/DashboardCanvas';
import { WidgetConfigPanel } from '@/components/dashboard/WidgetConfigPanel';
import { WorkspacePanel, PanelPosition } from '@/components/dashboard/WorkspacePanel';
import { PanelContent } from '@/components/dashboard/PanelContent';
import TemplateGallery from '@/components/dashboard/TemplateGallery';
import { DASHBOARD_TEMPLATES } from '@/lib/dashboardTemplates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard, Plus, Undo2, Redo2, Save, ZoomIn, ZoomOut,
  BarChart3, Hash, Table2, Type, Filter as FilterIcon, Trash2,
  ChevronLeft, Download, FolderOpen, Lock, Image, Copy, FileText, Presentation, File,
  PanelLeft, PanelRight, PanelTop, PanelBottom
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { buildReportData, exportPDF, exportPPTX, exportDOCX } from '@/lib/exportEngine';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

const WIDGET_LIMITS: Record<string, number> = {
  free: 6,
  basic: 15,
  pro: 40,
  enterprise: Infinity,
};

// Panel layout persistence
const PANEL_STORAGE_KEY = 'datapulse_panel_layout';

interface PanelState {
  activePanels: PanelPosition[];
  sizes: Record<PanelPosition, number>;
  collapsed: Record<PanelPosition, boolean>;
}

function loadPanelState(): PanelState {
  try {
    const saved = localStorage.getItem(PANEL_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { activePanels: ['left'], sizes: { left: 240, right: 240, top: 200, bottom: 200 }, collapsed: { left: false, right: false, top: false, bottom: false } };
}

function savePanelState(state: PanelState) {
  localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify(state));
}

export default function DashboardBuilder() {
  const {
    dashboard, currentPage, currentPageId,
    createDashboard, loadDashboard, renameDashboard, closeDashboard,
    addPage, removePage, renamePage, setCurrentPage,
    addWidget, selectedWidgetId,
    undo, redo, canUndo, canRedo,
    saveDashboard, savedDashboards, deleteSavedDashboard,
    zoom, setZoom, crossFilter, setCrossFilter,
  } = useDashboard();
  const { currentDataset, currentData } = useData();
  const { user } = useAuth();
  const { plan, isChartAvailable } = useSubscription();
  const [showTemplates, setShowTemplates] = useState(!dashboard);
  const [showSaved, setShowSaved] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(900);

  // Panel state
  const [panelState, setPanelState] = useState<PanelState>(loadPanelState);

  useEffect(() => { savePanelState(panelState); }, [panelState]);

  const togglePanel = useCallback((pos: PanelPosition) => {
    setPanelState(prev => {
      const isActive = prev.activePanels.includes(pos);
      return {
        ...prev,
        activePanels: isActive ? prev.activePanels.filter(p => p !== pos) : [...prev.activePanels, pos],
        collapsed: { ...prev.collapsed, [pos]: false },
      };
    });
  }, []);

  const toggleCollapse = useCallback((pos: PanelPosition) => {
    setPanelState(prev => ({ ...prev, collapsed: { ...prev.collapsed, [pos]: !prev.collapsed[pos] } }));
  }, []);

  const resizePanel = useCallback((pos: PanelPosition, size: number) => {
    setPanelState(prev => ({ ...prev, sizes: { ...prev.sizes, [pos]: size } }));
  }, []);

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
      toast({ title: 'Widget Limit Reached', description: `${plan} plan allows ${widgetLimit} widgets per page. Upgrade for more.`, variant: 'destructive' });
      return;
    }
    // Check chart availability for chart widgets
    if (type === 'chart' && config?.chartType && !isChartAvailable(config.chartType)) {
      toast({ title: 'Chart Locked', description: `${config.chartType} is not available on your ${plan} plan.`, variant: 'destructive' });
      return;
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

    const chartTypes = ['bar', 'line', 'pie', 'area', 'scatter'];
    const added: string[] = [];
    chartTypes.forEach((type, i) => {
      if (!canAddWidget || !isChartAvailable(type)) return;
      const xAxis = strCols[0] || keys[0];
      const yAxis = numCols[i % numCols.length] || numCols[0] || keys[1];
      if (xAxis && yAxis) {
        addWidget('chart', { chartType: type, title: `${type.charAt(0).toUpperCase() + type.slice(1)}: ${yAxis}`, xAxis, yAxis, aggregation: 'sum' });
        added.push(type);
      }
    });
    toast({ title: 'Charts Imported', description: `Added ${added.length} recommended charts from your dataset.` });
  }, [currentData, canAddWidget, isChartAvailable, addWidget]);

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

  // Template picker
  if (showTemplates && !dashboard) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><LayoutDashboard className="h-7 w-7" />Dashboard Builder</h1>
            <p className="text-muted-foreground">Choose a template or start from scratch</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="capitalize">{plan} Plan • {widgetLimit === Infinity ? '∞' : widgetLimit} widgets/page</Badge>
            <Button variant="outline" onClick={() => { setShowSaved(true); setShowTemplates(false); }}>
              <FolderOpen className="h-4 w-4 mr-2" />Saved
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {DASHBOARD_TEMPLATES.map(t => (
            <Card key={t.id} className="bg-card border-border hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => { createDashboard(t.name, t); setShowTemplates(false); }}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{t.thumbnail}</span>
                  <div>
                    <CardTitle className="text-sm group-hover:text-primary transition-colors">{t.name}</CardTitle>
                    <Badge variant="outline" className="text-xs mt-1">{t.category}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{t.description}</p>
                <p className="text-xs text-muted-foreground mt-2">{t.pages[0]?.widgets.length || 0} widgets • {t.pages.length} page(s)</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Saved dashboards
  if (showSaved && !dashboard) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Saved Dashboards</h1>
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
                  <p className="text-xs text-muted-foreground">{d.pages.length} page(s) • Updated {new Date(d.updatedAt).toLocaleDateString()}</p>
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
    <div className="flex flex-col h-[calc(100vh-7rem)] gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => { closeDashboard(); setShowTemplates(true); }}>
          <ChevronLeft className="h-4 w-4 mr-1" />Templates
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <Input value={dashboard?.name || ''} onChange={e => renameDashboard(e.target.value)} className="h-8 w-48 text-sm font-medium" />
        <Separator orientation="vertical" className="h-6" />

        {/* Add widgets */}
        <Button variant="outline" size="sm" onClick={() => handleAddWidget('chart', { chartType: 'bar', title: 'Chart' })} disabled={!canAddWidget}>
          <BarChart3 className="h-4 w-4 mr-1" />Chart
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleAddWidget('kpi', { title: 'KPI' })} disabled={!canAddWidget}>
          <Hash className="h-4 w-4 mr-1" />KPI
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleAddWidget('table', { title: 'Table' })} disabled={!canAddWidget}>
          <Table2 className="h-4 w-4 mr-1" />Table
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleAddWidget('text', { textContent: 'Text', title: '' })} disabled={!canAddWidget}>
          <Type className="h-4 w-4 mr-1" />Text
        </Button>
        <Button variant="outline" size="sm" onClick={handleCopyFromVisualization} disabled={!canAddWidget || !currentData.length}>
          <Copy className="h-4 w-4 mr-1" />Copy from Viz
        </Button>

        {!canAddWidget && (
          <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/30">
            <Lock className="h-3 w-3 mr-1" />{widgetLimit} widget limit
          </Badge>
        )}

        <Separator orientation="vertical" className="h-6" />

        {/* Panel layout toggles */}
        <Button variant={panelState.activePanels.includes('left') ? 'default' : 'outline'} size="icon" className="h-8 w-8" onClick={() => togglePanel('left')} title="Left Panel">
          <PanelLeft className="h-4 w-4" />
        </Button>
        <Button variant={panelState.activePanels.includes('right') ? 'default' : 'outline'} size="icon" className="h-8 w-8" onClick={() => togglePanel('right')} title="Right Panel">
          <PanelRight className="h-4 w-4" />
        </Button>
        <Button variant={panelState.activePanels.includes('top') ? 'default' : 'outline'} size="icon" className="h-8 w-8" onClick={() => togglePanel('top')} title="Top Panel">
          <PanelTop className="h-4 w-4" />
        </Button>
        <Button variant={panelState.activePanels.includes('bottom') ? 'default' : 'outline'} size="icon" className="h-8 w-8" onClick={() => togglePanel('bottom')} title="Bottom Panel">
          <PanelBottom className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={undo} disabled={!canUndo}><Undo2 className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={redo} disabled={!canRedo}><Redo2 className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(Math.max(50, zoom - 10))}><ZoomOut className="h-4 w-4" /></Button>
        <span className="text-xs text-muted-foreground w-10 text-center">{zoom}%</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(Math.min(150, zoom + 10))}><ZoomIn className="h-4 w-4" /></Button>

        <div className="flex-1" />

        {crossFilter && (
          <Badge variant="secondary" className="gap-1">
            <FilterIcon className="h-3 w-3" />{crossFilter.key}: {crossFilter.value}
            <button onClick={() => setCrossFilter(null)} className="ml-1 hover:text-destructive">×</button>
          </Badge>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={!currentData.length}>
              <Download className="h-4 w-4 mr-1" />Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-popover">
            <DropdownMenuItem onClick={handleExportHTML}><File className="h-4 w-4 mr-2" />HTML (Interactive)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExportDashboard('pdf')}><FileText className="h-4 w-4 mr-2" />PDF Report</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExportDashboard('pptx')}><Presentation className="h-4 w-4 mr-2" />PowerPoint</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExportDashboard('docx')}><FileText className="h-4 w-4 mr-2" />Word Document</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button size="sm" onClick={saveDashboard}>
          <Save className="h-4 w-4 mr-1" />Save
        </Button>
      </div>

      {/* Page tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {dashboard?.pages.map(p => (
          <div key={p.id} className="flex items-center gap-1">
            <Button variant={p.id === currentPageId ? 'default' : 'outline'} size="sm" className="text-xs h-7" onClick={() => setCurrentPage(p.id)}>
              {p.name}
            </Button>
            {dashboard.pages.length > 1 && (
              <button onClick={() => removePage(p.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-xs h-7"><Plus className="h-3 w-3 mr-1" />Page</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Page</DialogTitle></DialogHeader>
            <div className="flex gap-2">
              <Input value={newPageName} onChange={e => setNewPageName(e.target.value)} placeholder="Page name" />
              <Button onClick={() => { if (newPageName.trim()) { addPage(newPageName.trim()); setNewPageName(''); } }}>Add</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Workspace with panels */}
      <div className="flex flex-col flex-1 overflow-hidden gap-1">
        {/* Top panel */}
        {panelState.activePanels.includes('top') && (
          <WorkspacePanel
            position="top"
            collapsed={panelState.collapsed.top}
            onToggle={() => toggleCollapse('top')}
            size={panelState.sizes.top}
            onResize={(s) => resizePanel('top', s)}
          >
            <PanelContent />
          </WorkspacePanel>
        )}

        {/* Middle row: left + canvas + right */}
        <div className="flex gap-1 flex-1 overflow-hidden" ref={containerRef}>
          {panelState.activePanels.includes('left') && (
            <WorkspacePanel
              position="left"
              collapsed={panelState.collapsed.left}
              onToggle={() => toggleCollapse('left')}
              size={panelState.sizes.left}
              onResize={(s) => resizePanel('left', s)}
            >
              <PanelContent />
            </WorkspacePanel>
          )}

          <div className="flex-1 flex gap-3 overflow-hidden min-w-0">
            <DashboardCanvas width={selectedWidgetId ? containerWidth - 300 : containerWidth} />
            {selectedWidgetId && <WidgetConfigPanel />}
          </div>

          {panelState.activePanels.includes('right') && (
            <WorkspacePanel
              position="right"
              collapsed={panelState.collapsed.right}
              onToggle={() => toggleCollapse('right')}
              size={panelState.sizes.right}
              onResize={(s) => resizePanel('right', s)}
            >
              <PanelContent />
            </WorkspacePanel>
          )}
        </div>

        {/* Bottom panel */}
        {panelState.activePanels.includes('bottom') && (
          <WorkspacePanel
            position="bottom"
            collapsed={panelState.collapsed.bottom}
            onToggle={() => toggleCollapse('bottom')}
            size={panelState.sizes.bottom}
            onResize={(s) => resizePanel('bottom', s)}
          >
            <PanelContent />
          </WorkspacePanel>
        )}
      </div>
    </div>
  );
}
