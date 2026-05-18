import { useModelStore } from '../stores/modelStore';
import { useSettingsStore } from '../stores/settingsStore';

export function formatModelSize(bytes: number): string {
  if (!bytes) return '—';
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' GB';
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(0) + ' MB';
  if (bytes >= 1e3) return (bytes / 1e3).toFixed(0) + ' KB';
  return bytes + ' B';
}

const EMOJI_MAP: Array<[RegExp, string]> = [
  [/llama/i, '🦙'],
  [/mistral/i, '🌪️'],
  [/codellama|deepseek-coder|coder/i, '💻'],
  [/phi/i, 'φ'],
  [/gemma/i, '💎'],
  [/qwen/i, '🌏'],
  [/deepseek/i, '🔍'],
];

export function getModelEmoji(name: string): string {
  for (const [re, em] of EMOJI_MAP) if (re.test(name)) return em;
  return '🤖';
}

export function useOllama() {
  const installedModels = useModelStore((s) => s.installedModels);
  const loadedModels = useModelStore((s) => s.loadedModels);
  const ollamaRunning = useModelStore((s) => s.ollamaRunning);
  const pullingModels = useModelStore((s) => s.pullingModels);
  const defaultModel = useSettingsStore((s) => s.defaultModel);

  const isModelLoaded = (name: string) => loadedModels.some((m) => m.name === name);
  const isModelPulling = (name: string) => !!pullingModels[name];
  const getPullProgress = (name: string) => pullingModels[name] ?? null;
  const isModelInstalled = (name: string) => installedModels.some((m) => m.name === name);
  const getModelStatus = (name: string): 'loaded' | 'available' | 'pulling' | 'missing' => {
    if (isModelPulling(name)) return 'pulling';
    if (isModelLoaded(name)) return 'loaded';
    if (isModelInstalled(name)) return 'available';
    return 'missing';
  };

  return {
    ollamaRunning,
    installedModels,
    loadedModels,
    pullingModels,
    defaultModel,
    isModelLoaded,
    isModelPulling,
    isModelInstalled,
    getPullProgress,
    getModelStatus,
    formatModelSize,
    getModelEmoji,
  };
}
