import { useEffect, useRef, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { ModelManager } from './components/ModelManager';
import { SettingsPage } from './components/SettingsPage';
import { useChatStore } from './stores/chatStore';
import { useSettingsStore } from './stores/settingsStore';
import { useModelStore } from './stores/modelStore';
import { useOllama } from './hooks/useOllama';
import { db } from './utils/database';
import { Plus, Download as DownloadIcon, Settings as SettingsIcon, Upload, Minus, Square, X } from 'lucide-react';

type View = 'chat' | 'models' | 'settings';

export default function App() {
  const [view, setView] = useState<View>('chat');
  const [maximized, setMaximized] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const loadConversations = useChatStore((s) => s.loadConversations);
  const createConversation = useChatStore((s) => s.createConversation);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);
  const abortStreaming = useChatStore((s) => s.abortStreaming);
  const clearMessages = useChatStore((s) => s.clearMessages);
  const activeId = useChatStore((s) => s.activeConversationId);
  const conversations = useChatStore((s) => s.conversations);
  const messagesMap = useChatStore((s) => s.messages);

  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const defaultModel = useSettingsStore((s) => s.defaultModel);
  const theme = useSettingsStore((s) => s.theme);

  const checkOllama = useModelStore((s) => s.checkOllama);
  const startPolling = useModelStore((s) => s.startPolling);
  const stopPolling = useModelStore((s) => s.stopPolling);
  const { ollamaRunning, installedModels } = useOllama();

  // Init
  useEffect(() => {
    void (async () => {
      await db.init();
      await loadSettings();
      await loadConversations();
      await checkOllama();
      startPolling();
    })();
    return () => stopPolling();
  }, [loadSettings, loadConversations, checkOllama, startPolling, stopPolling]);

  // Theme application
  useEffect(() => {
    const root = document.documentElement;
    const apply = (mode: 'dark' | 'light') => {
      if (mode === 'dark') root.classList.add('dark');
      else root.classList.remove('dark');
    };
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      apply(mq.matches ? 'dark' : 'light');
      const h = (e: MediaQueryListEvent) => apply(e.matches ? 'dark' : 'light');
      mq.addEventListener('change', h);
      return () => mq.removeEventListener('change', h);
    }
    apply(theme);
  }, [theme]);

  // Shortcuts
  useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        const model = defaultModel || installedModels[0]?.name;
        if (model) {
          const id = await createConversation(model);
          await setActiveConversation(id);
          setView('chat');
        } else {
          setView('models');
        }
      } else if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (meta && e.key === ',') {
        e.preventDefault();
        setView('settings');
      } else if (meta && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setView('models');
      } else if (e.key === 'Escape') {
        abortStreaming();
      } else if (meta && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        const msgs = activeId ? messagesMap[activeId] ?? [] : [];
        const lastAssistant = [...msgs].reverse().find((m) => m.role === 'assistant');
        if (lastAssistant) void navigator.clipboard.writeText(lastAssistant.content);
      } else if (meta && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        if (confirm('Clear current conversation?')) void clearMessages();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [defaultModel, installedModels, activeId, messagesMap, createConversation, setActiveConversation, abortStreaming, clearMessages]);

  const winAction = async (act: 'min' | 'max' | 'close') => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const w = getCurrentWindow();
      if (act === 'min') await w.minimize();
      else if (act === 'max') {
        await w.toggleMaximize();
        setMaximized(await w.isMaximized());
      } else await w.close();
    } catch {
      /* not running in tauri */
    }
  };

  const startNewChat = async () => {
    const model = defaultModel || installedModels[0]?.name;
    if (!model) {
      setView('models');
      return;
    }
    const id = await createConversation(model);
    await setActiveConversation(id);
    setView('chat');
  };

  const renderContent = () => {
    if (view === 'models') return <ModelManager onBack={() => setView('chat')} />;
    if (view === 'settings') return <SettingsPage onBack={() => setView('chat')} />;
    if (activeId) return <ChatWindow onOpenModelManager={() => setView('models')} onOpenSettings={() => setView('settings')} />;
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="max-w-2xl text-center">
          {!ollamaRunning && (
            <div className="mb-6 bg-warning/10 border border-warning/30 text-warning rounded-lg px-4 py-3 text-sm">
              Ollama is not running. Start it to chat.
            </div>
          )}
          <div className="text-7xl mb-4">🤖</div>
          <h1 className="text-3xl font-bold">DataVora Desktop</h1>
          <p className="text-muted mt-1">Your private AI assistant.</p>
          <p className="text-xs text-muted mt-2">
            {installedModels.length ? `${installedModels.length} model${installedModels.length === 1 ? '' : 's'} installed` : 'No models yet'}
          </p>
          <div className="grid grid-cols-2 gap-3 mt-8 max-w-md mx-auto">
            <button onClick={startNewChat} className="bg-surface hover:bg-surface-2 border border-border-soft rounded-lg p-4 text-left">
              <Plus size={16} className="text-accent mb-2" />
              <div className="text-sm font-medium">Start a conversation</div>
              <div className="text-xs text-muted mt-1">Begin chatting now</div>
            </button>
            <button onClick={() => setView('models')} className="bg-surface hover:bg-surface-2 border border-border-soft rounded-lg p-4 text-left">
              <DownloadIcon size={16} className="text-accent mb-2" />
              <div className="text-sm font-medium">Manage models</div>
              <div className="text-xs text-muted mt-1">Download or remove models</div>
            </button>
            <button onClick={() => setView('settings')} className="bg-surface hover:bg-surface-2 border border-border-soft rounded-lg p-4 text-left">
              <SettingsIcon size={16} className="text-accent mb-2" />
              <div className="text-sm font-medium">Configure settings</div>
              <div className="text-xs text-muted mt-1">Tune temperature, theme, more</div>
            </button>
            <button onClick={() => setView('settings')} className="bg-surface hover:bg-surface-2 border border-border-soft rounded-lg p-4 text-left">
              <Upload size={16} className="text-accent mb-2" />
              <div className="text-sm font-medium">Import conversations</div>
              <div className="text-xs text-muted mt-1">Restore from JSON</div>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const viewLabel = view === 'chat' ? (conversations.find((c) => c.id === activeId)?.title ?? 'DataVora Desktop') : view === 'models' ? 'Model Manager' : 'Settings';

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-app-bg text-text-base">
      {/* Titlebar */}
      <div
        data-tauri-drag-region
        className="flex items-center justify-between px-3 h-10 bg-app-bg border-b border-border-soft select-none shrink-0"
      >
        <div className="text-xs text-muted">{viewLabel}</div>
        <div className="flex items-center gap-1">
          <button onClick={() => winAction('min')} className="p-1 hover:bg-surface rounded"><Minus size={12} /></button>
          <button onClick={() => winAction('max')} className="p-1 hover:bg-surface rounded">{maximized ? '❐' : <Square size={10} />}</button>
          <button onClick={() => winAction('close')} className="p-1 hover:bg-danger rounded"><X size={12} /></button>
        </div>
      </div>
      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar view={view} onView={setView} searchInputRef={searchRef} />
        <main className="flex-1 min-w-0 overflow-hidden">{renderContent()}</main>
      </div>
    </div>
  );
}
