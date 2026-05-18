import { RefreshCw, BarChart3, FileText, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import type { InsightResult, Finding, DataRow } from '@/lib/insightEngine';
import InsightMiniChart from './InsightMiniChart';

interface Props {
  insight: InsightResult;
  finding: Finding;
  data: DataRow[];
  regenerating?: boolean;
  onVisualize: () => void;
  onAddToReport: () => void;
  onActOnThis: () => void;
  onRegenerate: () => void;
}

const TYPE_BADGE: Record<string, { bg: string; label: string }> = {
  trend:        { bg: '#1D4ED8', label: '📈 TREND' },
  anomaly:      { bg: '#B91C1C', label: '⚠️ ANOMALY' },
  correlation:  { bg: '#7C3AED', label: '🔗 CORRELATION' },
  ranking:      { bg: '#B45309', label: '🏆 RANKING' },
  distribution: { bg: '#065F46', label: '📊 DISTRIBUTION' },
};

const IMPACT: Record<string, { bg: string; dot: string; label: string }> = {
  high:   { bg: 'bg-red-500/15 text-red-400 border-red-500/30',     dot: '🔴', label: 'High Impact' },
  medium: { bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30', dot: '🟡', label: 'Medium Impact' },
  low:    { bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', dot: '🟢', label: 'Low Impact' },
};
const EFFORT: Record<string, string> = {
  easy: 'text-emerald-400', medium: 'text-amber-400', complex: 'text-red-400',
};

export default function InsightCard({
  insight, finding, data, regenerating,
  onVisualize, onAddToReport, onActOnThis, onRegenerate,
}: Props) {
  const badge = TYPE_BADGE[insight.type];
  const confColor =
    insight.confidence >= 80 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
    insight.confidence >= 60 ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                               'bg-red-500/15 text-red-400 border-red-500/30';
  const impact = IMPACT[insight.impact];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/10 bg-[#0F172A] flex flex-col overflow-hidden hover:border-white/20 transition-colors"
    >
      {/* header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className="text-[10px] font-semibold tracking-wider px-2 py-1 rounded text-white shrink-0"
            style={{ background: badge.bg }}
          >{badge.label}</span>
          <h3 className="text-sm font-semibold text-slate-100 truncate">{insight.title}</h3>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-1 rounded border ${confColor} shrink-0`}>
          {insight.confidence}%
        </span>
      </div>

      {/* body */}
      <div className="p-4 space-y-4 flex-1">
        <section>
          <div className="text-[10px] uppercase tracking-wider text-purple-400 font-semibold mb-1.5">
            What's Happening
          </div>
          <p className="text-[13px] text-slate-200 leading-relaxed">{insight.whatHappening}</p>
        </section>

        <section>
          <div className="text-[10px] uppercase tracking-wider text-amber-400 font-semibold mb-1.5">
            Why It Matters
          </div>
          <p className="text-[13px] text-slate-200 leading-relaxed">{insight.whyMatters}</p>
        </section>

        <section>
          <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold mb-1.5">
            What To Do
          </div>
          <ol className="text-xs text-slate-200 space-y-1">
            {insight.whatToDo.map((a, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-emerald-400 font-semibold">{i + 1}.</span>
                <span className="leading-relaxed">{a}</span>
              </li>
            ))}
          </ol>
        </section>

        <div className="-mx-2">
          <InsightMiniChart finding={finding} data={data} />
        </div>

        <div className="flex flex-wrap gap-2">
          <span className={`text-[10px] px-2 py-1 rounded-full border ${impact.bg}`}>
            {impact.dot} {impact.label}
          </span>
          <span className={`text-[10px] px-2 py-1 rounded-full border border-white/10 bg-white/5 ${EFFORT[insight.effort]}`}>
            {insight.effort.charAt(0).toUpperCase() + insight.effort.slice(1)}
          </span>
          <span className="text-[10px] px-2 py-1 rounded-full border border-white/10 bg-white/5 text-slate-300">
            {insight.confidence}% Confidence
          </span>
        </div>
      </div>

      {/* actions */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-white/10 bg-black/20">
        <button
          onClick={onVisualize}
          className="text-xs px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-slate-200 transition flex items-center gap-1.5"
          title="Open in Visualizations tab"
        >
          <BarChart3 className="w-3.5 h-3.5" /> Visualize
        </button>
        <button
          onClick={onAddToReport}
          className="text-xs px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-slate-200 transition flex items-center gap-1.5"
          title="Include in next report"
        >
          <FileText className="w-3.5 h-3.5" /> Add to Report
        </button>
        <button
          onClick={onActOnThis}
          className="text-xs px-3 py-1.5 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 transition flex items-center gap-1.5"
          title="Add to action items"
        >
          <Check className="w-3.5 h-3.5" /> Act On
        </button>
        <button
          onClick={onRegenerate}
          disabled={regenerating}
          className="ml-auto text-xs p-1.5 rounded-md hover:bg-white/10 text-slate-400 transition disabled:opacity-50"
          title="Regenerate this insight"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </motion.div>
  );
}
