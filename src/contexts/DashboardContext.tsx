import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { DashboardSchema, DashboardPage, DashboardWidget, DashboardHistoryEntry, DEFAULT_THEME, createWidget } from '@/types/dashboard';
import { DashboardTemplate } from '@/types/dashboard';
import { toast } from '@/hooks/use-toast';

interface DashboardContextType {
  dashboard: DashboardSchema | null;
  currentPageId: string | null;
  currentPage: DashboardPage | null;
  selectedWidgetId: string | null;

  // CRUD
  createDashboard: (name: string, template?: DashboardTemplate) => void;
  loadDashboard: (schema: DashboardSchema) => void;
  renameDashboard: (name: string) => void;
  closeDashboard: () => void;

  // Pages
  addPage: (name: string) => void;
  removePage: (id: string) => void;
  renamePage: (id: string, name: string) => void;
  setCurrentPage: (id: string) => void;

  // Widgets
  addWidget: (type: DashboardWidget['type'], config?: Partial<DashboardWidget['config']>) => void;
  removeWidget: (id: string) => void;
  updateWidget: (id: string, updates: Partial<DashboardWidget>) => void;
  updateWidgetConfig: (id: string, config: Partial<DashboardWidget['config']>) => void;
  updateLayouts: (layouts: Array<{ i: string; x: number; y: number; w: number; h: number }>) => void;
  selectWidget: (id: string | null) => void;

  // Cross-filter
  crossFilter: { key: string; value: string } | null;
  setCrossFilter: (filter: { key: string; value: string } | null) => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Saved dashboards
  savedDashboards: DashboardSchema[];
  saveDashboard: () => void;
  deleteSavedDashboard: (id: string) => void;

  // Zoom
  zoom: number;
  setZoom: (z: number) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

const STORAGE_KEY = 'datapulse_dashboards';
const MAX_HISTORY = 30;

function loadSaved(): DashboardSchema[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function persistSaved(dashboards: DashboardSchema[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dashboards));
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [dashboard, setDashboard] = useState<DashboardSchema | null>(null);
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [crossFilter, setCrossFilter] = useState<{ key: string; value: string } | null>(null);
  const [savedDashboards, setSavedDashboards] = useState<DashboardSchema[]>(loadSaved);
  const [zoom, setZoom] = useState(100);

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

  // Dashboard CRUD
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

  // Pages
  const addPage = useCallback((name: string) => {
    const page: DashboardPage = { id: crypto.randomUUID(), name, widgets: [] };
    mutatePages(pages => [...pages, page]);
    setCurrentPageId(page.id);
  }, [mutatePages]);

  const removePage = useCallback((id: string) => {
    mutatePages(pages => {
      const remaining = pages.filter(p => p.id !== id);
      if (remaining.length === 0) return pages; // don't allow empty
      if (currentPageId === id) setCurrentPageId(remaining[0].id);
      return remaining;
    });
  }, [mutatePages, currentPageId]);

  const renamePage = useCallback((id: string, name: string) => {
    mutatePages(pages => pages.map(p => p.id === id ? { ...p, name } : p));
  }, [mutatePages]);

  // Widgets
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
      ? { ...p, widgets: p.widgets.map(w => w.id === id ? { ...w, ...updates } : w) }
      : p));
  }, [currentPageId, mutatePages]);

  const updateWidgetConfig = useCallback((id: string, config: Partial<DashboardWidget['config']>) => {
    if (!currentPageId) return;
    mutatePages(pages => pages.map(p => p.id === currentPageId
      ? { ...p, widgets: p.widgets.map(w => w.id === id ? { ...w, config: { ...w.config, ...config } } : w) }
      : p));
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

  // Save/Load
  const saveDashboard = useCallback(() => {
    if (!dashboard) return;
    setSavedDashboards(prev => {
      const updated = prev.filter(d => d.id !== dashboard.id);
      updated.push({ ...dashboard, updatedAt: new Date().toISOString() });
      persistSaved(updated);
      return updated;
    });
    toast({ title: 'Dashboard Saved', description: `"${dashboard.name}" saved.` });
  }, [dashboard]);

  const deleteSavedDashboard = useCallback((id: string) => {
    setSavedDashboards(prev => {
      const updated = prev.filter(d => d.id !== id);
      persistSaved(updated);
      return updated;
    });
    if (dashboard?.id === id) { setDashboard(null); setCurrentPageId(null); }
    toast({ title: 'Dashboard Deleted' });
  }, [dashboard]);

  return (
    <DashboardContext.Provider value={{
      dashboard, currentPageId, currentPage, selectedWidgetId,
      createDashboard, loadDashboard, renameDashboard,
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
