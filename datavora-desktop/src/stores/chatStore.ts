// Chat store — conversations, messages, streaming
import { create } from 'zustand';
import { startOfDay, subDays } from 'date-fns';
import type { Conversation, Message, FileAttachment } from '../types';
import { db } from '../utils/database';
import { ollamaAPI } from '../utils/ollama';
import { formatFileForPrompt } from '../utils/fileParser';
import { useSettingsStore } from './settingsStore';

interface GroupedConversations {
  today: Conversation[];
  yesterday: Conversation[];
  week: Conversation[];
  older: Conversation[];
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>;
  isStreaming: boolean;
  streamingConversationId: string | null;
  searchQuery: string;
  abortController: AbortController | null;

  loadConversations: () => Promise<void>;
  createConversation: (model: string, systemPrompt?: string) => Promise<string>;
  newConversation: (model: string, systemPrompt?: string) => Promise<string>;
  setActiveConversation: (id: string | null) => Promise<void>;
  sendMessage: (content: string, attachments?: FileAttachment[]) => Promise<void>;
  abortStreaming: () => void;
  deleteConversation: (id: string) => Promise<void>;
  updateTitle: (id: string, title: string) => Promise<void>;
  setSearchQuery: (q: string) => void;
  getFilteredConversations: () => Conversation[];
  getGroupedConversations: () => GroupedConversations;
  clearMessages: () => Promise<void>;
  editLastUserMessage: (newContent: string) => Promise<void>;
  exportConversations: () => Promise<void>;
  importConversations: (file: File) => Promise<number>;
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Rough estimate: 1 token ≈ 4 chars
function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  isStreaming: false,
  streamingConversationId: null,
  searchQuery: '',
  abortController: null,

  loadConversations: async () => {
    const c = await db.getConversations();
    set({ conversations: c });
  },

  createConversation: async (model, systemPrompt) => {
    const now = Date.now();
    const conv: Conversation = {
      id: uuid(),
      title: 'New Conversation',
      model,
      systemPrompt,
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
    };
    await db.saveConversation(conv);
    set((s) => ({
      conversations: [conv, ...s.conversations],
      activeConversationId: conv.id,
      messages: { ...s.messages, [conv.id]: [] },
    }));
    return conv.id;
  },

  newConversation: async (model, systemPrompt) => get().createConversation(model, systemPrompt),

  setActiveConversation: async (id) => {
    if (!id) {
      set({ activeConversationId: null });
      return;
    }
    if (!get().messages[id]) {
      const msgs = await db.getMessages(id);
      set((s) => ({ messages: { ...s.messages, [id]: msgs } }));
    }
    set({ activeConversationId: id });
  },

  sendMessage: async (content, attachments) => {
    const state = get();
    const convId = state.activeConversationId;
    if (!convId || state.isStreaming) return;
    const conv = state.conversations.find((c) => c.id === convId);
    if (!conv) return;

    const settings = useSettingsStore.getState();
    const now = Date.now();

    // 1. user message
    const promptContent = attachments && attachments.length
      ? `${formatFileForPrompt(attachments)}\n\n${content}`
      : content;

    const userMsg: Message = {
      id: uuid(),
      conversationId: convId,
      role: 'user',
      content,
      tokens: estimateTokens(promptContent),
      createdAt: now,
      attachments: attachments && attachments.length ? attachments : undefined,
    };
    await db.saveMessage(userMsg);
    set((s) => ({
      messages: { ...s.messages, [convId]: [...(s.messages[convId] ?? []), userMsg] },
    }));

    // 2. assistant placeholder (streaming)
    const assistantMsg: Message = {
      id: uuid(),
      conversationId: convId,
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
      isStreaming: true,
    };
    set((s) => ({
      messages: { ...s.messages, [convId]: [...s.messages[convId], assistantMsg] },
      isStreaming: true,
      streamingConversationId: convId,
    }));

    const controller = new AbortController();
    set({ abortController: controller });

    // Build history for the model
    const history = get().messages[convId] ?? [];
    const apiMessages: Array<Pick<Message, 'role' | 'content'>> = [];
    if (conv.systemPrompt) apiMessages.push({ role: 'system', content: conv.systemPrompt });
    else if (settings.systemPrompt) apiMessages.push({ role: 'system', content: settings.systemPrompt });
    for (const m of history) {
      if (m.id === assistantMsg.id) continue;
      // Use prompt-prepared content for the just-sent user msg
      if (m.id === userMsg.id) apiMessages.push({ role: 'user', content: promptContent });
      else apiMessages.push({ role: m.role, content: m.content });
    }

    let accumulated = '';
    try {
      for await (const delta of ollamaAPI.streamChat(conv.model, apiMessages, controller.signal, {
        temperature: settings.temperature,
        num_ctx: settings.contextWindow,
        num_thread: settings.gpuMode === 'cpu' ? settings.threads : undefined,
      })) {
        accumulated += delta;
        set((s) => {
          const list = s.messages[convId] ?? [];
          const idx = list.findIndex((m) => m.id === assistantMsg.id);
          if (idx < 0) return s;
          const next = [...list];
          next[idx] = { ...next[idx], content: accumulated };
          return { messages: { ...s.messages, [convId]: next } };
        });
      }
    } catch (e: unknown) {
      const errText = (e as Error)?.message ?? String(e);
      accumulated += `\n\n_[Error: ${errText}]_`;
      set((s) => {
        const list = s.messages[convId] ?? [];
        const idx = list.findIndex((m) => m.id === assistantMsg.id);
        if (idx < 0) return s;
        const next = [...list];
        next[idx] = { ...next[idx], content: accumulated };
        return { messages: { ...s.messages, [convId]: next } };
      });
    } finally {
      const final: Message = {
        ...assistantMsg,
        content: accumulated,
        tokens: estimateTokens(accumulated),
        isStreaming: false,
      };
      await db.saveMessage(final);
      set((s) => {
        const list = s.messages[convId] ?? [];
        const next = list.map((m) => (m.id === assistantMsg.id ? final : m));
        return {
          messages: { ...s.messages, [convId]: next },
          isStreaming: false,
          streamingConversationId: null,
          abortController: null,
        };
      });

      // Update conv metadata + title
      const updatedConv: Conversation = {
        ...conv,
        updatedAt: Date.now(),
        messageCount: (get().messages[convId] ?? []).length,
        lastMessage: accumulated.slice(0, 120),
      };

      // Generate title if first exchange
      const isFirst = conv.title === 'New Conversation' && (get().messages[convId] ?? []).filter((m) => m.role === 'user').length === 1;
      if (isFirst) {
        try {
          const title = await ollamaAPI.generateTitle(conv.model, content);
          updatedConv.title = title;
        } catch {
          updatedConv.title = content.slice(0, 40);
        }
      }
      await db.saveConversation(updatedConv);
      set((s) => ({
        conversations: s.conversations.map((c) => (c.id === convId ? updatedConv : c)),
      }));
    }
  },

  abortStreaming: () => {
    const c = get().abortController;
    if (c) c.abort();
    set({ isStreaming: false, streamingConversationId: null, abortController: null });
  },

  deleteConversation: async (id) => {
    await db.deleteConversation(id);
    set((s) => {
      const { [id]: _, ...rest } = s.messages;
      void _;
      return {
        conversations: s.conversations.filter((c) => c.id !== id),
        messages: rest,
        activeConversationId: s.activeConversationId === id ? null : s.activeConversationId,
      };
    });
  },

  updateTitle: async (id, title) => {
    await db.updateConversationTitle(id, title);
    set((s) => ({
      conversations: s.conversations.map((c) => (c.id === id ? { ...c, title, updatedAt: Date.now() } : c)),
    }));
  },

  setSearchQuery: (q) => set({ searchQuery: q }),

  getFilteredConversations: () => {
    const { conversations, searchQuery } = get();
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(
      (c) => c.title.toLowerCase().includes(q) || (c.lastMessage ?? '').toLowerCase().includes(q),
    );
  },

  getGroupedConversations: () => {
    const list = get().getFilteredConversations();
    const now = new Date();
    const today = startOfDay(now).getTime();
    const yest = startOfDay(subDays(now, 1)).getTime();
    const weekAgo = startOfDay(subDays(now, 7)).getTime();
    const groups: GroupedConversations = { today: [], yesterday: [], week: [], older: [] };
    for (const c of list) {
      if (c.updatedAt >= today) groups.today.push(c);
      else if (c.updatedAt >= yest) groups.yesterday.push(c);
      else if (c.updatedAt >= weekAgo) groups.week.push(c);
      else groups.older.push(c);
    }
    return groups;
  },

  clearMessages: async () => {
    const id = get().activeConversationId;
    if (!id) return;
    await db.deleteMessages(id);
    set((s) => ({ messages: { ...s.messages, [id]: [] } }));
  },

  editLastUserMessage: async (newContent) => {
    const id = get().activeConversationId;
    if (!id) return;
    const list = get().messages[id] ?? [];
    // Find last user msg
    let lastUserIdx = -1;
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].role === 'user') {
        lastUserIdx = i;
        break;
      }
    }
    if (lastUserIdx < 0) return;
    const trimmed = list.slice(0, lastUserIdx);
    // Persist trim
    await db.deleteMessages(id);
    for (const m of trimmed) await db.saveMessage(m);
    set((s) => ({ messages: { ...s.messages, [id]: trimmed } }));
    await get().sendMessage(newContent);
  },

  exportConversations: async () => {
    const json = await db.exportAllConversations();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `datavora-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  importConversations: async (file) => {
    const text = await file.text();
    const n = await db.importConversations(text);
    await get().loadConversations();
    return n;
  },
}));
