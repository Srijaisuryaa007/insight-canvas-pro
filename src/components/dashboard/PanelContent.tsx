import { useData } from '@/contexts/DataContext';
import { useDashboard } from '@/contexts/DashboardContext';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Filter, Database, Layers, SlidersHorizontal, Bookmark, LayoutGrid } from 'lucide-react';
import { useState } from 'react';

type PanelTab = 'filters' | 'fields' | 'navigation' | 'views';

export function PanelContent() {
  const { currentData, currentDataset, datasets, selectDataset } = useData();
  const { dashboard, crossFilter, setCrossFilter, savedDashboards, loadDashboard } = useDashboard();
  const [activeTab, setActiveTab] = useState<PanelTab>('filters');

  const columns = currentData.length > 0 ? Object.keys(currentData[0]) : [];
  const stringCols = columns.filter(c => currentData.length > 0 && typeof currentData[0][c] === 'string');
  const numericCols = columns.filter(c => currentData.length > 0 && typeof currentData[0][c] === 'number');

  const tabs: { id: PanelTab; label: string; icon: typeof Filter }[] = [
    { id: 'filters', label: 'Filters', icon: Filter },
    { id: 'fields', label: 'Fields', icon: Database },
    { id: 'navigation', label: 'Nav', icon: LayoutGrid },
    { id: 'views', label: 'Views', icon: Bookmark },
  ];

  return (
    <div className="h-full flex flex-col gap-2">
      {/* Tab switcher */}
      <div className="flex gap-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === t.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            <t.icon className="h-3 w-3" />
            {t.label}
          </button>
        ))}
      </div>

      <Separator />

      <ScrollArea className="flex-1">
        {activeTab === 'filters' && (
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Slicers</Label>
            {crossFilter && (
              <div className="flex items-center gap-2 p-2 rounded-md bg-primary/10 border border-primary/20">
                <SlidersHorizontal className="h-3 w-3 text-primary" />
                <span className="text-xs flex-1">{crossFilter.key} = {crossFilter.value}</span>
                <button onClick={() => setCrossFilter(null)} className="text-xs text-destructive hover:underline">Clear</button>
              </div>
            )}
            {stringCols.length > 0 ? (
              stringCols.slice(0, 8).map(col => {
                const uniqueVals = [...new Set(currentData.map(r => String(r[col] ?? '')))].slice(0, 20);
                return (
                  <div key={col} className="space-y-1">
                    <Label className="text-xs">{col}</Label>
                    <Select
                      value={crossFilter?.key === col ? crossFilter.value : ''}
                      onValueChange={v => v ? setCrossFilter({ key: col, value: v }) : setCrossFilter(null)}
                    >
                      <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                      <SelectContent>
                        {uniqueVals.map(v => (
                          <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">Load a dataset to see filters</p>
            )}
          </div>
        )}

        {activeTab === 'fields' && (
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dataset Fields</Label>
            {currentDataset && (
              <div className="p-2 rounded-md bg-muted/50 mb-2">
                <p className="text-xs font-medium">{currentDataset.name}</p>
                <p className="text-[10px] text-muted-foreground">{currentDataset.rowCount} rows</p>
              </div>
            )}
            {numericCols.length > 0 && (
              <>
                <Label className="text-[10px] text-muted-foreground uppercase">Numeric</Label>
                {numericCols.map(c => (
                  <div key={c} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 text-xs">
                    <Badge variant="outline" className="text-[9px] px-1">123</Badge>
                    {c}
                  </div>
                ))}
              </>
            )}
            {stringCols.length > 0 && (
              <>
                <Label className="text-[10px] text-muted-foreground uppercase mt-2">Categorical</Label>
                {stringCols.map(c => (
                  <div key={c} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 text-xs">
                    <Badge variant="outline" className="text-[9px] px-1">Abc</Badge>
                    {c}
                  </div>
                ))}
              </>
            )}
            {columns.length === 0 && (
              <p className="text-xs text-muted-foreground py-4 text-center">No dataset loaded</p>
            )}
          </div>
        )}

        {activeTab === 'navigation' && (
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pages</Label>
            {dashboard?.pages.map((p, i) => (
              <div key={p.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 text-xs">
                <Layers className="h-3 w-3 text-muted-foreground" />
                <span className="flex-1">{p.name}</span>
                <Badge variant="outline" className="text-[9px]">{p.widgets.length}</Badge>
              </div>
            ))}

            <Separator />
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Datasets</Label>
            {datasets.map(ds => (
              <button
                key={ds.id}
                onClick={() => selectDataset(ds.id)}
                className={`w-full flex items-center gap-2 p-2 rounded-md text-xs text-left transition-colors ${
                  ds.id === currentDataset?.id ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/50'
                }`}
              >
                <Database className="h-3 w-3 text-muted-foreground" />
                <span className="flex-1 truncate">{ds.name}</span>
                <Badge variant="outline" className="text-[9px]">{ds.rowCount}</Badge>
              </button>
            ))}
          </div>
        )}

        {activeTab === 'views' && (
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Saved Dashboards</Label>
            {savedDashboards.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No saved views</p>
            ) : (
              savedDashboards.map(d => (
                <button
                  key={d.id}
                  onClick={() => loadDashboard(d)}
                  className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 text-xs text-left"
                >
                  <Bookmark className="h-3 w-3 text-muted-foreground" />
                  <span className="flex-1 truncate">{d.name}</span>
                  <span className="text-[10px] text-muted-foreground">{d.pages.length}p</span>
                </button>
              ))
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
