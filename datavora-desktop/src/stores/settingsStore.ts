import { create } from "zustand";
import type { Settings } from "@/types";

const KEY = "datavora_settings";
const defaults: Settings = {
  defaultModel: "llama3.2:3b",
  temperature: 0.7,
  contextWindow: 4096,
  systemPrompt: "You are DataVora, a helpful local AI assistant. Be concise and accurate.",
  fontSize: 14,
  density: "comfortable",
  sidebarWidth: 260,
};

const load = (): Settings => {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; }
  catch { return defaults; }
};

interface SettingsState extends Settings {
  set: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
  reset: () => void;
}

export const useSettingsStore = create<SettingsState>((setFn) => ({
  ...load(),
  set: (k, v) => setFn((s) => {
    const next = { ...s, [k]: v };
    localStorage.setItem(KEY, JSON.stringify({
      defaultModel: next.defaultModel, temperature: next.temperature,
      contextWindow: next.contextWindow, systemPrompt: next.systemPrompt,
      fontSize: next.fontSize, density: next.density, sidebarWidth: next.sidebarWidth,
    }));
    return next;
  }),
  reset: () => { localStorage.removeItem(KEY); setFn(defaults); },
}));
