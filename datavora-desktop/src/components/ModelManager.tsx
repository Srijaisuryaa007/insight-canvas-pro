import { useState } from 'react';
import { ArrowLeft, Info, Trash2, MessageSquare, Download, X, Search } from 'lucide-react';
import { useOllama, formatModelSize } from '../hooks/useOllama';
import { useModelStore } from '../stores/modelStore';
import { useChatStore } from '../stores/chatStore';
import { useSettingsStore } from '../stores/settingsStore';
import { POPULAR_MODELS } from '../types';
import type { OllamaModel, PopularModel } from '../types';

interface Props {
  onBack: () => void;
}

function PullProgress({ name }: { name: string }) {
  const { getPullProgress } = useOllama();
  const cancelPull = useModelStore((s) => s.cancelPull);
  const p = getPullProgress(name);
  if (!p) return null;
  const pct = p.total ? Math.round(((p.completed ?? 0) / p.total) * 100) : 0;
  return (
    <div className="space-y-1 w-full">
      <div className="h-1.5 bg-surface-2 rounded overflow-hidden">
        <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-muted">
        <span>{p.status} {pct}%</span>
        <span>
          {p.speed} {p.eta && `· ${p.eta}`}
          <button onClick={() => cancelPull(name)} className="ml-2 text-danger hover:underline">Cancel</button>
        </span>
      </div>
    </div>
  );
}

export function ModelManager({ onBack }: Props) {
  const { installedModels, getModelEmoji, getModelStatus, isModelInstalled, isModelPulling } = useOllama();
  const pullModel = useModelStore((s) => s.pullModel);
  const deleteModel = useModelStore((s) => s.deleteModel);
  const createConversation = useChatStore((s) => s.createConversation);
  const setActive = useChatStore((s) => s.setActiveConversation);
  const updateSetting = useSettingsStore((s) => s.updateSetting);

  const [search, setSearch] = useState('');
  const [info, setInfo] = useState<OllamaModel | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');

  const filtered = POPULAR_MODELS.filter(
    (m) => !search || m.label.toLowerCase().includes(search.toLowerCase()) || m.name.toLowerCase().includes(search.toLowerCase()),
  );

  const startChatWith = async (name: string) => {
    await updateSetting('defaultModel', name);
    const id = await createConversation(name);
    await setActive(id);
    onBack();
  };

  const onPullCustom = async () => {
    const n = customName.trim();
    if (!n) return;
    setCustomName('');
    await pullModel(n);
  };

  const openExternal = async (url: string) => {
    try {
      const { open } = await import('@tauri-apps/plugin-shell');
      await open(url);
    } catch {
      window.open(url, '_blank', 'noreferrer');
    }
  };

  return (
    <div className="h-full flex flex-col bg-app-bg text-text-base">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border-soft">
        <button onClick={onBack} className="p-1.5 hover:bg-surface rounded"><ArrowLeft size={16} /></button>
        <h1 className="font-medium">Model Manager</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full space-y-8">
        {/* Installed */}
        <section>
          <h2 className="text-sm uppercase tracking-wider text-muted mb-3">Installed Models</h2>
          {installedModels.length === 0 ? (
            <div className="bg-surface border border-border-soft rounded-lg p-8 text-center text-muted">
              No models installed yet — pick one below ↓
            </div>
          ) : (
            <div className="bg-surface border border-border-soft rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-2 text-muted text-xs uppercase">
                  <tr>
                    <th className="text-left px-3 py-2">Model</th>
                    <th className="text-left px-3 py-2">Size</th>
                    <th className="text-left px-3 py-2">Parameters</th>
                    <th className="text-left px-3 py-2">Context</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-right px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {installedModels.map((m) => {
                    const status = getModelStatus(m.name);
                    const expand = confirmDel === m.name;
                    return (
                      <>
                        <tr key={m.name} className="border-t border-border-soft">
                          <td className="px-3 py-2">
                            <span className="mr-1.5">{getModelEmoji(m.name)}</span>
                            {m.name}
                            <span className="ml-2 text-[10px] bg-surface-2 px-1.5 py-0.5 rounded">{m.details.quantizationLevel}</span>
                          </td>
                          <td className="px-3 py-2">{formatModelSize(m.size)}</td>
                          <td className="px-3 py-2">{m.details.parameterSize}</td>
                          <td className="px-3 py-2">{m.details.contextLength ? `${m.details.contextLength.toLocaleString()} tok` : '—'}</td>
                          <td className="px-3 py-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${status === 'loaded' ? 'bg-success/20 text-success' : 'bg-blue-500/20 text-blue-300'}`}>
                              {status === 'loaded' ? 'In VRAM' : 'Available'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button onClick={() => startChatWith(m.name)} className="p-1.5 hover:bg-surface-2 rounded" title="Chat"><MessageSquare size={14} /></button>
                            <button onClick={() => setInfo(m)} className="p-1.5 hover:bg-surface-2 rounded" title="Info"><Info size={14} /></button>
                            <button onClick={() => setConfirmDel(expand ? null : m.name)} className="p-1.5 hover:bg-surface-2 rounded text-danger" title="Delete"><Trash2 size={14} /></button>
                          </td>
                        </tr>
                        {expand && (
                          <tr className="bg-app-bg">
                            <td colSpan={6} className="px-3 py-2 text-xs">
                              Delete <b>{m.name}</b>? This cannot be undone.
                              <button onClick={() => setConfirmDel(null)} className="ml-3 text-muted underline">Cancel</button>
                              <button
                                onClick={async () => { await deleteModel(m.name); setConfirmDel(null); }}
                                className="ml-2 text-danger underline"
                              >
                                Confirm Delete
                              </button>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Download */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm uppercase tracking-wider text-muted">Download Models</h2>
            <div className="relative">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="bg-surface border border-border-soft rounded pl-7 pr-3 py-1 text-xs outline-none w-48"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((m: PopularModel) => {
              const installed = isModelInstalled(m.name);
              const pulling = isModelPulling(m.name);
              return (
                <div key={m.name} className="bg-surface border border-border-soft rounded-lg p-4 flex flex-col">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-3xl">{m.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{m.label}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {m.tags.map((t) => (
                          <span key={t} className="text-[9px] bg-surface-2 text-muted px-1.5 py-0.5 rounded-full">{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted mb-3 flex-1">{m.description}</p>
                  <div className="flex items-center justify-between text-[10px] text-muted mb-2">
                    <span>💾 {m.sizeGB} GB</span>
                    <span>🧠 {m.ramGB} GB RAM</span>
                  </div>
                  {pulling ? (
                    <PullProgress name={m.name} />
                  ) : installed ? (
                    <button disabled className="w-full text-xs py-1.5 rounded bg-surface-2 text-muted cursor-default">
                      ✓ Installed
                    </button>
                  ) : (
                    <button
                      onClick={() => pullModel(m.name)}
                      className="w-full flex items-center justify-center gap-1.5 text-xs py-1.5 rounded bg-accent hover:bg-accent-hover text-white"
                    >
                      <Download size={12} /> Download
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Custom */}
          <div className="mt-6 bg-surface border border-border-soft rounded-lg p-4">
            <h3 className="text-sm font-medium mb-2">Install any Ollama model</h3>
            <div className="flex gap-2">
              <input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. llama3.2:latest"
                className="flex-1 bg-app-bg border border-border-soft rounded px-3 py-1.5 text-sm outline-none"
                onKeyDown={(e) => e.key === 'Enter' && onPullCustom()}
              />
              <button onClick={onPullCustom} className="bg-accent hover:bg-accent-hover text-white text-sm px-4 rounded">
                Download
              </button>
            </div>
            <button onClick={() => openExternal('https://ollama.ai/library')} className="text-xs text-accent underline mt-2">
              Browse all models at ollama.ai/library ↗
            </button>
          </div>
        </section>
      </div>

      {info && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setInfo(null)}>
          <div className="bg-surface border border-border-soft rounded-xl p-5 w-full max-w-md text-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">{info.name}</h3>
              <button onClick={() => setInfo(null)}><X size={16} /></button>
            </div>
            <dl className="space-y-1 text-xs">
              <div className="flex justify-between"><dt className="text-muted">Family</dt><dd>{info.details.family}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Parameters</dt><dd>{info.details.parameterSize}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Quantization</dt><dd>{info.details.quantizationLevel}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Size</dt><dd>{formatModelSize(info.size)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Digest</dt><dd className="font-mono">{info.digest.slice(0, 16)}…</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Modified</dt><dd>{new Date(info.modifiedAt).toLocaleString()}</dd></div>
            </dl>
            <button onClick={() => openExternal(`https://ollama.ai/library/${info.name.split(':')[0]}`)} className="text-xs text-accent underline mt-3">
              View on ollama.ai ↗
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
