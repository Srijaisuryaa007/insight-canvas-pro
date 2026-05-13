import { useEffect, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { ChatWindow } from "./components/ChatWindow";
import { ModelManager } from "./components/ModelManager";
import { SettingsPage } from "./components/SettingsPage";
import { useChatStore } from "./stores/chatStore";
import { useModelStore } from "./stores/modelStore";
import { useSettingsStore } from "./stores/settingsStore";

type View = "chat" | "models" | "settings";

export default function App() {
  const [view, setView] = useState<View>("chat");
  const refreshModels = useModelStore((s) => s.refresh);
  const newConversation = useChatStore((s) => s.newConversation);
  const defaultModel = useSettingsStore((s) => s.defaultModel);
  const sysPrompt = useSettingsStore((s) => s.systemPrompt);
  const fontSize = useSettingsStore((s) => s.fontSize);

  useEffect(() => { refreshModels(); }, [refreshModels]);

  useEffect(() => {
    document.documentElement.style.fontSize = fontSize + "px";
  }, [fontSize]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key === "n") { e.preventDefault(); newConversation(defaultModel, sysPrompt).then(() => setView("chat")); }
      if (meta && e.key === ",") { e.preventDefault(); setView("settings"); }
      if (meta && e.key === "m") { e.preventDefault(); setView("models"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [defaultModel, sysPrompt, newConversation]);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar view={view} onView={setView} />
      <main className="flex-1 min-w-0">
        {view === "chat" && <ChatWindow />}
        {view === "models" && <ModelManager onChat={() => setView("chat")} />}
        {view === "settings" && <SettingsPage />}
      </main>
    </div>
  );
}
