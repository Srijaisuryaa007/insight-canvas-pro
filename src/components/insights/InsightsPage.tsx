import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Plus, Sparkles } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { toast } from '@/hooks/use-toast';
import {
  detectAll, narrateFinding, enhanceWithGroq,
  type Finding, type InsightResult, type ColumnMeta, type DataRow,
} from '@/lib/insightEngine';
import InsightCard from './InsightCard';
import InsightSkeleton from './InsightSkeleton';
import ActionItemsPanel, { type ActionItem } from './ActionItemsPanel';

const TYPE_FILTERS = [
  { key: 'all',          label: 'All',          icon: '✨' },
  { key: 'trend',        label: 'Trends',       icon: '📈' },
  { key: 'anomaly',      label: 'Anomalies',    icon: '⚠️' },
  { key: 'correlation',  label: 'Correlations', icon: '🔗' },
  { key: 'ranking',      label: 'Rankings',     icon: '🏆' },
  { key: 'distribution', label: 'Distributions',icon: '📊' },
] as const;

type Entry = { id: string; finding: Finding; insight: InsightResult; regenerating?: boolean };

const REPORT_STORE_KEY = 'datavora_report_insights';

export default function InsightsPage() {
  const { currentDataset, currentData } = useData();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);

  const cols: ColumnMeta[] = useMemo(() => {
    if (!currentDataset?.columns) return [];
    return currentDataset.columns.map((c) => ({ name: c.name, type: c.type as ColumnMeta['type'] }));
  }, [currentDataset]);

  const data: DataRow[] = useMemo(() => currentData ?? [], [currentData]);

  const generateAll = useCallback(async () => {
    if (!data.length || !cols.length) {
      toast({ title: 'No data', description: 'Upload a dataset to generate insights.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      let findings = detectAll(data, cols);
      // Ensure minimum 5 insights by re-running on column combinations
      if (findings.length < 5 && cols.length > 1) {
        const extra = detectAll(data, cols).slice(0, 5 - findings.length);
        findings = [...findings, ...extra];
      }
      findings = findings.slice(0, 12);

      const results = await Promise.all(
        findings.map(async (f, i) => {
          const insight = await enhanceWithGroq(f, {
            datasetName: currentDataset?.name ?? 'dataset',
            rowCount: data.length,
            colNames: cols.map((c) => c.name),
          }).catch(() => narrateFinding(f));
          return { id: `${Date.now()}-${i}`, finding: f, insight };
        })
      );
      setEntries(results);
      toast({ title: 'Insights generated', description: `${results.length} insights ready.` });
    } catch (e) {
      toast({ title: 'Generation failed', description: 'Click Generate All to retry.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [data, cols, currentDataset]);

  useEffect(() => {
    if (data.length && cols.length && entries.length === 0) {
      generateAll();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDataset?.id]);

  const regenerateOne = useCallback(async (id: string) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, regenerating: true } : e)));
    const target = entries.find((e) => e.id === id);
    if (!target) return;
    try {
      const insight = await enhanceWithGroq(target.finding, {
        datasetName: currentDataset?.name ?? 'dataset',
        rowCount: data.length,
        colNames: cols.map((c) => c.name),
      }).catch(() => narrateFinding(target.finding));
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, insight, regenerating: false } : e)));
    } catch {
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, regenerating: false } : e)));
      toast({ title: 'Could not regenerate', description: 'Click retry on the card.', variant: 'destructive' });
    }
  }, [entries, currentDataset, data.length, cols]);

  const onVisualize = (f: Finding) => {
    const params = new URLSearchParams();
    if (f.type === 'correlation') { params.set('x', f.col1); params.set('y', f.col2); }
    else if (f.type === 'ranking') { params.set('x', f.dimCol); params.set('y', f.metricCol); }
    else if ('col' in f) { params.set('y', f.col); }
    navigate(`/dashboard/visualizations?${params.toString()}`);
  };

  const onAddToReport = (insight: InsightResult) => {
    try {
      const raw = localStorage.getItem(REPORT_STORE_KEY);
      const list: InsightResult[] = raw ? JSON.parse(raw) : [];
      list.push(insight);
      localStorage.setItem(REPORT_STORE_KEY, JSON.stringify(list));
      toast({ title: 'Added to report ✓', description: insight.title });
    } catch {
      toast({ title: 'Could not save', variant: 'destructive' });
    }
  };

  const onActOnThis = (insight: InsightResult) => {
    const item: ActionItem = { id: `${Date.now()}`, insight, addedAt: Date.now(), done: false };
    setActions((p) => [item, ...p]);
    setPanelOpen(true);
  };

  const filtered = useMemo(
    () => (filter === 'all' ? entries : entries.filter((e) => e.insight.type === filter)),
    [entries, filter]
  );

  const noData = !data.length || !cols.length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="px-6 py-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-400" /> AI Insights
            </h1>
            <p className="text-sm text-muted-foreground">
              {loading ? 'Analyzing dataset…' : `${entries.length} insights generated`}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={generateAll}
              disabled={loading || noData}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Generate All
            </button>
            <button
              onClick={() => {
                const prompt = window.prompt('Describe the custom insight you want (e.g. "compare Q1 vs Q2 revenue by region")');
                if (!prompt) return;
                toast({ title: 'Custom insight queued', description: prompt.slice(0, 80) });
              }}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-semibold flex items-center gap-2 border border-white/10"
            >
              <Plus className="w-4 h-4" /> Add Custom
            </button>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-thin">
          {TYPE_FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                  active
                    ? 'bg-purple-600 text-white border-purple-500'
                    : 'bg-transparent text-slate-300 border-white/15 hover:border-white/30'
                }`}
              >
                {f.icon} {f.label}
              </button>
            );
          })}
        </div>

        {/* Grid */}
        {noData ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
            <p className="text-sm text-slate-400">Upload or select a dataset to generate insights.</p>
          </div>
        ) : loading && entries.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InsightSkeleton />
            <InsightSkeleton />
          </div>
        ) : (
          <AnimatePresence>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((e) => (
                <InsightCard
                  key={e.id}
                  insight={e.insight}
                  finding={e.finding}
                  data={data}
                  regenerating={e.regenerating}
                  onVisualize={() => onVisualize(e.finding)}
                  onAddToReport={() => onAddToReport(e.insight)}
                  onActOnThis={() => onActOnThis(e.insight)}
                  onRegenerate={() => regenerateOne(e.id)}
                />
              ))}
            </div>
          </AnimatePresence>
        )}

        {!loading && entries.length > 0 && filtered.length === 0 && (
          <p className="text-center text-sm text-slate-500 mt-8">
            No {filter} insights found. Try another filter.
          </p>
        )}
      </div>

      <ActionItemsPanel
        items={actions}
        open={panelOpen}
        onOpenChange={setPanelOpen}
        onToggle={(id) => setActions((p) => p.map((i) => (i.id === id ? { ...i, done: !i.done } : i)))}
        onRemove={(id) => setActions((p) => p.filter((i) => i.id !== id))}
        onClearDone={() => setActions((p) => p.filter((i) => !i.done))}
      />
    </div>
  );
}
