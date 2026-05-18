import { useEffect, useRef, useState } from 'react';
import { Plus, Search, X, Settings as SettingsIcon, Moon, Sun, Edit2, Trash2, Download as DownloadIcon } from 'lucide-react';
import { useChatStore } from '../stores/chatStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useOllama, getModelEmoji } from '../hooks/useOllama';
import { SystemStatus } from './SystemStatus';
import { formatDistanceToNow } from 'date-fns';
import type { Conversation } from '../types';

interface Props {
  onView: (v: 'chat' | 'models' | 'settings') => void;
  view: 'chat' | 'models' | 'settings';
  searchInputRef?: React.RefObject<HTMLInputElement>;
}

function ConversationItem({
  c,
  active,
  onClick,
  onRename,
  onDelete,
}: {
  c: Conversation;
  active: boolean;
  onClick: () => void;
  onRename: (id: string, t: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  useEffect(() => {
    if (!confirmDel) return;
    const t = setTimeout(() => setConfirmDel(false), 3000);
    return () => clearTimeout(t);
  }, [confirmDel]);

  return (
    <div
      role="button"
      onClick={onClick}
      className={`group relative cursor-pointer pl-2 pr-2 py-2 mx-1 rounded-md text-sm hover:bg-surface ${active ? 'bg-surface' : ''}`}
      style={{ borderLeft: `3px solid ${active ? '#7C3AED' : 'transparent'}` }}
    >
      <div className="flex items-center justify-between gap-1">
        {editing != null ? (
          <input
            autoFocus
            value={editing}
            onChange={(e) => setEditing(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={() => {
              if (editing.trim()) onRename(c.id, editing.trim());
              setEditing(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') setEditing(null);
            }}
            className="bg-surface-2 border border-border-soft rounded px-1 text-xs flex-1 min-w-0"
          />
        ) : (
          <span className="truncate flex-1 text-text-base">{c.title}</span>
        )}
        <span className="text-[10px] text-muted shrink-0">
          {formatDistanceToNow(c.updatedAt, { addSuffix: false })}
        </span>
      </div>
      <div className="flex items-center justify-between mt-0.5 gap-1">
        <span className="truncate text-[11px] text-muted flex-1">{c.lastMessage || '—'}</span>
        <span className="text-[10px] text-muted bg-app-bg px-1.5 py-0.5 rounded">
          {getModelEmoji(c.model)} {c.model.split(':')[0]}
        </span>
      </div>
      <div className="opacity-0 group-hover:opacity-100 absolute right-2 top-2 flex items-center gap-1 bg-surface rounded">
        <button
          title="Rename"
          onClick={(e) => {
            e.stopPropagation();
            setEditing(c.title);
          }}
          className="p-1 hover:bg-surface-2 rounded"
        >
          <Edit2 size={11} />
        </button>
        <button
          title={confirmDel ? 'Click again to confirm' : 'Delete'}
          onClick={(e) => {
            e.stopPropagation();
            if (confirmDel) {
              onDelete(c.id);
              setConfirmDel(false);
            } else setConfirmDel(true);
          }}
          className={`p-1 hover:bg-surface-2 rounded ${confirmDel ? 'text-danger' : ''}`}
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}

export function Sidebar({ onView, view, searchInputRef }: Props) {
  const conversations = useChatStore((s) => s.conversations);
  const activeId = useChatStore((s) => s.activeConversationId);
  const setActive = useChatStore((s) => s.setActiveConversation);
  const createConv = useChatStore((s) => s.createConversation);
  const deleteConv = useChatStore((s) => s.deleteConversation);
  const updateTitle = useChatStore((s) => s.updateTitle);
  const setSearch = useChatStore((s) => s.setSearchQuery);
  const searchQuery = useChatStore((s) => s.searchQuery);
  const getGrouped = useChatStore((s) => s.getGroupedConversations);

  const sidebarWidth = useSettingsStore((s) => s.sidebarWidth);
  const updateSetting = useSettingsStore((s) => s.updateSetting);
  const defaultModel = useSettingsStore((s) => s.defaultModel);
  const theme = useSettingsStore((s) => s.theme);

  const { installedModels, ollamaRunning } = useOllama();

  const onNewChat = async () => {
    if (!defaultModel && !installedModels.length) {
      onView('models');
      return;
    }
    const model = defaultModel || installedModels[0]?.name;
    if (!model) return;
    const id = await createConv(model);
    await setActive(id);
    onView('chat');
  };

  // Resize drag
  const draggingRef = useRef(false);
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const w = Math.max(200, Math.min(400, e.clientX));
      void updateSetting('sidebarWidth', w);
    };
    const onUp = () => (draggingRef.current = false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [updateSetting]);

  const cycleTheme = () => {
    const next = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark';
    void updateSetting('theme', next);
  };

  const grouped = getGrouped();
  void conversations; // ensure subscription

  return (
    <aside
      className="relative bg-sidebar-bg border-r border-border-soft flex flex-col shrink-0"
      style={{ width: sidebarWidth }}
    >
      {/* Top */}
      <div className="p-3 border-b border-border-soft">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-lg">🤖</span>
            <span className="font-bold">DataVora</span>
            <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded-full">Desktop</span>
          </div>
          <span className={`w-2 h-2 rounded-full ${ollamaRunning ? 'bg-success' : 'bg-danger'}`} />
        </div>
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white rounded-lg px-3 py-2 text-sm"
        >
          <Plus size={14} /> New Chat
        </button>
      </div>

      {/* Search */}
      <div className="p-2 border-b border-border-soft">
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted" />
          <input
            ref={searchInputRef}
            placeholder="Search conversations…"
            value={searchQuery}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-app-bg border border-border-soft rounded pl-7 pr-7 py-1.5 text-xs outline-none focus:border-accent"
          />
          {searchQuery && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-text-base">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* History */}
      <div className="flex-1 overflow-y-auto py-1">
        {(['today', 'yesterday', 'week', 'older'] as const).map((g) => {
          const items = grouped[g];
          if (!items.length) return null;
          const labels: Record<string, string> = { today: 'Today', yesterday: 'Yesterday', week: 'Last 7 Days', older: 'Older' };
          return (
            <div key={g} className="mb-2">
              <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted">{labels[g]}</div>
              {items.map((c) => (
                <ConversationItem
                  key={c.id}
                  c={c}
                  active={c.id === activeId && view === 'chat'}
                  onClick={() => {
                    void setActive(c.id);
                    onView('chat');
                  }}
                  onRename={updateTitle}
                  onDelete={deleteConv}
                />
              ))}
            </div>
          );
        })}
        {!grouped.today.length && !grouped.yesterday.length && !grouped.week.length && !grouped.older.length && (
          <div className="px-4 py-6 text-center text-xs text-muted">
            {searchQuery ? 'No matches.' : 'No conversations yet.'}
          </div>
        )}
      </div>

      {/* Bottom */}
      <div className="border-t border-border-soft">
        <SystemStatus />
        <div className="flex items-center justify-between px-3 py-2 border-t border-border-soft">
          <button
            onClick={() => onView('models')}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-text-base"
          >
            <DownloadIcon size={12} /> Models
          </button>
          <button onClick={cycleTheme} title={`Theme: ${theme}`} className="p-1 hover:bg-surface rounded">
            {theme === 'light' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button onClick={() => onView('settings')} className="p-1 hover:bg-surface rounded">
            <SettingsIcon size={14} />
          </button>
        </div>
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={() => (draggingRef.current = true)}
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-accent/50"
      />
    </aside>
  );
}
