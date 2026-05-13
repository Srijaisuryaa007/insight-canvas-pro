import { create } from "zustand";
import type { Conversation, Message } from "@/types";
import { dbAPI } from "@/utils/database";

interface ChatState {
  conversations: Conversation[];
  activeId: string | null;
  messages: Message[];
  isStreaming: boolean;
  abortController: AbortController | null;

  loadAll: () => Promise<void>;
  newConversation: (model: string, systemPrompt?: string) => Promise<string>;
  selectConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  appendMessage: (m: Message) => Promise<void>;
  patchLastAssistant: (content: string) => void;
  setStreaming: (v: boolean) => void;
  setAbortController: (c: AbortController | null) => void;
  abortStream: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeId: null,
  messages: [],
  isStreaming: false,
  abortController: null,

  loadAll: async () => {
    const conversations = await dbAPI.listConversations();
    set({ conversations });
  },

  newConversation: async (model, systemPrompt) => {
    const id = crypto.randomUUID();
    const now = Date.now();
    const conv: Conversation = {
      id, title: "New conversation", model, systemPrompt,
      createdAt: now, updatedAt: now, messageCount: 0,
    };
    await dbAPI.createConversation(conv);
    set((s) => ({ conversations: [conv, ...s.conversations], activeId: id, messages: [] }));
    return id;
  },

  selectConversation: async (id) => {
    const messages = await dbAPI.listMessages(id);
    set({ activeId: id, messages });
  },

  deleteConversation: async (id) => {
    await dbAPI.deleteConversation(id);
    set((s) => {
      const conversations = s.conversations.filter((c) => c.id !== id);
      const isActive = s.activeId === id;
      return { conversations, activeId: isActive ? null : s.activeId, messages: isActive ? [] : s.messages };
    });
  },

  renameConversation: async (id, title) => {
    await dbAPI.updateConversation(id, { title, updatedAt: Date.now() });
    set((s) => ({ conversations: s.conversations.map((c) => (c.id === id ? { ...c, title } : c)) }));
  },

  appendMessage: async (m) => {
    await dbAPI.addMessage(m);
    set((s) => ({ messages: [...s.messages, m] }));
    const conv = get().conversations.find((c) => c.id === m.conversationId);
    if (conv) {
      const title = conv.messageCount === 0 && m.role === "user"
        ? m.content.slice(0, 60).replace(/\s+/g, " ").trim()
        : conv.title;
      await dbAPI.updateConversation(m.conversationId, {
        title, updatedAt: Date.now(), messageCount: conv.messageCount + 1,
      });
      set((s) => ({
        conversations: s.conversations.map((c) =>
          c.id === m.conversationId
            ? { ...c, title, updatedAt: Date.now(), messageCount: c.messageCount + 1 }
            : c
        ),
      }));
    }
  },

  patchLastAssistant: (content) => {
    set((s) => {
      const messages = [...s.messages];
      const last = messages[messages.length - 1];
      if (last && last.role === "assistant") {
        messages[messages.length - 1] = { ...last, content };
      } else {
        messages.push({
          id: crypto.randomUUID(),
          conversationId: s.activeId!,
          role: "assistant",
          content,
          createdAt: Date.now(),
        });
      }
      return { messages };
    });
  },

  setStreaming: (v) => set({ isStreaming: v }),
  setAbortController: (c) => set({ abortController: c }),
  abortStream: () => {
    const c = get().abortController;
    if (c) c.abort();
    set({ abortController: null, isStreaming: false });
  },
}));
