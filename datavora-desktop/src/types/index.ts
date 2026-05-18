// DataVora Desktop — Core type definitions

export type Role = 'user' | 'assistant' | 'system';

export interface FileAttachment {
  name: string;
  type: string;
  content: string;
  size: number;
}

export interface Message {
  id: string;
  conversationId: string;
  role: Role;
  content: string;
  tokens?: number;
  createdAt: number;
  isStreaming?: boolean;
  attachments?: FileAttachment[];
}

export interface Conversation {
  id: string;
  title: string;
  model: string;
  systemPrompt?: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  lastMessage?: string;
}

export interface OllamaModelDetails {
  parameterSize: string;
  quantizationLevel: string;
  family: string;
  contextLength?: number;
}

export interface OllamaModel {
  name: string;
  model: string;
  size: number;
  digest: string;
  modifiedAt: string;
  details: OllamaModelDetails;
}

export interface PullProgress {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
}

export interface LoadedModel {
  name: string;
  size: number;
  sizeVram: number;
  expiresAt: string;
}

export interface SystemInfo {
  models: LoadedModel[];
}

export type ThemeMode = 'dark' | 'light' | 'system';
export type Density = 'comfortable' | 'compact';
export type GpuMode = 'auto' | 'cpu' | 'gpu';

export interface AppSettings {
  defaultModel: string;
  temperature: number;
  contextWindow: number;
  systemPrompt: string;
  theme: ThemeMode;
  fontSize: number;
  messageDensity: Density;
  sidebarWidth: number;
  gpuMode: GpuMode;
  threads: number;
  maxLoadedModels: number;
}

export interface PopularModel {
  name: string;
  label: string;
  description: string;
  sizeGB: number;
  ramGB: number;
  emoji: string;
  tags: string[];
}

export const DEFAULT_SETTINGS: AppSettings = {
  defaultModel: '',
  temperature: 0.7,
  contextWindow: 4096,
  systemPrompt: '',
  theme: 'dark',
  fontSize: 14,
  messageDensity: 'comfortable',
  sidebarWidth: 260,
  gpuMode: 'auto',
  threads: 4,
  maxLoadedModels: 1,
};

export const POPULAR_MODELS: PopularModel[] = [
  { name: 'llama3.2:3b', label: 'Llama 3.2 3B', emoji: '🦙', description: 'Best balance of speed and quality for everyday chat tasks', sizeGB: 2.0, ramGB: 4, tags: ['Fast', 'Chat', 'General'] },
  { name: 'llama3.2:1b', label: 'Llama 3.2 1B', emoji: '🦙', description: 'Fastest model, great for quick questions and summaries', sizeGB: 0.8, ramGB: 2, tags: ['Fastest', 'Lightweight'] },
  { name: 'llama3.1:8b', label: 'Llama 3.1 8B', emoji: '🦙', description: 'Powerful general-purpose model with strong reasoning', sizeGB: 4.7, ramGB: 8, tags: ['Balanced', 'Reasoning'] },
  { name: 'mistral:7b', label: 'Mistral 7B', emoji: '🌪️', description: 'Excellent instruction following, great for structured tasks', sizeGB: 4.1, ramGB: 8, tags: ['Instructions', 'Quality'] },
  { name: 'codellama:7b', label: 'Code Llama 7B', emoji: '💻', description: 'Specialized for code generation, debugging and explanation', sizeGB: 3.8, ramGB: 8, tags: ['Code', 'Debug'] },
  { name: 'phi3:mini', label: 'Phi-3 Mini', emoji: 'φ', description: "Microsoft's tiny but surprisingly capable 3.8B model", sizeGB: 2.2, ramGB: 4, tags: ['Tiny', 'Fast', 'Microsoft'] },
  { name: 'gemma2:2b', label: 'Gemma 2 2B', emoji: '💎', description: "Google's efficient small model, punches above its weight", sizeGB: 1.6, ramGB: 3, tags: ['Google', 'Efficient'] },
  { name: 'qwen2:7b', label: 'Qwen 2 7B', emoji: '🌏', description: 'Strong multilingual support, great for non-English tasks', sizeGB: 4.4, ramGB: 8, tags: ['Multilingual', 'Chinese'] },
  { name: 'deepseek-coder:6.7b', label: 'DeepSeek Coder', emoji: '🔍', description: 'Top-tier code specialist, rivals GPT-4 on coding benchmarks', sizeGB: 3.8, ramGB: 8, tags: ['Code', 'Best-in-class'] },
];
