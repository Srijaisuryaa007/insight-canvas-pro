import { create } from "zustand";
import type { OllamaModel } from "@/types";
import { ollamaAPI } from "@/utils/ollama";

interface ModelState {
  installed: OllamaModel[];
  ollamaRunning: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

export const useModelStore = create<ModelState>((set) => ({
  installed: [],
  ollamaRunning: false,
  loading: false,
  refresh: async () => {
    set({ loading: true });
    const ollamaRunning = await ollamaAPI.isRunning();
    let installed: OllamaModel[] = [];
    if (ollamaRunning) {
      try { installed = await ollamaAPI.getModels(); } catch {}
    }
    set({ installed, ollamaRunning, loading: false });
  },
}));
