export type Role = "user" | "assistant" | "system";

export interface Message {
  id: string;
  conversationId: string;
  role: Role;
  content: string;
  tokens?: number;
  createdAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  model: string;
  systemPrompt?: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}

export interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
  details?: {
    parameter_size?: string;
    quantization_level?: string;
    family?: string;
  };
}

export interface PullProgress {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
}

export interface SystemInfo {
  models: Array<{ name: string; size: number; size_vram?: number }>;
}

export interface Settings {
  defaultModel: string;
  temperature: number;
  contextWindow: number;
  systemPrompt: string;
  fontSize: number;
  density: "comfortable" | "compact";
  sidebarWidth: number;
}
