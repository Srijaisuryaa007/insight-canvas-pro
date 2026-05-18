import { useMemo } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useSettingsStore } from '../stores/settingsStore';
import type { FileAttachment } from '../types';

export function useConversation() {
  const conversations = useChatStore((s) => s.conversations);
  const activeId = useChatStore((s) => s.activeConversationId);
  const messagesMap = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const abortStreaming = useChatStore((s) => s.abortStreaming);
  const clearMessages = useChatStore((s) => s.clearMessages);
  const editLastUserMessage = useChatStore((s) => s.editLastUserMessage);
  const createConversation = useChatStore((s) => s.createConversation);

  const settings = useSettingsStore();

  const activeConversation = useMemo(
    () => (activeId ? conversations.find((c) => c.id === activeId) ?? null : null),
    [activeId, conversations],
  );
  const messages = activeId ? messagesMap[activeId] ?? [] : [];
  const tokenCount = messages.reduce((n, m) => n + (m.tokens ?? 0), 0);
  const canSend = !!activeConversation && !!activeConversation.model && !isStreaming;

  return {
    activeConversation,
    messages,
    isStreaming,
    canSend,
    send: (content: string, attachments?: FileAttachment[]) => sendMessage(content, attachments),
    abort: abortStreaming,
    newChat: (model?: string) => createConversation(model ?? settings.defaultModel, settings.systemPrompt || undefined),
    clearMessages,
    editLastUserMessage,
    tokenCount,
    contextUsed: tokenCount,
    contextLimit: settings.contextWindow,
  };
}
