// Ollama HTTP API client — streaming chat, model management, system info
import type { OllamaModel, PullProgress, SystemInfo, Message } from '../types';

const BASE = 'http://localhost:11434';

export interface ChatOptions {
  temperature?: number;
  num_ctx?: number;
  num_thread?: number;
}

export const ollamaAPI = {
  async isRunning(): Promise<boolean> {
    try {
      const r = await fetch(`${BASE}/api/tags`, { signal: AbortSignal.timeout(2000) });
      return r.ok;
    } catch {
      return false;
    }
  },

  async getModels(): Promise<OllamaModel[]> {
    try {
      const r = await fetch(`${BASE}/api/tags`);
      if (!r.ok) return [];
      const data = await r.json();
      const list = (data.models ?? []) as Array<Record<string, unknown>>;
      return list.map((m) => {
        const details = (m.details ?? {}) as Record<string, string>;
        return {
          name: String(m.name ?? ''),
          model: String(m.model ?? m.name ?? ''),
          size: Number(m.size ?? 0),
          digest: String(m.digest ?? ''),
          modifiedAt: String(m.modified_at ?? ''),
          details: {
            parameterSize: details.parameter_size ?? '—',
            quantizationLevel: details.quantization_level ?? '—',
            family: details.family ?? '—',
            contextLength: details.context_length ? Number(details.context_length) : undefined,
          },
        };
      });
    } catch {
      return [];
    }
  },

  async *streamChat(
    model: string,
    messages: Pick<Message, 'role' | 'content'>[],
    signal?: AbortSignal,
    options: ChatOptions = {},
  ): AsyncGenerator<string> {
    let response: Response;
    try {
      response = await fetch(`${BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
          model,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          stream: true,
          options: {
            temperature: options.temperature ?? 0.7,
            num_ctx: options.num_ctx ?? 4096,
            ...(options.num_thread ? { num_thread: options.num_thread } : {}),
          },
        }),
      });
    } catch (e: unknown) {
      if ((e as Error)?.name === 'AbortError') return;
      throw new Error(`Cannot reach Ollama at ${BASE}. Is it running? (${(e as Error).message})`);
    }

    if (!response.ok || !response.body) {
      throw new Error(`Ollama returned ${response.status}: ${await response.text().catch(() => '')}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const data = JSON.parse(trimmed);
            if (data.message?.content) yield data.message.content as string;
            if (data.done) return;
          } catch {
            /* skip malformed line */
          }
        }
      }
    } catch (e: unknown) {
      if ((e as Error)?.name === 'AbortError') return;
      throw e;
    }
  },

  async *pullModel(name: string, signal?: AbortSignal): AsyncGenerator<PullProgress> {
    const response = await fetch(`${BASE}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({ name, stream: true }),
    });
    if (!response.ok || !response.body) {
      throw new Error(`Pull failed: ${response.status}`);
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const t = line.trim();
        if (!t) continue;
        try {
          yield JSON.parse(t) as PullProgress;
        } catch {
          /* skip */
        }
      }
    }
  },

  async deleteModel(name: string): Promise<void> {
    const r = await fetch(`${BASE}/api/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!r.ok) throw new Error(`Delete failed: ${r.status}`);
  },

  async getSystemInfo(): Promise<SystemInfo> {
    try {
      const r = await fetch(`${BASE}/api/ps`);
      if (!r.ok) return { models: [] };
      const data = await r.json();
      const models = (data.models ?? []) as Array<Record<string, unknown>>;
      return {
        models: models.map((m) => ({
          name: String(m.name ?? ''),
          size: Number(m.size ?? 0),
          sizeVram: Number(m.size_vram ?? 0),
          expiresAt: String(m.expires_at ?? ''),
        })),
      };
    } catch {
      return { models: [] };
    }
  },

  async generateTitle(model: string, firstMessage: string): Promise<string> {
    try {
      const r = await fetch(`${BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          stream: false,
          messages: [
            {
              role: 'user',
              content: `Generate a short 4-6 word title for a conversation that starts with: "${firstMessage.slice(0, 100)}"\nReply with ONLY the title, no quotes, no punctuation.`,
            },
          ],
          options: { temperature: 0.3 },
        }),
      });
      if (!r.ok) throw new Error();
      const data = await r.json();
      const t = String(data?.message?.content ?? '').trim().replace(/^["']|["']$/g, '');
      return t || firstMessage.slice(0, 40);
    } catch {
      return firstMessage.slice(0, 40);
    }
  },
};
