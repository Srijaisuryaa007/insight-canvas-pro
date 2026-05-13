import { useEffect } from "react";
import { useModelStore } from "@/stores/modelStore";
import { CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

export function SystemStatus() {
  const { ollamaRunning, installed, loading, refresh } = useModelStore();

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [refresh]);

  return (
    <div className="px-3 py-2 border-t border-border text-[11px] text-muted">
      <div className="flex items-center gap-2">
        {ollamaRunning ? (
          <><span className="h-2 w-2 rounded-full bg-emerald-500" /> Ollama running · {installed.length} model{installed.length === 1 ? "" : "s"}</>
        ) : (
          <><span className="h-2 w-2 rounded-full bg-rose-500" /> Ollama not detected</>
        )}
        <button onClick={refresh} className="ml-auto opacity-50 hover:opacity-100" title="Refresh">
          <RefreshCw className={"h-3 w-3 " + (loading ? "animate-spin" : "")} />
        </button>
      </div>
      {!ollamaRunning && (
        <a href="https://ollama.ai/download" target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-accent hover:underline">
          <AlertCircle className="h-3 w-3" /> Install Ollama
        </a>
      )}
      {ollamaRunning && installed.length === 0 && (
        <span className="mt-1 inline-flex items-center gap-1 text-amber-400">
          <AlertCircle className="h-3 w-3" /> No models — open Models page
        </span>
      )}
    </div>
  );
}
