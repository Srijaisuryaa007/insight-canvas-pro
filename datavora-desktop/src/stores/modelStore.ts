// Ollama model state — install/pull/delete + live VRAM status
import { create } from 'zustand';
import type { OllamaModel, PullProgress, LoadedModel } from '../types';
import { ollamaAPI } from '../utils/ollama';

interface PullState extends PullProgress {
  speed?: string;
  eta?: string;
  startedAt: number;
  prevCompleted: number;
  prevTime: number;
}

interface ModelState {
  installedModels: OllamaModel[];
  loadedModels: LoadedModel[];
  ollamaRunning: boolean;
  pullingModels: Record<string, PullState>;
  pullControllers: Record<string, AbortController>;
  checkInterval: number | null;

  checkOllama: () => Promise<void>;
  loadModels: () => Promise<void>;
  loadSystemInfo: () => Promise<void>;
  refresh: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
  pullModel: (name: string) => Promise<void>;
  cancelPull: (name: string) => void;
  deleteModel: (name: string) => Promise<void>;
}

function formatSpeed(bytesPerSec: number): string {
  if (!isFinite(bytesPerSec) || bytesPerSec <= 0) return '—';
  if (bytesPerSec > 1e9) return (bytesPerSec / 1e9).toFixed(1) + ' GB/s';
  if (bytesPerSec > 1e6) return (bytesPerSec / 1e6).toFixed(1) + ' MB/s';
  if (bytesPerSec > 1e3) return (bytesPerSec / 1e3).toFixed(1) + ' KB/s';
  return Math.round(bytesPerSec) + ' B/s';
}
function formatEta(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return '';
  const s = Math.round(seconds);
  if (s < 60) return `${s}s remaining`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r}s remaining`;
}

export const useModelStore = create<ModelState>((set, get) => ({
  installedModels: [],
  loadedModels: [],
  ollamaRunning: false,
  pullingModels: {},
  pullControllers: {},
  checkInterval: null,

  checkOllama: async () => {
    const running = await ollamaAPI.isRunning();
    set({ ollamaRunning: running });
    if (running) {
      await Promise.all([get().loadModels(), get().loadSystemInfo()]);
    } else {
      set({ installedModels: [], loadedModels: [] });
    }
  },

  loadModels: async () => {
    const m = await ollamaAPI.getModels();
    set({ installedModels: m });
  },

  loadSystemInfo: async () => {
    const info = await ollamaAPI.getSystemInfo();
    set({ loadedModels: info.models });
  },

  refresh: async () => {
    await get().checkOllama();
  },

  startPolling: () => {
    if (get().checkInterval != null) return;
    const id = window.setInterval(() => {
      void get().checkOllama();
    }, 10_000);
    set({ checkInterval: id });
  },

  stopPolling: () => {
    const id = get().checkInterval;
    if (id != null) {
      clearInterval(id);
      set({ checkInterval: null });
    }
  },

  pullModel: async (name) => {
    const controller = new AbortController();
    set((s) => ({
      pullControllers: { ...s.pullControllers, [name]: controller },
      pullingModels: {
        ...s.pullingModels,
        [name]: {
          status: 'starting',
          total: 0,
          completed: 0,
          startedAt: Date.now(),
          prevCompleted: 0,
          prevTime: Date.now(),
        },
      },
    }));
    try {
      for await (const p of ollamaAPI.pullModel(name, controller.signal)) {
        const prev = get().pullingModels[name];
        if (!prev) break;
        const now = Date.now();
        const completed = p.completed ?? prev.completed ?? 0;
        const total = p.total ?? prev.total ?? 0;
        const dt = (now - prev.prevTime) / 1000;
        let speed = prev.speed;
        let eta = prev.eta;
        if (dt > 0.5 && completed > prev.prevCompleted) {
          const bps = (completed - prev.prevCompleted) / dt;
          speed = formatSpeed(bps);
          eta = total > completed && bps > 0 ? formatEta((total - completed) / bps) : '';
        }
        set((s) => ({
          pullingModels: {
            ...s.pullingModels,
            [name]: {
              ...prev,
              status: p.status ?? prev.status,
              total,
              completed,
              speed,
              eta,
              prevCompleted: dt > 0.5 ? completed : prev.prevCompleted,
              prevTime: dt > 0.5 ? now : prev.prevTime,
            },
          },
        }));
      }
      await get().loadModels();
    } catch (e: unknown) {
      if ((e as Error)?.name !== 'AbortError') console.error('Pull failed:', e);
    } finally {
      set((s) => {
        const { [name]: _p, ...restPull } = s.pullingModels;
        const { [name]: _c, ...restCtl } = s.pullControllers;
        void _p; void _c;
        return { pullingModels: restPull, pullControllers: restCtl };
      });
    }
  },

  cancelPull: (name) => {
    const ctl = get().pullControllers[name];
    if (ctl) ctl.abort();
  },

  deleteModel: async (name) => {
    await ollamaAPI.deleteModel(name);
    await get().loadModels();
  },
}));
