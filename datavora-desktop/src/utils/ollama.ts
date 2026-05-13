import type { Message, OllamaModel, PullProgress, SystemInfo } from "@/types";

const OLLAMA_BASE = "http://localhost:11434";

export const ollamaAPI = {
  async isRunning(): Promise<boolean> {
    try {
      const r = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(2000) });
      return r.ok;
    } catch {
      return false;
    }
  },

  async getModels(): Promise<OllamaModel[]> {
    const r = await fetch(`${OLLAMA_BASE}/api/tags`);
    if (!r.ok) throw new Error("Failed to fetch models");
    const data = await r.json();
    return data.models || [];
  },

  async *streamChat(
    model: string,
    messages: Message[],
    opts: { temperature?: number; numCtx?: number; signal?: AbortSignal } = {}
  ): AsyncGenerator<string> {
    const r = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: true,
        options: {
          temperature: opts.temperature ?? 0.7,
          num_ctx: opts.numCtx ?? 4096,
        },
      }),
      signal: opts.signal,
    });

    if (!r.ok || !r.body) throw new Error(`Ollama returned ${r.status}`);
    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line) continue;
        try {
          const data = JSON.parse(line);
          if (data.message?.content) yield data.message.content as string;
        } catch {
          // partial JSON — re-buffer
          buffer = line + "\n" + buffer;
          break;
        }
      }
    }
  },

  async *pullModel(name: string, signal?: AbortSignal): AsyncGenerator<PullProgress> {
    const r = await fetch(`${OLLAMA_BASE}/api/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, stream: true }),
      signal,
    });
    if (!r.ok || !r.body) throw new Error(`Pull failed: ${r.status}`);
    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          yield JSON.parse(line) as PullProgress;
        } catch {}
      }
    }
  },

  async deleteModel(name: string): Promise<void> {
    await fetch(`${OLLAMA_BASE}/api/delete`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  },

  async getSystemInfo(): Promise<SystemInfo> {
    try {
      const r = await fetch(`${OLLAMA_BASE}/api/ps`);
      return await r.json();
    } catch {
      return { models: [] };
    }
  },
};

export function formatBytes(b: number): string {
  if (b >= 1e9) return (b / 1e9).toFixed(2) + " GB";
  if (b >= 1e6) return (b / 1e6).toFixed(0) + " MB";
  if (b >= 1e3) return (b / 1e3).toFixed(0) + " KB";
  return b + " B";
}
