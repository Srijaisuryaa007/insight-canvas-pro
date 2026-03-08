import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import { DashboardSchema, DashboardPage, DashboardWidget, DashboardHistoryEntry, DEFAULT_THEME, createWidget } from '@/types/dashboard';
import { DashboardTemplate } from '@/types/dashboard';
import { toast } from '@/hooks/use-toast';
import { useAuth } from './AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

interface DashboardContextType {
  dashboard: DashboardSchema | null;
  currentPageId: string | null;
  currentPage: DashboardPage | null;
  selectedWidgetId: string | null;
  createDashboard: (name: string, template?: DashboardTemplate) => void;
  loadDashboard: (schema: DashboardSchema) => void;
  renameDashboard: (name: string) => void;
  closeDashboard: () => void;
  addPage: (name: string) => void;
  removePage: (id: string) => void;
  renamePage: (id: string, name: string) => void;
  setCurrentPage: (id: string) => void;
  addWidget: (type: DashboardWidget['type'], config?: Partial<DashboardWidget['config']>) => void;
  removeWidget: (id: string) => void;
  updateWidget: (id: string, updates: Partial<DashboardWidget>) => void;
  updateWidgetConfig: (id: string, config: Partial<DashboardWidget['config']>) => void;
  updateLayouts: (layouts: Array<{ i: string; x: number; y: number; w: number; h: number }>) => void;
  selectWidget: (id: string | null) => void;
  crossFilter: { key: string; value: string } | null;
  setCrossFilter: (filter: { key: string; value: string } | null) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  savedDashboards: DashboardSchema[];
  saveDashboard: () => void;
  deleteSavedDashboard: (id: string) => void;
  zoom: number;
  setZoom: (z: number) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);
const MAX_HISTORY = 30; // v2

export function DashboardProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardSchema | null>(null);
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [crossFilter, setCrossFilter] = useState<{ key: string; value: string } | null>(null);
  const [savedDashboards, setSavedDashboards] = useState<DashboardSchema[]>([]);
  const [zoom, setZoom] = useState(100);

  // Load saved dashboards from Supabase
  useEffect(() => {
    if (!user || !isSupabaseConfigured || !supabase) return;
    supabase.from('dashboards').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) {
          setSavedDashboards(data.map(d => {
            const config = (d.layout_config || {}) as any;
            return {
              id: d.id, name: d.dashboard_name,
              createdAt: d.created_at, updatedAt: d.created_at,
              pages: config.pages || [{ id: crypto.randomUUID(), name: 'Page 1', widgets: [] }],
              theme: config.theme || DEFAULT_THEME,
              globalFilters: config.globalFilters || {},
            };
          }));
        }
      });
  }, [user]);

  // History
  const historyRef = useRef<DashboardHistoryEntry[]>([]);
  const historyIdxRef = useRef(-1);
  const skipHistoryRef = useRef(false);

  const pushHistory = useCallback((pages: DashboardPage[]) => {
    if (skipHistoryRef.current) { skipHistoryRef.current = false; return; }
    const h = historyRef.current;
    historyRef.current = h.slice(0, historyIdxRef.current + 1);
    historyRef.current.push({ pages: JSON.parse(JSON.stringify(pages)), timestamp: Date.now() });
    if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
    historyIdxRef.current = historyRef.current.length - 1;
  }, []);

  const canUndo = historyIdxRef.current > 0;
  const canRedo = historyIdxRef.current < historyRef.current.length - 1;

  const undo = useCallback(() => {
    if (historyIdxRef.current <= 0 || !dashboard) return;
    historyIdxRef.current--;
    const entry = historyRef.current[historyIdxRef.current];
    skipHistoryRef.current = true;
    setDashboard(d => d ? { ...d, pages: entry.pages } : null);
    toast({ title: 'Undo', description: 'Reverted last change.' });
  }, [dashboard]);

  const redo = useCallback(() => {
    if (historyIdxRef.current >= historyRef.current.length - 1 || !dashboard) return;
    historyIdxRef.current++;
    const entry = historyRef.current[historyIdxRef.current];
    skipHistoryRef.current = true;
    setDashboard(d => d ? { ...d, pages: entry.pages } : null);
    toast({ title: 'Redo', description: 'Reapplied change.' });
  }, [dashboard]);

  const mutatePages = useCallback((fn: (pages: DashboardPage[]) => DashboardPage[]) => {
    setDashboard(d => {
      if (!d) return d;
      const newPages = fn(d.pages);
      pushHistory(newPages);
      return { ...d, pages: newPages, updatedAt: new Date().toISOString() };
    });
  }, [pushHistory]);

  const currentPage = dashboard?.pages.find(p => p.id === currentPageId) || dashboard?.pages[0] || null;

  const createDashboard = useCallback((name: string, template?: DashboardTemplate) => {
    const pages = template ? JSON.parse(JSON.stringify(template.pages)) : [{ id: crypto.randomUUID(), name: 'Page 1', widgets: [] }];
    const schema: DashboardSchema = {
      id: crypto.randomUUID(), name, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      pages, theme: template?.theme || DEFAULT_THEME, globalFilters: {},
    };
    setDashboard(schema);
    setCurrentPageId(pages[0].id);
    setSelectedWidgetId(null);
    historyRef.current = [{ pages: JSON.parse(JSON.stringify(pages)), timestamp: Date.now() }];
    historyIdxRef.current = 0;
  }, []);

  const loadDashboard = useCallback((schema: DashboardSchema) => {
    setDashboard(schema);
    setCurrentPageId(schema.pages[0]?.id || null);
    setSelectedWidgetId(null);
    historyRef.current = [{ pages: JSON.parse(JSON.stringify(schema.pages)), timestamp: Date.now() }];
    historyIdxRef.current = 0;
  }, []);

  const renameDashboard = useCallback((name: string) => {
    setDashboard(d => d ? { ...d, name } : null);
  }, []);

  const closeDashboard = useCallback(() => {
    setDashboard(null); setCurrentPageId(null); setSelectedWidgetId(null);
    setCrossFilter(null); historyRef.current = []; historyIdxRef.current = -1;
  }, []);

  const addPage = useCallback((name: string) => {
    const page: DashboardPage = { id: crypto.randomUUID(), name, widgets: [] };
    mutatePages(pages => [...pages, page]);
    setCurrentPageId(page.id);
  }, [mutatePages]);

  const removePage = useCallback((id: string) => {
    mutatePages(pages => {
      const remaining = pages.filter(p => p.id !== id);
      if (remaining.length === 0) return pages;
      if (currentPageId === id) setCurrentPageId(remaining[0].id);
      return remaining;
    });
  }, [mutatePages, currentPageId]);

  const renamePage = useCallback((id: string, name: string) => {
    mutatePages(pages => pages.map(p => p.id === id ? { ...p, name } : p));
  }, [mutatePages]);

  const addWidget = useCallback((type: DashboardWidget['type'], config?: Partial<DashboardWidget['config']>) => {
    if (!currentPageId) return;
    const widget = createWidget(type, 0, 0, config);
    mutatePages(pages => pages.map(p => p.id === currentPageId ? { ...p, widgets: [...p.widgets, widget] } : p));
    setSelectedWidgetId(widget.id);
  }, [currentPageId, mutatePages]);

  const removeWidget = useCallback((id: string) => {
    if (!currentPageId) return;
    mutatePages(pages => pages.map(p => p.id === currentPageId ? { ...p, widgets: p.widgets.filter(w => w.id !== id) } : p));
    if (selectedWidgetId === id) setSelectedWidgetId(null);
  }, [currentPageId, mutatePages, selectedWidgetId]);

  const updateWidget = useCallback((id: string, updates: Partial<DashboardWidget>) => {
    if (!currentPageId) return;
    mutatePages(pages => pages.map(p => p.id === currentPageId
      ? { ...p, widgets: p.widgets.map(w => w.id === id ? { ...w, ...updates } : w) } : p));
  }, [currentPageId, mutatePages]);

  const updateWidgetConfig = useCallback((id: string, config: Partial<DashboardWidget['config']>) => {
    if (!currentPageId) return;
    mutatePages(pages => pages.map(p => p.id === currentPageId
      ? { ...p, widgets: p.widgets.map(w => w.id === id ? { ...w, config: { ...w.config, ...config } } : w) } : p));
  }, [currentPageId, mutatePages]);

  const updateLayouts = useCallback((layouts: Array<{ i: string; x: number; y: number; w: number; h: number }>) => {
    if (!currentPageId) return;
    mutatePages(pages => pages.map(p => {
      if (p.id !== currentPageId) return p;
      return {
        ...p,
        widgets: p.widgets.map(w => {
          const l = layouts.find(l => l.i === w.id);
          return l ? { ...w, layout: { ...w.layout, x: l.x, y: l.y, w: l.w, h: l.h } } : w;
        }),
      };
    }));
  }, [currentPageId, mutatePages]);

  // Save to Supabase
  const saveDashboard = useCallback(() => {
    if (!dashboard) return;
    const config = { pages: dashboard.pages, theme: dashboard.theme, globalFilters: dashboard.globalFilters };

    if (isSupabaseConfigured && supabase && user) {
      supabase.from('dashboards').upsert({
        id: dashboard.id, user_id: user.id, dashboard_name: dashboard.name,
        layout_config: config,
      }, { onConflict: 'id' }).then(({ error }) => {
        if (error) console.error('Save dashboard error:', error);
      });
    }

    setSavedDashboards(prev => {
      const updated = prev.filter(d => d.id !== dashboard.id);
      updated.push({ ...dashboard, updatedAt: new Date().toISOString() });
      return updated;
    });
    toast({ title: 'Dashboard Saved', description: `"${dashboard.name}" saved.` });
  }, [dashboard, user]);

  const deleteSavedDashboard = useCallback((id: string) => {
    setSavedDashboards(prev => prev.filter(d => d.id !== id));
    if (isSupabaseConfigured && supabase) {
      supabase.from('dashboards').delete().eq('id', id).then();
    }
    if (dashboard?.id === id) { setDashboard(null); setCurrentPageId(null); }
    toast({ title: 'Dashboard Deleted' });
  }, [dashboard]);

  return (
    <DashboardContext.Provider value={{
      dashboard, currentPageId, currentPage, selectedWidgetId,
      createDashboard, loadDashboard, renameDashboard, closeDashboard,
      addPage, removePage, renamePage, setCurrentPage: setCurrentPageId,
      addWidget, removeWidget, updateWidget, updateWidgetConfig, updateLayouts, selectWidget: setSelectedWidgetId,
      crossFilter, setCrossFilter,
      undo, redo, canUndo, canRedo,
      savedDashboards, saveDashboard, deleteSavedDashboard,
      zoom, setZoom,
    }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be within DashboardProvider');
  return ctx;
}
