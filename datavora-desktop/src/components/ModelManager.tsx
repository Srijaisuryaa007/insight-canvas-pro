import { useState } from "react";
import { Download, Trash2, MessageSquare, X } from "lucide-react";
import { useModelStore } from "@/stores/modelStore";
import { ollamaAPI, formatBytes } from "@/utils/ollama";

const POPULAR = [
  { name: "llama3.2:3b", desc: "Fast, great for everyday chat", size: "2.0 GB", ram: "4 GB" },
  { name: "llama3.2:1b", desc: "Tiniest Llama — ultra fast", size: "1.3 GB", ram: "2 GB" },
  { name: "llama3.1:8b", desc: "Balanced, capable all-rounder", size: "4.7 GB", ram: "8 GB" },
  { name: "mistral:7b", desc: "Strong reasoning, good for code", size: "4.1 GB", ram: "8 GB" },
  { name: "codellama:7b", desc: "Specialised for code", size: "3.8 GB", ram: "8 GB" },
  { name: "phi3:mini", desc: "Microsoft's tiny powerhouse", size: "2.3 GB", ram: "4 GB" },
  { name: "gemma2:2b", desc: "Google efficiency model", size: "1.6 GB", ram: "4 GB" },
  { name: "qwen2:7b", desc: "Multilingual, strong reasoning", size: "4.4 GB", ram: "8 GB" },
  { name: "deepseek-coder:6.7b", desc: "Code specialist", size: "3.8 GB", ram: "8 GB" },
];

export function ModelManager({ onChat }: { onChat: () => void }) {
  const { installed, ollamaRunning, refresh } = useModelStore();
  const [pulling, setPulling] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ percent: number; status: string }>({ percent: 0, status: "" });

  const installedNames = new Set(installed.map((m) => m.name));

  const pull = async (name: string) => {
    setPulling(name);
    setProgress({ percent: 0, status: "starting…" });
    try {
      for await (const p of ollamaAPI.pullModel(name)) {
        const percent = p.total && p.completed ? Math.round((p.completed / p.total) * 100) : progress.percent;
        setProgress({ percent, status: p.status });
      }
      await refresh();
    } catch (e) {
      alert("Failed to pull: " + (e as Error).message);
    } finally {
      setPulling(null);
      setProgress({ percent: 0, status: "" });
    }
  };

  const del = async (name: string) => {
    if (!confirm(`Delete ${name}? This frees disk space immediately.`)) return;
    await ollamaAPI.deleteModel(name);
    await refresh();
  };

  return (
    <div className="h-full overflow-y-auto p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Models</h1>
      <p className="text-sm text-muted mb-6">Manage local models. Everything runs on your machine via Ollama.</p>

      {!ollamaRunning && (
        <div className="mb-6 p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-sm">
          Ollama is not running. Start it with <code className="bg-elevated px-1.5 py-0.5 rounded">ollama serve</code>, then refresh.
        </div>
      )}

      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted mb-3">Installed ({installed.length})</h2>
      <div className="space-y-2 mb-8">
        {installed.map((m) => (
          <div key={m.name} className="flex items-center gap-4 p-3 bg-surface border border-border rounded-lg">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{m.name}</div>
              <div className="text-[11px] text-muted">
                {formatBytes(m.size)} · {m.details?.parameter_size ?? "?"} · {m.details?.quantization_level ?? ""}
              </div>
            </div>
            <button onClick={onChat} className="text-xs px-3 py-1.5 rounded-md bg-accent/15 hover:bg-accent/25 text-accent inline-flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> Chat
            </button>
            <button onClick={() => del(m.name)} className="text-xs px-3 py-1.5 rounded-md hover:bg-rose-500/15 text-rose-400 inline-flex items-center gap-1">
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          </div>
        ))}
        {!installed.length && <div className="text-xs text-muted py-4">No models installed yet.</div>}
      </div>

      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted mb-3">Popular models</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {POPULAR.map((m) => {
          const installed = installedNames.has(m.name);
          const isPulling = pulling === m.name;
          return (
            <div key={m.name} className="p-4 bg-surface border border-border rounded-lg">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="text-sm font-medium">{m.name}</div>
                {installed && <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Installed</span>}
              </div>
              <p className="text-xs text-muted mb-3">{m.desc}</p>
              <div className="flex items-center gap-3 text-[11px] text-muted mb-3">
                <span>📦 {m.size}</span><span>💾 {m.ram} RAM</span>
              </div>
              {isPulling ? (
                <div>
                  <div className="h-1.5 bg-elevated rounded-full overflow-hidden mb-1">
                    <div className="h-full bg-accent transition-all" style={{ width: `${progress.percent}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted">
                    <span>{progress.status}</span><span>{progress.percent}%</span>
                  </div>
                </div>
              ) : (
                <button
                  disabled={installed || !ollamaRunning || !!pulling}
                  onClick={() => pull(m.name)}
                  className="w-full text-xs py-1.5 rounded-md bg-elevated hover:bg-accent/20 hover:text-accent disabled:opacity-40 disabled:cursor-not-allowed transition inline-flex items-center justify-center gap-1"
                >
                  {installed ? "Already installed" : (<><Download className="h-3 w-3" /> Download</>)}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
