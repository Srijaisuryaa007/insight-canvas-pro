import { useState } from 'react';
import { useOllama } from '../hooks/useOllama';
import { useModelStore } from '../stores/modelStore';

export function SystemStatus() {
  const { ollamaRunning, installedModels, loadedModels } = useOllama();
  const refresh = useModelStore((s) => s.refresh);
  const [expanded, setExpanded] = useState(false);
  const [starting, setStarting] = useState(false);

  const totalVram = loadedModels.reduce((n, m) => n + (m.sizeVram || 0), 0);

  const startOllama = async () => {
    setStarting(true);
    try {
      const { Command } = await import('@tauri-apps/plugin-shell');
      await new Command('ollama', ['serve']).spawn();
    } catch (e) {
      console.warn('Cannot spawn ollama:', e);
    }
    // Poll up to 30s
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      await refresh();
      if (useModelStore.getState().ollamaRunning) break;
    }
    setStarting(false);
  };

  if (!ollamaRunning) {
    return (
      <div className="px-3 py-2 text-xs">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-2 w-full text-left"
        >
          <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
          <span className="text-text-base">Ollama not found</span>
        </button>
        {expanded && (
          <div className="mt-2 space-y-2 text-muted">
            <p>Install Ollama to use local AI models.</p>
            <a
              className="text-accent underline block"
              href="https://ollama.ai/download"
              target="_blank"
              rel="noreferrer"
            >
              Download Ollama ↗
            </a>
            <button
              disabled={starting}
              onClick={startOllama}
              className="w-full bg-accent hover:bg-accent-hover text-white rounded px-2 py-1 disabled:opacity-50"
            >
              {starting ? 'Starting…' : 'Start Ollama'}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-3 py-2 text-xs">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-success" />
        <span className="text-text-base">Ollama running</span>
      </div>
      <div className="text-muted text-[10px] mt-0.5">
        {installedModels.length} model{installedModels.length === 1 ? '' : 's'}
        {totalVram > 0 ? ` · ${(totalVram / 1e9).toFixed(1)} GB VRAM` : ''}
      </div>
      {loadedModels.length > 0 && (
        <div className="text-success text-[10px] mt-0.5">● {loadedModels[0].name} active</div>
      )}
    </div>
  );
}
