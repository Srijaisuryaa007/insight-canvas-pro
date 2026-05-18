import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Download } from 'lucide-react';
import { useOllama, formatModelSize } from '../hooks/useOllama';
import { useChatStore } from '../stores/chatStore';
import { useSettingsStore } from '../stores/settingsStore';
import { db } from '../utils/database';

interface Props {
  onOpenModelManager?: () => void;
}

export function ModelSelector({ onOpenModelManager }: Props) {
  const { installedModels, getModelStatus, getModelEmoji } = useOllama();
  const activeId = useChatStore((s) => s.activeConversationId);
  const conversations = useChatStore((s) => s.conversations);
  const active = conversations.find((c) => c.id === activeId);
  const updateSetting = useSettingsStore((s) => s.updateSetting);
  const defaultModel = useSettingsStore((s) => s.defaultModel);

  const currentName = active?.model || defaultModel || 'No model';
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: r.left });
    }
    setOpen((v) => !v);
  };

  const select = async (name: string) => {
    if (active) {
      // Update active conv model
      const conv = { ...active, model: name, updatedAt: Date.now() };
      await db.saveConversation(conv);
      useChatStore.setState((s) => ({
        conversations: s.conversations.map((c) => (c.id === conv.id ? conv : c)),
      }));
    }
    await updateSetting('defaultModel', name);
    setOpen(false);
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface hover:bg-surface-2 text-sm border border-border-soft"
      >
        <span>{getModelEmoji(currentName)}</span>
        <span className="truncate max-w-[140px]">{currentName}</span>
        <ChevronDown size={14} />
      </button>
      {open &&
        createPortal(
          <div
            style={{ position: 'fixed', top: pos.top, left: pos.left, width: 280, zIndex: 1000 }}
            className="bg-surface border border-border-soft rounded-lg shadow-2xl max-h-64 overflow-auto"
          >
            <div className="px-3 py-2 text-[11px] uppercase tracking-wider text-muted border-b border-border-soft">
              Installed Models
            </div>
            {installedModels.length === 0 ? (
              <div className="px-3 py-4 text-sm text-muted">
                No models installed.{' '}
                <button
                  onClick={() => {
                    setOpen(false);
                    onOpenModelManager?.();
                  }}
                  className="text-accent underline"
                >
                  Open Model Manager
                </button>
              </div>
            ) : (
              installedModels.map((m) => {
                const status = getModelStatus(m.name);
                const dot =
                  status === 'loaded'
                    ? 'bg-success animate-pulse'
                    : status === 'available'
                    ? 'bg-blue-500'
                    : 'bg-muted';
                return (
                  <button
                    key={m.name}
                    onClick={() => select(m.name)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-surface-2 text-left text-sm"
                  >
                    <span className={`w-2 h-2 rounded-full ${dot} shrink-0`} />
                    <span className="grow truncate">
                      {getModelEmoji(m.name)} {m.name}
                    </span>
                    <span className="text-[10px] text-muted">{m.details.parameterSize}</span>
                    <span className="text-[10px] text-muted">{formatModelSize(m.size)}</span>
                  </button>
                );
              })
            )}
            <div className="px-3 py-2 text-[10px] text-muted border-t border-border-soft flex flex-wrap gap-2">
              <span><span className="inline-block w-1.5 h-1.5 rounded-full bg-success mr-1" />In VRAM</span>
              <span><span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mr-1" />Available</span>
            </div>
            <button
              onClick={() => {
                setOpen(false);
                onOpenModelManager?.();
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-accent hover:bg-surface-2 border-t border-border-soft"
            >
              <Download size={14} /> Download More
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
