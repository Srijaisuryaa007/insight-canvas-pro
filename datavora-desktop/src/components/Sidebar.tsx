import { useEffect, useMemo, useState } from "react";
import { Plus, Search, MessageSquare, Trash2, Settings as SettingsIcon, Boxes } from "lucide-react";
import clsx from "clsx";
import { formatDistanceToNow } from "date-fns";
import { useChatStore } from "@/stores/chatStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { SystemStatus } from "./SystemStatus";

interface Props {
  view: "chat" | "models" | "settings";
  onView: (v: "chat" | "models" | "settings") => void;
}

export function Sidebar({ view, onView }: Props) {
  const { conversations, activeId, loadAll, selectConversation, newConversation, deleteConversation } = useChatStore();
  const defaultModel = useSettingsStore((s) => s.defaultModel);
  const sysPrompt = useSettingsStore((s) => s.systemPrompt);
  const sidebarWidth = useSettingsStore((s) => s.sidebarWidth);
  const [q, setQ] = useState("");

  useEffect(() => { loadAll(); }, [loadAll]);

  const filtered = useMemo(
    () => conversations.filter((c) => c.title.toLowerCase().includes(q.toLowerCase())),
    [conversations, q]
  );

  const groups = useMemo(() => {
    const today: typeof filtered = [], yesterday: typeof filtered = [], week: typeof filtered = [], older: typeof filtered = [];
    const now = Date.now();
    const day = 86400000;
    filtered.forEach((c) => {
      const age = now - c.updatedAt;
      if (age < day) today.push(c);
      else if (age < 2 * day) yesterday.push(c);
      else if (age < 7 * day) week.push(c);
      else older.push(c);
    });
    return { today, yesterday, week, older };
  }, [filtered]);

  return (
    <aside className="flex flex-col bg-surface border-r border-border" style={{ width: sidebarWidth }}>
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center text-white font-bold">D</div>
          <div className="flex-1">
            <div className="text-sm font-semibold">DataVora</div>
            <div className="text-[10px] text-muted">Desktop</div>
          </div>
        </div>
        <button
          onClick={async () => { await newConversation(defaultModel, sysPrompt); onView("chat"); }}
          className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accentHover text-white text-sm font-medium py-2 rounded-lg transition"
        >
          <Plus className="h-4 w-4" /> New chat
        </button>
      </div>

      <div className="px-3 py-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search conversations…"
            className="w-full bg-elevated border border-border rounded-md pl-8 pr-2 py-1.5 text-xs placeholder:text-muted focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {(["today", "yesterday", "week", "older"] as const).map((g) => {
          const list = groups[g];
          if (!list.length) return null;
          const labels = { today: "Today", yesterday: "Yesterday", week: "Last 7 days", older: "Older" };
          return (
            <div key={g} className="mb-3">
              <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted font-medium">{labels[g]}</div>
              {list.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { selectConversation(c.id); onView("chat"); }}
                  className={clsx(
                    "group w-full text-left px-3 py-2 flex items-start gap-2 hover:bg-elevated transition",
                    activeId === c.id && view === "chat" && "bg-elevated border-l-2 border-accent"
                  )}
                >
                  <MessageSquare className="h-3.5 w-3.5 mt-0.5 text-muted shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-text truncate">{c.title}</div>
                    <div className="text-[10px] text-muted mt-0.5">{formatDistanceToNow(c.updatedAt, { addSuffix: true })} · {c.model}</div>
                  </div>
                  <span
                    onClick={(e) => { e.stopPropagation(); if (confirm("Delete this conversation?")) deleteConversation(c.id); }}
                    className="opacity-0 group-hover:opacity-100 text-muted hover:text-rose-400 transition"
                  >
                    <Trash2 className="h-3 w-3" />
                  </span>
                </button>
              ))}
            </div>
          );
        })}
        {!filtered.length && (
          <div className="px-3 py-8 text-center text-xs text-muted">No conversations yet</div>
        )}
      </div>

      <div className="border-t border-border">
        <button
          onClick={() => onView("models")}
          className={clsx("w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-elevated transition", view === "models" && "bg-elevated text-accent")}
        >
          <Boxes className="h-3.5 w-3.5" /> Models
        </button>
        <button
          onClick={() => onView("settings")}
          className={clsx("w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-elevated transition", view === "settings" && "bg-elevated text-accent")}
        >
          <SettingsIcon className="h-3.5 w-3.5" /> Settings
        </button>
        <SystemStatus />
      </div>
    </aside>
  );
}
