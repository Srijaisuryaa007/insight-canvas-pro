import { useRef, useState } from 'react';
import { ArrowLeft, Copy, Upload, Download, Trash2 } from 'lucide-react';
import { useSettingsStore } from '../stores/settingsStore';
import { useChatStore } from '../stores/chatStore';
import { useModelStore } from '../stores/modelStore';
import { ModelSelector } from './ModelSelector';
import { db } from '../utils/database';
import type { ThemeMode, Density, GpuMode } from '../types';

interface Props {
  onBack: () => void;
}

const SECTIONS = ['General', 'Appearance', 'Performance', 'Storage', 'Shortcuts', 'About'] as const;
type Section = typeof SECTIONS[number];

const SHORTCUTS = [
  ['Ctrl+N', 'New conversation'],
  ['Ctrl+K', 'Search conversations'],
  ['Ctrl+,', 'Open settings'],
  ['Ctrl+M', 'Model manager'],
  ['Escape', 'Cancel streaming'],
  ['Ctrl+Shift+C', 'Copy last message'],
  ['Ctrl+L', 'Clear chat'],
  ['↑ (empty input)', 'Edit last message'],
];

export function SettingsPage({ onBack }: Props) {
  const settings = useSettingsStore();
  const update = settings.updateSetting;
  const reset = settings.resetSettings;
  const conversations = useChatStore((s) => s.conversations);
  const loadConversations = useChatStore((s) => s.loadConversations);
  const exportConvs = useChatStore((s) => s.exportConversations);
  const importConvs = useChatStore((s) => s.importConversations);
  const loadedModels = useModelStore((s) => s.loadedModels);

  const [section, setSection] = useState<Section>('General');
  const [confirmClear, setConfirmClear] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const totalVram = loadedModels.reduce((n, m) => n + (m.sizeVram || 0), 0);

  return (
    <div className="h-full flex flex-col bg-app-bg text-text-base">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border-soft">
        <button onClick={onBack} className="p-1.5 hover:bg-surface rounded"><ArrowLeft size={16} /></button>
        <h1 className="font-medium">Settings</h1>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <nav className="w-40 border-r border-border-soft p-2 text-sm">
          {SECTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setSection(s)}
              className={`w-full text-left px-3 py-2 rounded ${section === s ? 'bg-surface text-text-base' : 'text-muted hover:bg-surface'}`}
            >
              {s}
            </button>
          ))}
        </nav>
        <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full">
          {section === 'General' && (
            <div className="space-y-5">
              <Row label="Default Model">
                <ModelSelector />
              </Row>
              <Row label="Temperature" hint="Precise ←→ Creative">
                <Slider value={settings.temperature} min={0} max={2} step={0.1} onChange={(v) => update('temperature', v)} />
                <Badge value={settings.temperature.toFixed(1)} />
              </Row>
              <Row label="Context Window">
                <select
                  value={settings.contextWindow}
                  onChange={(e) => update('contextWindow', Number(e.target.value))}
                  className="bg-surface border border-border-soft rounded px-2 py-1 text-sm"
                >
                  {[512, 1024, 2048, 4096, 8192].map((n) => (
                    <option key={n} value={n}>{n.toLocaleString()} tokens</option>
                  ))}
                </select>
              </Row>
              <Row label="System Prompt">
                <textarea
                  value={settings.systemPrompt}
                  onChange={(e) => update('systemPrompt', e.target.value)}
                  rows={6}
                  placeholder="You are a helpful assistant…"
                  className="w-full bg-surface border border-border-soft rounded p-2 font-mono text-sm"
                />
                <button onClick={() => update('systemPrompt', '')} className="text-xs text-accent underline">
                  Reset to default
                </button>
              </Row>
              <button onClick={reset} className="text-xs text-danger underline">Reset all settings</button>
            </div>
          )}

          {section === 'Appearance' && (
            <div className="space-y-5">
              <Row label="Theme">
                <div className="flex gap-2">
                  {(['dark', 'light', 'system'] as ThemeMode[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => update('theme', t)}
                      className={`px-4 py-2 rounded border text-sm capitalize ${settings.theme === t ? 'border-accent text-accent' : 'border-border-soft text-muted'}`}
                    >
                      {settings.theme === t ? '✓ ' : ''}{t}
                    </button>
                  ))}
                </div>
              </Row>
              <Row label="Font Size">
                <Slider value={settings.fontSize} min={12} max={18} step={1} onChange={(v) => update('fontSize', v)} />
                <Badge value={`${settings.fontSize}px`} />
                <div style={{ fontSize: settings.fontSize }} className="mt-2 text-muted">The quick brown fox jumps over the lazy dog.</div>
              </Row>
              <Row label="Message Density">
                <div className="flex gap-2">
                  {(['comfortable', 'compact'] as Density[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => update('messageDensity', d)}
                      className={`px-4 py-2 rounded border text-sm capitalize ${settings.messageDensity === d ? 'border-accent text-accent' : 'border-border-soft text-muted'}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </Row>
              <Row label="Sidebar Width">
                <Slider value={settings.sidebarWidth} min={200} max={400} step={5} onChange={(v) => update('sidebarWidth', v)} />
                <Badge value={`${settings.sidebarWidth}px`} />
              </Row>
            </div>
          )}

          {section === 'Performance' && (
            <div className="space-y-5">
              <Row label="GPU Acceleration">
                <div className="flex gap-2">
                  {(['auto', 'cpu', 'gpu'] as GpuMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => update('gpuMode', m)}
                      className={`px-4 py-2 rounded border text-sm uppercase ${settings.gpuMode === m ? 'border-accent text-accent' : 'border-border-soft text-muted'}`}
                    >
                      {m === 'auto' ? 'Auto' : m === 'cpu' ? 'CPU only' : 'GPU only'}
                    </button>
                  ))}
                </div>
              </Row>
              <Row label="CPU Threads">
                <Slider value={settings.threads} min={1} max={16} step={1} onChange={(v) => update('threads', v)} disabled={settings.gpuMode === 'gpu'} />
                <Badge value={`${settings.threads} threads`} />
              </Row>
              <Row label="Max Loaded Models" hint="Loading more models uses more RAM">
                <Slider value={settings.maxLoadedModels} min={1} max={3} step={1} onChange={(v) => update('maxLoadedModels', v)} />
                <Badge value={`${settings.maxLoadedModels}`} />
                {totalVram > 0 && <div className="text-xs text-muted mt-1">Current: {(totalVram / 1e9).toFixed(1)} GB VRAM</div>}
              </Row>
            </div>
          )}

          {section === 'Storage' && (
            <div className="space-y-5">
              <Row label="Database Location">
                <div className="flex gap-2">
                  <input readOnly value={db.isLocalMode() ? 'localStorage (Tauri SQL unavailable)' : 'sqlite:datavora.db'} className="flex-1 bg-surface border border-border-soft rounded px-2 py-1 text-xs font-mono" />
                  <button onClick={() => navigator.clipboard.writeText(db.isLocalMode() ? 'localStorage' : 'sqlite:datavora.db')} className="p-1.5 hover:bg-surface rounded">
                    <Copy size={14} />
                  </button>
                </div>
              </Row>
              <Row label="Export Conversations">
                <button onClick={exportConvs} className="flex items-center gap-2 bg-surface hover:bg-surface-2 px-3 py-1.5 rounded text-sm">
                  <Download size={14} /> Export All as JSON
                </button>
              </Row>
              <Row label="Import Conversations">
                <input ref={importRef} type="file" accept="application/json" hidden onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    const n = await importConvs(f);
                    await loadConversations();
                    setImportMsg(`Imported ${n} conversations`);
                    setTimeout(() => setImportMsg(null), 3000);
                  } catch (err) {
                    setImportMsg(`Import failed: ${(err as Error).message}`);
                  }
                }} />
                <button onClick={() => importRef.current?.click()} className="flex items-center gap-2 bg-surface hover:bg-surface-2 px-3 py-1.5 rounded text-sm">
                  <Upload size={14} /> Import from JSON
                </button>
                {importMsg && <div className="text-xs text-success mt-1">{importMsg}</div>}
              </Row>
              <Row label="Clear All Data">
                <button onClick={() => setConfirmClear(true)} className="flex items-center gap-2 bg-danger/10 hover:bg-danger/20 text-danger px-3 py-1.5 rounded text-sm">
                  <Trash2 size={14} /> Clear All Conversations
                </button>
                <div className="text-xs text-muted mt-1">
                  {conversations.length} conversations · {conversations.reduce((n, c) => n + c.messageCount, 0)} messages
                </div>
              </Row>
            </div>
          )}

          {section === 'Shortcuts' && (
            <table className="w-full text-sm">
              <thead><tr><th className="text-left py-2 text-muted text-xs uppercase">Shortcut</th><th className="text-left py-2 text-muted text-xs uppercase">Action</th></tr></thead>
              <tbody>
                {SHORTCUTS.map(([k, a]) => (
                  <tr key={k} className="border-t border-border-soft">
                    <td className="py-2"><kbd className="bg-surface px-2 py-0.5 rounded text-xs font-mono">{k}</kbd></td>
                    <td className="py-2 text-muted">{a}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {section === 'About' && (
            <div className="space-y-3 text-sm">
              <div className="text-4xl">🤖</div>
              <div className="text-xl font-semibold">DataVora Desktop</div>
              <div className="text-muted">Version 1.0.0 · MIT License</div>
              <div className="text-muted">Built with Tauri, React, and Ollama.</div>
              <a className="text-accent underline block" href="https://github.com/" target="_blank" rel="noreferrer">View on GitHub ↗</a>
            </div>
          )}
        </div>
      </div>

      {confirmClear && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setConfirmClear(false)}>
          <div className="bg-surface border border-border-soft rounded-xl p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-medium mb-2">Delete everything?</h3>
            <p className="text-sm text-muted mb-4">
              This will permanently delete all {conversations.length} conversations and {conversations.reduce((n, c) => n + c.messageCount, 0)} messages. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmClear(false)} className="px-3 py-1.5 text-sm hover:bg-surface-2 rounded">Cancel</button>
              <button
                onClick={async () => {
                  await db.clearAllData();
                  await loadConversations();
                  setConfirmClear(false);
                }}
                className="px-3 py-1.5 text-sm bg-danger hover:bg-red-600 text-white rounded"
              >
                Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted mb-1.5">{label}</div>
      <div className="flex items-center gap-3 flex-wrap">{children}</div>
      {hint && <div className="text-[11px] text-muted mt-1">{hint}</div>}
    </div>
  );
}

function Slider({ value, min, max, step, onChange, disabled }: { value: number; min: number; max: number; step: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      className="flex-1 accent-accent"
    />
  );
}

function Badge({ value }: { value: string }) {
  return <span className="text-xs bg-surface px-2 py-0.5 rounded font-mono">{value}</span>;
}
