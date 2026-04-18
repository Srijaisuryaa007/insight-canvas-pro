import { useMemo, useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { useDashboard } from '@/contexts/DashboardContext';
import { generateAllFormulas, ForgeFormula, ForgeLang, ForgeComplexity } from '@/lib/autoFormulaForge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Search, Copy, Zap, X, ChevronDown, ChevronRight, Database, Loader2, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface FormulaForgePanelProps {
  onClose?: () => void;
}

const COMPLEXITY_COLORS: Record<ForgeComplexity, string> = {
  Basic: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  Intermediate: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  Advanced: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  Expert: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
};

export function FormulaForgePanel({ onClose }: FormulaForgePanelProps) {
  const { currentDataset, currentData } = useData();
  const { addWidget } = useDashboard();
  const [activeLang, setActiveLang] = useState<ForgeLang>('dax');
  const [search, setSearch] = useState('');
  const [complexity, setComplexity] = useState<ForgeComplexity | 'All'>('All');
  const [columnFilter, setColumnFilter] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [forgeData, setForgeData] = useState<ReturnType<typeof generateAllFormulas> | null>(null);

  // Auto-regenerate when dataset changes
  useEffect(() => {
    if (!currentData.length) { setForgeData(null); return; }
    setGenerating(true);
    const t = setTimeout(() => {
      try {
        const result = generateAllFormulas(currentData, currentDataset?.name || 'data');
        setForgeData(result);
      } catch (e) {
        console.error('[Forge] generation failed', e);
      } finally {
        setGenerating(false);
      }
    }, 50);
    return () => clearTimeout(t);
  }, [currentData, currentDataset]);

  const allFormulas = useMemo(() => {
    if (!forgeData) return [] as ForgeFormula[];
    return forgeData[activeLang];
  }, [forgeData, activeLang]);

  const filtered = useMemo(() => {
    let list = allFormulas;
    const q = search.toLowerCase().trim();
    if (q) list = list.filter(f =>
      f.name.toLowerCase().includes(q) ||
      f.group.toLowerCase().includes(q) ||
      f.formula.toLowerCase().includes(q) ||
      f.columns.some(c => c.toLowerCase().includes(q))
    );
    if (complexity !== 'All') list = list.filter(f => f.complexity === complexity);
    if (columnFilter) list = list.filter(f => f.columns.includes(columnFilter));
    return list;
  }, [allFormulas, search, complexity, columnFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, ForgeFormula[]>();
    filtered.forEach(f => {
      if (!map.has(f.group)) map.set(f.group, []);
      map.get(f.group)!.push(f);
    });
    return [...map.entries()];
  }, [filtered]);

  const counts = useMemo(() => ({
    dax: forgeData?.dax.length || 0,
    sql: forgeData?.sql.length || 0,
    excel: forgeData?.excel.length || 0,
  }), [forgeData]);

  const handleCopy = (f: ForgeFormula) => {
    navigator.clipboard.writeText(f.formula);
    toast({ title: 'Copied', description: `${f.name} copied to clipboard.` });
  };

  const handleApply = (f: ForgeFormula) => {
    if (typeof f.resultRaw === 'number') {
      addWidget('kpi', {
        title: f.name,
        kpiColumn: f.columns[0],
        aggregation: 'sum',
        kpiValue: f.resultRaw,
        kpiUnit: f.lang === 'excel' ? '' : '',
      });
      toast({ title: 'KPI added to dashboard', description: f.name });
    } else if (f.columns.length >= 2) {
      addWidget('chart', {
        chartType: 'bar',
        title: f.name,
        xAxis: f.columns[0],
        yAxis: f.columns[1],
        aggregation: 'sum',
      });
      toast({ title: 'Chart added to dashboard', description: f.name });
    } else {
      addWidget('text', { textContent: `${f.name}\n\n${f.formula}`, title: f.name });
      toast({ title: 'Formula card added', description: f.name });
    }
  };

  if (!currentData.length) {
    return (
      <div className="flex flex-col h-full bg-card border-l border-border">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Formula Forge</span>
          </div>
          {onClose && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="h-4 w-4" /></Button>}
        </div>
        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <div className="space-y-2">
            <Database className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">Connect a dataset to auto-generate formulas.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-7 w-7 rounded-md bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground truncate">Formula Forge</div>
            <div className="text-[10px] text-muted-foreground truncate">AI-generated from your data</div>
          </div>
        </div>
        {onClose && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="h-4 w-4" /></Button>}
      </div>

      {/* Dataset Summary */}
      {forgeData && (
        <div className="px-3 py-2 border-b border-border bg-muted/30 shrink-0">
          <div className="text-[11px] font-medium text-foreground truncate">{currentDataset?.name}</div>
          <div className="text-[10px] text-muted-foreground">
            {forgeData.meta.rows} rows · {forgeData.meta.cols.length} cols · {forgeData.meta.numCols.length} numeric · {forgeData.meta.textCols.length} text
            {forgeData.meta.dateCols.length > 0 && ` · ${forgeData.meta.dateCols.length} date`}
          </div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {forgeData.meta.cols.slice(0, 8).map(c => {
              const isNum = forgeData.meta.numCols.includes(c);
              const isDate = forgeData.meta.dateCols.includes(c);
              const active = columnFilter === c;
              return (
                <button
                  key={c}
                  onClick={() => setColumnFilter(active ? null : c)}
                  className={cn(
                    "text-[9px] px-1.5 py-0.5 rounded border transition-colors",
                    active ? "bg-primary/20 border-primary text-primary" :
                    isNum ? "bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20" :
                    isDate ? "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20" :
                    "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                  )}
                >
                  {isNum ? '#' : isDate ? '📅' : 'T'} {c}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeLang} onValueChange={v => { setActiveLang(v as ForgeLang); setExpandedId(null); }} className="shrink-0">
        <TabsList className="grid grid-cols-3 mx-3 mt-2 h-8">
          <TabsTrigger value="dax" className="text-xs gap-1.5">DAX <Badge variant="secondary" className="h-4 px-1 text-[9px]">{counts.dax}</Badge></TabsTrigger>
          <TabsTrigger value="sql" className="text-xs gap-1.5">SQL <Badge variant="secondary" className="h-4 px-1 text-[9px]">{counts.sql}</Badge></TabsTrigger>
          <TabsTrigger value="excel" className="text-xs gap-1.5">Excel <Badge variant="secondary" className="h-4 px-1 text-[9px]">{counts.excel}</Badge></TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search + Filters */}
      <div className="px-3 py-2 space-y-2 border-b border-border shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search formulas..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-7 pl-7 text-xs"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {(['All', 'Basic', 'Intermediate', 'Advanced', 'Expert'] as const).map(c => (
            <button
              key={c}
              onClick={() => setComplexity(c)}
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-full border transition-colors",
                complexity === c
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground hover:bg-muted"
              )}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{filtered.length} formulas shown</span>
          {columnFilter && (
            <button onClick={() => setColumnFilter(null)} className="text-primary hover:underline">
              Clear column filter
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {generating ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Analyzing your dataset...</span>
          </div>
        ) : grouped.length === 0 ? (
          <div className="text-center py-12 text-xs text-muted-foreground">No formulas match your filters.</div>
        ) : (
          <div className="px-2 pb-4 space-y-2">
            {grouped.map(([group, items]) => {
              const isCollapsed = collapsed[group];
              const groupColor = items[0]?.color || '#3B82F6';
              return (
                <div key={group}>
                  <button
                    onClick={() => setCollapsed(p => ({ ...p, [group]: !p[group] }))}
                    className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors group text-left"
                    style={{ borderLeft: `3px solid ${groupColor}` }}
                  >
                    {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    <span className="text-[11px] font-semibold text-foreground">{group}</span>
                    <Badge variant="secondary" className="ml-auto h-4 px-1 text-[9px]">{items.length}</Badge>
                  </button>
                  {!isCollapsed && (
                    <div className="space-y-1 mt-1">
                      {items.map(f => {
                        const expanded = expandedId === f.id;
                        return (
                          <div
                            key={f.id}
                            className={cn(
                              "rounded-lg border bg-card/50 transition-all",
                              expanded ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/20 hover:bg-muted/30"
                            )}
                          >
                            <button
                              onClick={() => setExpandedId(expanded ? null : f.id)}
                              className="w-full flex items-start gap-2 p-2 text-left"
                            >
                              <div
                                className="h-8 w-8 rounded-md flex items-center justify-center text-xs shrink-0 font-semibold"
                                style={{ background: `${f.color}20`, color: f.color, border: `1px solid ${f.color}40` }}
                              >
                                {f.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[11px] font-semibold text-foreground truncate">{f.name}</span>
                                  <Badge variant="outline" className={cn("h-4 px-1 text-[9px] border", COMPLEXITY_COLORS[f.complexity])}>
                                    {f.complexity}
                                  </Badge>
                                  {f.badge && <Badge variant="outline" className="h-4 px-1 text-[9px]">{f.badge}</Badge>}
                                </div>
                                <div className="text-[10px] text-emerald-400 font-mono truncate mt-0.5">→ {f.result}</div>
                              </div>
                            </button>
                            {expanded && (
                              <div className="px-2 pb-2 space-y-2 border-t border-border/50 pt-2">
                                {f.description && <div className="text-[10px] text-muted-foreground">{f.description}</div>}
                                <pre className="text-[10px] font-mono bg-background/60 border border-border rounded-md p-2 overflow-x-auto whitespace-pre text-foreground/90">
{f.formula}
                                </pre>
                                <div className="flex flex-wrap gap-1">
                                  {f.columns.map(c => (
                                    <span key={c} className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">{c}</span>
                                  ))}
                                </div>
                                <div className="flex gap-1.5">
                                  <Button size="sm" variant="outline" className="h-7 text-[10px] flex-1" onClick={(e) => { e.stopPropagation(); handleCopy(f); }}>
                                    <Copy className="h-3 w-3 mr-1" />Copy
                                  </Button>
                                  <Button size="sm" className="h-7 text-[10px] flex-1 gap-1 bg-gradient-to-r from-primary to-purple-500" onClick={(e) => { e.stopPropagation(); handleApply(f); }}>
                                    <Zap className="h-3 w-3" />Apply
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
