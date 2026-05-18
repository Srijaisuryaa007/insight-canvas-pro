import { useEffect, useRef, useState, KeyboardEvent, ChangeEvent } from 'react';
import { Paperclip, Mic, ArrowUp, Square, Trash2, Download, X, RotateCcw, Copy, Check, Settings as SettingsIcon, ArrowDown } from 'lucide-react';
import { useConversation } from '../hooks/useConversation';
import { useChatStore } from '../stores/chatStore';
import { useSettingsStore } from '../stores/settingsStore';
import { ModelSelector } from './ModelSelector';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { parseFile } from '../utils/fileParser';
import type { FileAttachment } from '../types';
import { getModelEmoji } from '../hooks/useOllama';

interface Props {
  onOpenModelManager?: () => void;
  onOpenSettings?: () => void;
}

const SUGGESTIONS = [
  'Explain how transformers work',
  'Write a Python web scraper',
  'Summarize the key ideas in a topic',
  'Help me debug this code',
];

export function ChatWindow({ onOpenModelManager, onOpenSettings }: Props) {
  const { activeConversation, messages, isStreaming, canSend, send, abort, clearMessages, editLastUserMessage, contextUsed, contextLimit } = useConversation();
  const updateTitle = useChatStore((s) => s.updateTitle);
  const exportConversations = useChatStore((s) => s.exportConversations);
  const fontSize = useSettingsStore((s) => s.fontSize);
  const density = useSettingsStore((s) => s.messageDensity);

  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [titleEdit, setTitleEdit] = useState<string | null>(null);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [showNewMsgFab, setShowNewMsgFab] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userNearBottomRef = useRef(true);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const max = parseInt(getComputedStyle(ta).lineHeight || '20', 10) * 8 + 24;
    ta.style.height = Math.min(ta.scrollHeight, max) + 'px';
  }, [input]);

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (userNearBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    } else {
      setShowNewMsgFab(true);
    }
  }, [messages]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const near = el.scrollTop + el.clientHeight > el.scrollHeight - 100;
    userNearBottomRef.current = near;
    if (near) setShowNewMsgFab(false);
  };

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setShowNewMsgFab(false);
    userNearBottomRef.current = true;
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'ArrowUp' && !input) {
      // Edit last user message
      const lastUser = [...messages].reverse().find((m) => m.role === 'user');
      if (lastUser) {
        setInput(lastUser.content);
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      if (confirm('Clear this conversation?')) void clearMessages();
    }
  };

  const handleSend = async () => {
    const content = input.trim();
    if (!content || !canSend) return;
    setInput('');
    const atts = attachments;
    setAttachments([]);
    await send(content, atts.length ? atts : undefined);
  };

  const handleFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const parsed: FileAttachment[] = [];
    for (const f of files) {
      try {
        parsed.push(await parseFile(f));
      } catch (err) {
        console.error('parse failed', err);
      }
    }
    setAttachments((s) => [...s, ...parsed]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const copyMessage = async (m: { id: string; content: string }) => {
    await navigator.clipboard.writeText(m.content);
    setCopiedMsgId(m.id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const regenerate = async () => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;
    await editLastUserMessage(lastUser.content);
  };

  if (!activeConversation) return null;

  const ctxPct = Math.min(100, (contextUsed / Math.max(1, contextLimit)) * 100);
  const ctxColor = ctxPct > 80 ? 'bg-danger' : 'bg-accent';
  const showSuggestions = messages.length === 0 && !isStreaming;
  const msgGap = density === 'compact' ? 'gap-3' : 'gap-6';

  return (
    <div className="flex flex-col h-full bg-app-bg text-text-base" style={{ fontSize: `${fontSize}px` }}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-border-soft">
        <div className="flex-1 min-w-0">
          {titleEdit != null ? (
            <input
              autoFocus
              value={titleEdit}
              onChange={(e) => setTitleEdit(e.target.value)}
              onBlur={() => {
                if (titleEdit.trim()) void updateTitle(activeConversation.id, titleEdit.trim());
                setTitleEdit(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                if (e.key === 'Escape') setTitleEdit(null);
              }}
              className="bg-transparent border border-border-soft rounded px-2 py-1 text-sm w-full"
            />
          ) : (
            <button
              onClick={() => setTitleEdit(activeConversation.title)}
              className="truncate text-sm font-medium hover:underline text-left"
              title="Click to rename"
            >
              {activeConversation.title}
            </button>
          )}
        </div>
        <ModelSelector onOpenModelManager={onOpenModelManager} />
        <div className="flex items-center gap-3 text-[11px] text-muted">
          <div className="flex items-center gap-1.5">
            <span>{contextUsed.toLocaleString()} / {contextLimit.toLocaleString()} tok</span>
            <div className="w-16 h-1 bg-surface-2 rounded overflow-hidden">
              <div className={`h-full ${ctxColor}`} style={{ width: `${ctxPct}%` }} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button title="System Prompt" onClick={() => setShowSystemPrompt(true)} className="p-1.5 hover:bg-surface-2 rounded">
            <SettingsIcon size={14} />
          </button>
          <button
            title="Clear chat"
            onClick={() => confirm('Clear this conversation?') && clearMessages()}
            className="p-1.5 hover:bg-surface-2 rounded"
          >
            <Trash2 size={14} />
          </button>
          <button title="Export all" onClick={exportConversations} className="p-1.5 hover:bg-surface-2 rounded">
            <Download size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-6 py-6 relative">
        {showSuggestions ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="text-6xl mb-3">{getModelEmoji(activeConversation.model)}</div>
            <h2 className="text-2xl font-semibold">DataVora Desktop</h2>
            <p className="text-muted text-sm mt-1">Powered by {activeConversation.model || 'no model selected'}</p>
            <div className="grid grid-cols-2 gap-2 mt-8 max-w-xl">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setInput(s);
                    textareaRef.current?.focus();
                  }}
                  className="text-left px-3 py-2 text-sm bg-surface hover:bg-surface-2 rounded-lg border border-border-soft"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className={`flex flex-col ${msgGap} max-w-4xl mx-auto`}>
            {messages.map((m) => (
              <div key={m.id} className="group relative">
                {m.role === 'assistant' && (
                  <div className="text-[11px] text-muted mb-1 flex items-center gap-1.5">
                    <span>{getModelEmoji(activeConversation.model)}</span>
                    <span>{activeConversation.model}</span>
                  </div>
                )}
                <MessageBubble message={m} isStreaming={!!m.isStreaming} />
                {!m.isStreaming && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-1 text-[11px] text-muted">
                    <button onClick={() => copyMessage(m)} className="hover:text-text-base p-1 rounded flex items-center gap-1">
                      {copiedMsgId === m.id ? <Check size={11} /> : <Copy size={11} />}
                      {copiedMsgId === m.id ? 'Copied' : 'Copy'}
                    </button>
                    {m.role === 'assistant' && (
                      <button onClick={regenerate} className="hover:text-text-base p-1 rounded flex items-center gap-1">
                        <RotateCcw size={11} /> Regenerate
                      </button>
                    )}
                    {m.tokens ? <span className="ml-auto">{m.tokens} tok</span> : null}
                  </div>
                )}
              </div>
            ))}
            {isStreaming && messages[messages.length - 1]?.role === 'assistant' && !messages[messages.length - 1]?.content && (
              <TypingIndicator modelName={activeConversation.model} />
            )}
          </div>
        )}

        {showNewMsgFab && (
          <button
            onClick={scrollToBottom}
            className="sticky bottom-2 mx-auto flex items-center gap-1 bg-accent text-white text-xs px-3 py-1.5 rounded-full shadow-lg"
          >
            <ArrowDown size={12} /> New message
          </button>
        )}

        {isStreaming && (
          <button
            onClick={abort}
            className="fixed bottom-32 right-10 bg-danger hover:bg-red-600 text-white rounded-full p-2.5 shadow-lg z-50"
            title="Stop generating"
          >
            <Square size={14} fill="white" />
          </button>
        )}
      </div>

      {/* Input */}
      <div className="px-4 pb-4">
        <div className="bg-surface border border-border-soft rounded-2xl p-3 max-w-4xl mx-auto">
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {attachments.map((a, i) => (
                <span key={i} className="flex items-center gap-1 text-[11px] bg-surface-2 px-2 py-1 rounded-full">
                  📎 {a.name}
                  <button onClick={() => setAttachments((s) => s.filter((_, j) => j !== i))} className="hover:text-danger">
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Message DataVora…"
            rows={1}
            className="w-full bg-transparent resize-none outline-none placeholder-muted"
            style={{ fontSize: `${fontSize}px` }}
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                hidden
                accept=".txt,.md,.html,.css,.js,.ts,.jsx,.tsx,.py,.rs,.go,.java,.cpp,.c,.sql,.yaml,.yml,.xml,.json,.toml,.sh,.bash,.env,.csv,.pdf"
                onChange={handleFiles}
              />
              <button
                title="Attach files"
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 hover:bg-surface-2 rounded"
              >
                <Paperclip size={16} />
              </button>
              <button title="Voice (coming soon)" disabled className="p-1.5 opacity-30">
                <Mic size={16} />
              </button>
              {input.length > 500 && (
                <span className={`text-[10px] ml-2 ${input.length > contextLimit * 4 ? 'text-danger' : 'text-muted'}`}>
                  {input.length} chars
                </span>
              )}
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || !canSend}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-accent hover:bg-accent-hover text-white disabled:opacity-40 disabled:cursor-not-allowed"
              title="Send (Enter)"
            >
              <ArrowUp size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* System Prompt modal */}
      {showSystemPrompt && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowSystemPrompt(false)}>
          <div className="bg-surface border border-border-soft rounded-xl p-5 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">System Prompt</h3>
              <button onClick={() => setShowSystemPrompt(false)}><X size={16} /></button>
            </div>
            <textarea
              defaultValue={activeConversation.systemPrompt || ''}
              rows={6}
              className="w-full bg-app-bg border border-border-soft rounded p-2 font-mono text-sm"
              onBlur={async (e) => {
                const conv = { ...activeConversation, systemPrompt: e.target.value, updatedAt: Date.now() };
                const { db: dbMod } = await import('../utils/database');
                await dbMod.saveConversation(conv);
                useChatStore.setState((s) => ({
                  conversations: s.conversations.map((c) => (c.id === conv.id ? conv : c)),
                }));
              }}
            />
            <p className="text-[11px] text-muted mt-2">Applied at the start of every conversation turn.</p>
            <div className="text-right mt-3">
              <button onClick={() => { setShowSystemPrompt(false); onOpenSettings?.(); }} className="text-xs text-accent underline">
                Edit global default in Settings →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
