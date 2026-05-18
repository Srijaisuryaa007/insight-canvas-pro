import { useState } from 'react';
import { X, Download, Trash2, CheckCircle2, Circle } from 'lucide-react';
import type { InsightResult } from '@/lib/insightEngine';

export interface ActionItem {
  id: string;
  insight: InsightResult;
  addedAt: number;
  done: boolean;
}

interface Props {
  items: ActionItem[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onClearDone: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function ActionItemsPanel({ items, onToggle, onRemove, onClearDone, open, onOpenChange }: Props) {
  const completed = items.filter((i) => i.done).length;

  const exportList = () => {
    const lines = items.map((i, idx) =>
      `${idx + 1}. ${i.done ? '[x]' : '[ ]'} ${i.insight.title}\n   - ${i.insight.whatToDo.join('\n   - ')}`
    ).join('\n\n');
    const blob = new Blob([`DataVora Action Items\nGenerated ${new Date().toLocaleString()}\n\n${lines}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'action-items.txt'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <button
        onClick={() => onOpenChange(!open)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-30 px-3 py-2 rounded-l-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg writing-mode-vertical"
        style={{ writingMode: 'vertical-rl' }}
        title="Action Items"
      >
        Action Items ({items.length})
      </button>

      <aside
        className={`fixed right-0 top-0 h-screen w-[320px] bg-[#0F172A] border-l border-white/10 z-40 flex flex-col transition-transform ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3 className="text-sm font-semibold text-slate-100">Action Items</h3>
          <button onClick={() => onOpenChange(false)} className="p-1 rounded hover:bg-white/10">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {items.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-8">
              No actions yet. Click <span className="text-emerald-400">Act On</span> on any insight to add it here.
            </p>
          )}
          {items.map((item) => (
            <div
              key={item.id}
              className={`rounded-lg border border-white/10 bg-white/5 p-3 ${item.done ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start gap-2">
                <button onClick={() => onToggle(item.id)} className="mt-0.5 shrink-0">
                  {item.done
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    : <Circle className="w-4 h-4 text-slate-500" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-medium text-slate-200 line-clamp-2 ${item.done ? 'line-through' : ''}`}>
                    {item.insight.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      item.insight.impact === 'high' ? 'bg-red-500/15 text-red-400' :
                      item.insight.impact === 'medium' ? 'bg-amber-500/15 text-amber-400' :
                      'bg-emerald-500/15 text-emerald-400'
                    }`}>{item.insight.impact}</span>
                    <span className="text-[10px] text-slate-500">Added {timeAgo(item.addedAt)}</span>
                  </div>
                </div>
                <button onClick={() => onRemove(item.id)} className="p-1 rounded hover:bg-white/10 shrink-0">
                  <X className="w-3.5 h-3.5 text-slate-500" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <footer className="border-t border-white/10 p-3 space-y-2">
          <p className="text-[11px] text-slate-400">
            {items.length} actions · {completed} completed
          </p>
          <div className="flex gap-2">
            <button
              onClick={exportList}
              disabled={!items.length}
              className="flex-1 text-xs px-3 py-2 rounded-md bg-white/5 hover:bg-white/10 text-slate-200 transition disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button
              onClick={onClearDone}
              disabled={completed === 0}
              className="flex-1 text-xs px-3 py-2 rounded-md bg-white/5 hover:bg-white/10 text-slate-200 transition disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear Done
            </button>
          </div>
        </footer>
      </aside>
    </>
  );
}
