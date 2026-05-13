import { useEffect, useRef, useState } from "react";
import { Send, Square, Paperclip, Trash2 } from "lucide-react";
import { useChatStore } from "@/stores/chatStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useModelStore } from "@/stores/modelStore";
import { ollamaAPI } from "@/utils/ollama";
import { MessageBubble } from "./MessageBubble";
import type { Message } from "@/types";

export function ChatWindow() {
  const {
    activeId, messages, conversations, isStreaming, abortController,
    appendMessage, patchLastAssistant, setStreaming, setAbortController, abortStream,
    newConversation,
  } = useChatStore();
  const { defaultModel, systemPrompt, temperature, contextWindow } = useSettingsStore();
  const { ollamaRunning, installed } = useModelStore();

  const [input, setInput] = useState("");
  const [files, setFiles] = useState<{ name: string; content: string }[]>([]);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const conv = conversations.find((c) => c.id === activeId) ?? null;
  const model = conv?.model ?? defaultModel;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isStreaming]);

  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = "auto";
      taRef.current.style.height = Math.min(200, taRef.current.scrollHeight) + "px";
    }
  }, [input]);

  const send = async () => {
    if (!input.trim() && !files.length) return;
    if (isStreaming) return;
    if (!ollamaRunning) { alert("Ollama is not running. Start it with `ollama serve`."); return; }
    if (!installed.length) { alert("No models installed. Open the Models page to download one."); return; }

    let convId = activeId;
    if (!convId) convId = await newConversation(model, systemPrompt);

    const fileBlock = files.length
      ? files.map((f) => `### File: ${f.name}\n\n\`\`\`\n${f.content}\n\`\`\``).join("\n\n") + "\n\n"
      : "";

    const userMsg: Message = {
      id: crypto.randomUUID(),
      conversationId: convId!,
      role: "user",
      content: fileBlock + input,
      createdAt: Date.now(),
    };
    await appendMessage(userMsg);
    setInput("");
    setFiles([]);

    const sysMsg: Message[] = systemPrompt
      ? [{ id: "sys", conversationId: convId!, role: "system", content: systemPrompt, createdAt: 0 }]
      : [];

    setStreaming(true);
    const controller = new AbortController();
    setAbortController(controller);
    let buffer = "";
    try {
      patchLastAssistant("");
      for await (const chunk of ollamaAPI.streamChat(
        model,
        [...sysMsg, ...messages, userMsg],
        { temperature, numCtx: contextWindow, signal: controller.signal }
      )) {
        buffer += chunk;
        patchLastAssistant(buffer);
      }
      const finalMsg: Message = {
        id: crypto.randomUUID(),
        conversationId: convId!,
        role: "assistant",
        content: buffer,
        createdAt: Date.now(),
      };
      await appendMessage(finalMsg);
      useChatStore.setState((s) => {
        const msgs = [...s.messages];
        const tail = msgs[msgs.length - 1];
        const prev = msgs[msgs.length - 2];
        if (tail && prev && tail.role === "assistant" && prev.role === "assistant" && prev.content === tail.content) {
          msgs.splice(msgs.length - 2, 1);
        }
        return { messages: msgs };
      });
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        patchLastAssistant(buffer + "\n\n_⚠ Error: " + (e as Error).message + "_");
      }
    } finally {
      setStreaming(false);
      setAbortController(null);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
    if (e.key === "Escape" && isStreaming) abortStream();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    for (const f of list) {
      if (f.size > 1024 * 200) { alert(`${f.name} is too large (>200KB).`); continue; }
      const content = await f.text();
      setFiles((s) => [...s, { name: f.name, content }]);
    }
    e.target.value = "";
  };

  return (
    <div className="flex flex-col h-full bg-bg">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border">
        <div>
          <div className="text-sm font-medium">{conv?.title ?? "New conversation"}</div>
          <div className="text-[11px] text-muted">Model: {model} · ctx {contextWindow}</div>
        </div>
        <button
          onClick={() => useChatStore.setState({ messages: [] })}
          className="text-[11px] text-muted hover:text-text inline-flex items-center gap-1"
          title="Clear visible messages (history kept)"
        >
          <Trash2 className="h-3 w-3" /> Clear view
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <div className="h-14 w-14 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center mb-4">
              <span className="text-2xl">✦</span>
            </div>
            <h2 className="text-xl font-semibold mb-2">How can I help today?</h2>
            <p className="text-sm text-muted max-w-md">Local AI, fully private. Pick a model in the sidebar and start typing — nothing leaves your machine.</p>
          </div>
        ) : (
          messages.map((m, i) => (
            <MessageBubble
              key={m.id}
              message={m}
              streaming={isStreaming && i === messages.length - 1 && m.role === "assistant"}
            />
          ))
        )}
        {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="px-6 py-3 flex items-center gap-2 text-xs text-muted">
            <span className="dot inline-block h-1.5 w-1.5 rounded-full bg-accent" />
            <span className="dot inline-block h-1.5 w-1.5 rounded-full bg-accent" />
            <span className="dot inline-block h-1.5 w-1.5 rounded-full bg-accent" />
            <span>Model is thinking…</span>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border">
        {files.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {files.map((f, i) => (
              <span key={i} className="text-[11px] bg-elevated border border-border rounded px-2 py-0.5 inline-flex items-center gap-1">
                {f.name}
                <button onClick={() => setFiles((s) => s.filter((_, j) => j !== i))} className="text-muted hover:text-rose-400">×</button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2 bg-elevated border border-border rounded-2xl p-2 focus-within:border-accent/60 transition">
          <label className="cursor-pointer p-2 text-muted hover:text-text" title="Attach file">
            <Paperclip className="h-4 w-4" />
            <input type="file" multiple accept=".txt,.md,.csv,.json,.js,.ts,.tsx,.jsx,.py,.html,.css,.yaml,.yml,.xml,.sql,.rs,.go" onChange={onFile} className="hidden" />
          </label>
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Message DataVora…"
            rows={1}
            className="flex-1 bg-transparent resize-none text-sm placeholder:text-muted focus:outline-none py-2 max-h-[200px]"
          />
          {isStreaming ? (
            <button onClick={abortStream} className="bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 p-2 rounded-lg transition" title="Stop (Esc)">
              <Square className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={send} disabled={!input.trim() && !files.length} className="bg-accent hover:bg-accentHover disabled:opacity-40 disabled:cursor-not-allowed text-white p-2 rounded-lg transition" title="Send (Enter)">
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="mt-1.5 text-[10px] text-muted text-center">
          Shift + Enter for newline · Esc to stop · {input.length > 1000 ? `${input.length} chars` : "Local-first · Private"}
        </div>
      </div>
    </div>
  );
}
