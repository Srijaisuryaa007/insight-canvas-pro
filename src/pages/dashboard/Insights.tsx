import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, AlertTriangle, Target, ShieldAlert, Sparkles, Database, Eye,
  ArrowUpRight, Activity, Zap, Search, SortDesc, Loader2, Brain, CheckCircle2,
  Circle, BarChart3, Download, ChevronDown, ChevronUp, Gem
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useData } from '@/contexts/DataContext';
import { useInsights } from '@/hooks/useInsights';
import { useSubscription } from '@/hooks/useSubscription';
import { Insight } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

// ─── Type Config ────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, {
  icon: any; label: string; emoji: string;
  gradientFrom: string; gradientTo: string;
  accentClass: string; bgClass: string; textClass: string;
  stripGradient: string;
}> = {
  trend: {
    icon: TrendingUp, label: 'Trend', emoji: '📈',
    gradientFrom: 'from-cyan-400', gradientTo: 'to-blue-500',
    accentClass: 'bg-cyan-500', bgClass: 'bg-cyan-500/10', textClass: 'text-cyan-400',
    stripGradient: 'from-cyan-400 to-blue-500',
  },
  anomaly: {
    icon: ShieldAlert, label: 'Anomaly', emoji: '⚠️',
    gradientFrom: 'from-amber-400', gradientTo: 'to-red-500',
    accentClass: 'bg-amber-500', bgClass: 'bg-amber-500/10', textClass: 'text-amber-400',
    stripGradient: 'from-amber-400 to-red-500',
  },
  risk: {
    icon: AlertTriangle, label: 'Risk', emoji: '🔴',
    gradientFrom: 'from-red-400', gradientTo: 'to-pink-500',
    accentClass: 'bg-red-500', bgClass: 'bg-red-500/10', textClass: 'text-red-400',
    stripGradient: 'from-red-400 to-pink-500',
  },
  opportunity: {
    icon: Target, label: 'Opportunity', emoji: '💡',
    gradientFrom: 'from-violet-400', gradientTo: 'to-indigo-500',
    accentClass: 'bg-violet-500', bgClass: 'bg-violet-500/10', textClass: 'text-violet-400',
    stripGradient: 'from-violet-400 to-indigo-500',
  },
  correlation: {
    icon: Activity, label: 'Correlation', emoji: '🔗',
    gradientFrom: 'from-blue-400', gradientTo: 'to-indigo-500',
    accentClass: 'bg-blue-500', bgClass: 'bg-blue-500/10', textClass: 'text-blue-400',
    stripGradient: 'from-blue-400 to-indigo-500',
  },
  distribution: {
    icon: BarChart3, label: 'Distribution', emoji: '📊',
    gradientFrom: 'from-purple-400', gradientTo: 'to-pink-500',
    accentClass: 'bg-purple-500', bgClass: 'bg-purple-500/10', textClass: 'text-purple-400',
    stripGradient: 'from-purple-400 to-pink-500',
  },
};

const CHART_TYPE_MAP: Record<string, string> = {
  line: 'line', trend: 'line', pie: 'pie', distribution: 'pie',
  bar: 'bar', comparison: 'bar', scatter: 'scatter', correlation: 'scatter',
  area: 'area', growth: 'area',
};

function getBusinessImpact(insight: Insight): string[] {
  switch (insight.type) {
    case 'trend': return ['Directional shift detected in dataset patterns', 'If the trend continues, strategic adjustments may be necessary', 'Monitor for reversal signals in upcoming data'];
    case 'anomaly': return ['Anomalies may indicate data quality issues or exceptional events', 'Root cause analysis is recommended before taking action', 'Could represent emerging patterns worth investigating'];
    case 'risk': return ['This risk pattern requires immediate attention', 'Failure to address could lead to revenue loss or operational issues', 'Proactive mitigation strategy recommended'];
    case 'opportunity': return ['Represents an untapped growth area in your data', 'Allocating resources here could yield significant returns', 'Early action provides competitive advantage'];
    default: return ['Pattern reveals underlying data structure', 'Use to inform strategy or identify areas for attention', 'Cross-reference with business objectives'];
  }
}

// ─── Animated Counter ───────────────────────────────────────────────
function AnimatedCounter({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * value));
      if (progress < 1) ref.current = requestAnimationFrame(animate);
    };
    ref.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(ref.current);
  }, [value, duration]);
  return <>{count}</>;
}

// ─── Confidence Ring ────────────────────────────────────────────────
function ConfidenceRing({ value, color }: { value: number; color: string }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="relative flex items-center justify-center w-[72px] h-[72px]">
      <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={radius} fill="none" strokeWidth="4" className="stroke-muted/30" />
        <motion.circle
          cx="32" cy="32" r={radius} fill="none" strokeWidth="4"
          className={color}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          strokeLinecap="round"
        />
      </svg>
      <div className="text-center">
        <span className="text-lg font-bold text-foreground">{Math.round(value)}%</span>
      </div>
    </div>
  );
}

// ─── Loading Steps ──────────────────────────────────────────────────
const LOADING_STEPS = [
  'Analyzing dataset structure...',
  'Detecting trend patterns...',
  'Identifying anomalies...',
  'Calculating risk factors...',
  'Finding opportunities...',
];

function LoadingState() {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const stepInterval = setInterval(() => setStep(s => Math.min(s + 1, LOADING_STEPS.length - 1)), 1800);
    const progressInterval = setInterval(() => setProgress(p => Math.min(p + 1.5, 95)), 100);
    return () => { clearInterval(stepInterval); clearInterval(progressInterval); };
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-16">
      {/* Pulsing brain */}
      <div className="relative mb-8">
        <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.1, 0.3] }} transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500 to-blue-500 blur-xl" style={{ width: 120, height: 120, left: -20, top: -20 }} />
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center">
          <Brain className="w-10 h-10 text-foreground" />
        </motion.div>
      </div>

      {/* Steps */}
      <div className="space-y-3 mb-8 w-full max-w-sm">
        {LOADING_STEPS.map((label, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.2 }}
            className="flex items-center gap-3">
            {i < step ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : i === step ? (
              <Loader2 className="w-5 h-5 text-violet-400 animate-spin shrink-0" />
            ) : (
              <Circle className="w-5 h-5 text-muted-foreground/30 shrink-0" />
            )}
            <span className={cn("text-sm", i < step ? "text-muted-foreground" : i === step ? "text-foreground font-medium" : "text-muted-foreground/40")}>{label}</span>
          </motion.div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-sm">
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div className="h-full bg-gradient-to-r from-violet-500 to-blue-500 rounded-full"
            style={{ width: `${progress}%` }} transition={{ duration: 0.1 }} />
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">Estimated ~8 seconds remaining</p>
      </div>
    </motion.div>
  );
}

// ─── Empty State ────────────────────────────────────────────────────
function EmptyState({ onGenerate, credits, creditCost, hasDataset }: { onGenerate: () => void; credits: number; creditCost: number; hasDataset: boolean }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-12">
      {/* Sonar animation */}
      <div className="relative mb-8 w-24 h-24">
        {[0, 1, 2].map(i => (
          <motion.div key={i}
            animate={{ scale: [1, 2.5], opacity: [0.4, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.8 }}
            className="absolute inset-0 rounded-full border-2 border-violet-500/30"
          />
        ))}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/30 flex items-center justify-center">
            <Brain className="w-8 h-8 text-violet-400" />
          </div>
        </div>
      </div>

      <h3 className="text-xl font-bold text-foreground mb-2">No insights generated yet</h3>
      <p className="text-sm text-muted-foreground text-center max-w-md mb-8">
        AI will analyze your dataset and uncover hidden patterns, anomalies, risks and opportunities automatically
      </p>

      {/* Preview cards (blurred) */}
      <div className="flex gap-3 mb-8 opacity-30 blur-[2px] pointer-events-none">
        {['Trend', 'Anomaly', 'Opportunity'].map(type => (
          <div key={type} className="w-48 h-28 rounded-2xl bg-card border border-border p-4">
            <div className="w-8 h-8 rounded-lg bg-muted mb-2" />
            <div className="w-24 h-3 rounded bg-muted mb-1.5" />
            <div className="w-32 h-2 rounded bg-muted" />
          </div>
        ))}
      </div>

      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Button
          size="lg"
          onClick={onGenerate}
          disabled={!hasDataset}
          className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-foreground font-bold text-base px-10 py-6 rounded-xl shadow-lg shadow-violet-500/20"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Generate AI Insights
        </Button>
      </motion.div>
      <p className="text-xs text-muted-foreground mt-3">
        Uses {creditCost} credits · Takes ~10 seconds
      </p>
    </motion.div>
  );
}

// ─── Stat Card ──────────────────────────────────────────────────────
function StatCard({ label, count, subtitle, accentColor, gradientFrom, gradientTo }: {
  label: string; count: number; subtitle: string; accentColor: string; gradientFrom: string; gradientTo: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ borderColor: 'hsl(var(--ring))' }}
      className="relative bg-card border border-border rounded-2xl p-5 overflow-hidden transition-colors group">
      {/* Left accent */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl", accentColor)} />
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 pl-3">{label}</p>
      <p className={cn("text-4xl font-bold pl-3 bg-gradient-to-r bg-clip-text text-transparent", gradientFrom, gradientTo)}>
        <AnimatedCounter value={count} />
      </p>
      <p className="text-xs text-muted-foreground mt-1 pl-3">{subtitle}</p>
    </motion.div>
  );
}

// ─── Insight Card ───────────────────────────────────────────────────
function InsightCard({ insight, isExpanded, onToggle, onVisualize }: {
  insight: Insight; isExpanded: boolean; onToggle: () => void; onVisualize: (insight: Insight) => void;
}) {
  const cfg = TYPE_CONFIG[insight.type] || TYPE_CONFIG.distribution;
  const Icon = cfg.icon;
  const confidencePercent = Math.round(insight.confidence * 100);
  const [vizLoading, setVizLoading] = useState(false);

  const handleVisualize = () => {
    setVizLoading(true);
    setTimeout(() => onVisualize(insight), 600);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl overflow-hidden hover:border-muted-foreground/20 hover:shadow-xl transition-all duration-200 group"
    >
      {/* Top color strip */}
      <div className={cn("h-1 w-full bg-gradient-to-r", cfg.stripGradient)} />

      {/* Header */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Type icon */}
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg", cfg.bgClass, `border border-${cfg.accentClass.replace('bg-', '')}/20`)}>
              {cfg.emoji}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground text-[15px] leading-snug">{insight.title}</h3>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border", cfg.bgClass, cfg.textClass, `border-${cfg.accentClass.replace('bg-', '')}/30`)}>
                  {cfg.label}
                </span>
                {insight.chartType && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                    {insight.chartType}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Confidence ring */}
          <div className="shrink-0 flex flex-col items-center">
            <ConfidenceRing value={confidencePercent} color={`stroke-${cfg.accentClass.replace('bg-', '')}`} />
            <span className="text-[9px] text-muted-foreground mt-0.5">confidence</span>
          </div>
        </div>
      </div>

      {/* Body - two columns */}
      <div className="px-5 pb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl bg-muted/30 p-3.5 border border-border/50">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">📊 Data Evidence</p>
          <p className="text-sm text-foreground leading-relaxed">{insight.description}</p>
        </div>
        {insight.reasoning && (
          <div className="rounded-xl bg-muted/30 p-3.5 border border-border/50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">🔬 Statistical Reasoning</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{insight.reasoning}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3.5 border-t border-border bg-muted/10 flex items-center justify-between gap-3">
        {/* Impact bar */}
        <div className="flex-1 max-w-[200px]">
          <p className="text-[10px] text-muted-foreground mb-1">Impact Level</p>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${confidencePercent}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={cn("h-full rounded-full bg-gradient-to-r", cfg.stripGradient)}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            className="text-xs gap-1.5 h-8 rounded-lg hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
            onClick={handleVisualize}
            disabled={vizLoading}
          >
            {vizLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
            {vizLoading ? 'Opening...' : 'Visualize'}
          </Button>
          <Button
            size="sm"
            className="text-xs gap-1.5 h-8 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-foreground font-medium"
            onClick={onToggle}
          >
            <Zap className="h-3 w-3" />
            {isExpanded ? 'Collapse' : 'Impact & Actions'}
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </div>
      </div>

      {/* Expanded section */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-5 py-5 border-t border-border bg-muted/5 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Business Impact */}
              <div>
                <p className="text-xs font-bold text-amber-400 mb-2.5 flex items-center gap-1.5">💼 Business Impact</p>
                <ul className="space-y-2">
                  {getBusinessImpact(insight).map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recommended Actions */}
              {insight.suggestedActions && insight.suggestedActions.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-blue-400 mb-2.5 flex items-center gap-1.5">⚡ Recommended Actions</p>
                  <ol className="space-y-2">
                    {insight.suggestedActions.map((action, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                        {action}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Related Metrics */}
              <div>
                <p className="text-xs font-bold text-violet-400 mb-2.5 flex items-center gap-1.5">📊 Related Metrics</p>
                <div className="flex flex-wrap gap-1.5">
                  {insight.chartType && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-[10px] text-violet-400">
                      Chart: {insight.chartType}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-[10px] text-violet-400">
                    Confidence: {confidencePercent}%
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-[10px] text-violet-400">
                    Type: {cfg.label}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────
export default function Insights() {
  const { datasets, currentDataset, currentData, selectDataset } = useData();
  const { isGenerating, insights, generateInsights } = useInsights();
  const { getCreditCost, credits } = useSubscription();
  const navigate = useNavigate();
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'confidence' | 'impact' | 'recent'>('confidence');

  const creditCost = getCreditCost('generate-insights');

  const handleGenerate = async () => {
    if (!currentDataset) return;
    await generateInsights(currentDataset.id, currentData);
  };

  const handleVisualize = (insight: Insight) => {
    const chartType = CHART_TYPE_MAP[insight.chartType] || CHART_TYPE_MAP[insight.type] || 'bar';
    const vizContext = {
      insightId: insight.id,
      chartType,
      title: insight.title,
      sourceInsight: insight.description,
      fromInsight: true,
    };
    sessionStorage.setItem('datapulse_viz_context', JSON.stringify(vizContext));
    navigate('/dashboard/visualizations');
    toast({ title: 'Opened from AI Insight', description: insight.title });
  };

  // Filter + search + sort
  const filteredInsights = insights
    .filter(i => activeFilter === 'all' || i.type === activeFilter)
    .filter(i => !searchQuery || i.title.toLowerCase().includes(searchQuery.toLowerCase()) || i.description.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'confidence') return b.confidence - a.confidence;
      if (sortBy === 'impact') return b.confidence - a.confidence;
      return 0;
    });

  const typeCounts = {
    trend: insights.filter(i => i.type === 'trend').length,
    anomaly: insights.filter(i => i.type === 'anomaly').length,
    risk: insights.filter(i => i.type === 'risk').length,
    opportunity: insights.filter(i => i.type === 'opportunity').length,
  };

  const filterTabs = [
    { key: 'all', label: `All (${insights.length})` },
    { key: 'trend', label: `Trends (${typeCounts.trend})` },
    { key: 'anomaly', label: `Anomalies (${typeCounts.anomaly})` },
    { key: 'risk', label: `Risks (${typeCounts.risk})` },
    { key: 'opportunity', label: `Opportunities (${typeCounts.opportunity})` },
  ];

  return (
    <div className="space-y-6">
      {/* ─── Header ────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center text-xl shadow-lg shadow-violet-500/20">
            💡
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">AI Insights</h1>
            <p className="text-sm text-muted-foreground">AI-powered patterns, risks and opportunities from your data</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Credits indicator */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border", credits < 10 ? "bg-destructive/10 border-destructive/30 text-destructive" : "bg-muted border-border text-muted-foreground")}>
                <Gem className="h-3.5 w-3.5" />
                {credits} credits
                {credits < 10 && <span className="text-[10px]">⚠️ Low</span>}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Each insight generation = {creditCost} credits</p>
            </TooltipContent>
          </Tooltip>

          {/* Dataset selector */}
          {datasets.length > 0 && (
            <Select value={currentDataset?.id || ''} onValueChange={(id) => selectDataset(id)}>
              <SelectTrigger className="w-[200px] bg-card border-border rounded-xl h-10">
                <Database className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Select dataset" />
              </SelectTrigger>
              <SelectContent>
                {datasets.map(ds => (
                  <SelectItem key={ds.id} value={ds.id}>{ds.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Generate button */}
          {currentDataset && (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className={cn(insights.length === 0 && !isGenerating && "animate-pulse")}>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-foreground font-semibold rounded-xl h-10 shadow-lg shadow-violet-500/20 gap-2"
              >
                {isGenerating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Analyzing...</>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />Generate Insights
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1 bg-foreground/10 text-foreground/80">{creditCost} cr</Badge>
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      {/* ─── Loading State ─────────────────────────────────────── */}
      {isGenerating && <LoadingState />}

      {/* ─── Empty State ───────────────────────────────────────── */}
      {!isGenerating && insights.length === 0 && (
        <EmptyState onGenerate={handleGenerate} credits={credits} creditCost={creditCost} hasDataset={!!currentDataset} />
      )}

      {/* ─── Results ───────────────────────────────────────────── */}
      {!isGenerating && insights.length > 0 && (
        <>
          {/* Summary Banner */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-card to-violet-500/5 border border-violet-500/20 rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-bold text-foreground flex items-center gap-2">🎯 Analysis Complete</p>
              <p className="text-sm text-muted-foreground mt-0.5">Discovered {insights.length} insights from {currentDataset?.name || 'dataset'}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {typeCounts.trend > 0 && <Badge variant="outline" className="gap-1 rounded-full text-cyan-400 border-cyan-500/30 bg-cyan-500/10">📈 {typeCounts.trend} Trend{typeCounts.trend > 1 ? 's' : ''}</Badge>}
              {typeCounts.anomaly > 0 && <Badge variant="outline" className="gap-1 rounded-full text-amber-400 border-amber-500/30 bg-amber-500/10">⚠️ {typeCounts.anomaly} Anomal{typeCounts.anomaly > 1 ? 'ies' : 'y'}</Badge>}
              {typeCounts.risk > 0 && <Badge variant="outline" className="gap-1 rounded-full text-red-400 border-red-500/30 bg-red-500/10">🔴 {typeCounts.risk} Risk{typeCounts.risk > 1 ? 's' : ''}</Badge>}
              {typeCounts.opportunity > 0 && <Badge variant="outline" className="gap-1 rounded-full text-violet-400 border-violet-500/30 bg-violet-500/10">💡 {typeCounts.opportunity} Opportunit{typeCounts.opportunity > 1 ? 'ies' : 'y'}</Badge>}
              <Button variant="outline" size="sm" className="rounded-lg text-xs gap-1" onClick={handleGenerate}>
                Re-analyze
              </Button>
            </div>
          </motion.div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Trends Detected" count={typeCounts.trend} subtitle={typeCounts.trend > 0 ? "vs last scan" : "none found"} accentColor="bg-cyan-500" gradientFrom="from-cyan-400" gradientTo="to-blue-500" />
            <StatCard label="Anomalies Found" count={typeCounts.anomaly} subtitle={typeCounts.anomaly > 0 ? "requires attention" : "all clear"} accentColor="bg-amber-500" gradientFrom="from-amber-400" gradientTo="to-red-500" />
            <StatCard label="Risk Factors" count={typeCounts.risk} subtitle={typeCounts.risk === 0 ? "all clear" : "needs review"} accentColor="bg-emerald-500" gradientFrom="from-emerald-400" gradientTo="to-green-500" />
            <StatCard label="Opportunities" count={typeCounts.opportunity} subtitle={typeCounts.opportunity > 0 ? "growth potential" : "run scan to discover"} accentColor="bg-violet-500" gradientFrom="from-violet-400" gradientTo="to-indigo-500" />
          </div>

          {/* Filter Bar */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {filterTabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-full text-xs font-medium transition-all",
                    activeFilter === tab.key
                      ? "bg-violet-600 text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search insights..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 h-8 w-48 text-xs bg-card border-border rounded-lg"
                />
              </div>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <SelectTrigger className="h-8 w-[140px] text-xs bg-card border-border rounded-lg">
                  <SortDesc className="h-3 w-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confidence">Confidence</SelectItem>
                  <SelectItem value="impact">Impact</SelectItem>
                  <SelectItem value="recent">Recent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Insight Cards */}
          <div className="space-y-4">
            {filteredInsights.map((insight, i) => (
              <motion.div key={insight.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <InsightCard
                  insight={insight}
                  isExpanded={expandedInsight === insight.id}
                  onToggle={() => setExpandedInsight(expandedInsight === insight.id ? null : insight.id)}
                  onVisualize={handleVisualize}
                />
              </motion.div>
            ))}
            {filteredInsights.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No insights match your filter criteria.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
