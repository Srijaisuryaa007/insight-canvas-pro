// Settings store — persisted via db (sqlite or localStorage)
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { db } from '../utils/database';

interface SettingsState extends AppSettings {
  // expose individual fields plus helpers
  defaultModel: string;
  systemPrompt: string;
  fontSize: number;
  sidebarWidth: number;
  loadSettings: () => Promise<void>;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
  resetSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,

      loadSettings: async () => {
        try {
          const s = await db.getAllSettings();
          set(s);
        } catch {
          /* fall back to persisted defaults */
        }
      },

      updateSetting: async (key, value) => {
        set({ [key]: value } as unknown as Partial<SettingsState>);
        try {
          await db.setSetting(key as string, JSON.stringify(value));
        } catch {
          /* persisted via zustand persist anyway */
        }
      },

      resetSettings: async () => {
        set({ ...DEFAULT_SETTINGS });
        for (const k of Object.keys(DEFAULT_SETTINGS) as Array<keyof AppSettings>) {
          try {
            await db.setSetting(k, JSON.stringify(DEFAULT_SETTINGS[k]));
          } catch {
            /* skip */
          }
        }
      },
    }),
    {
      name: 'dv_settings_v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => {
        const out: Partial<AppSettings> = {};
        for (const k of Object.keys(DEFAULT_SETTINGS) as Array<keyof AppSettings>) {
          (out as Record<string, unknown>)[k] = (state as unknown as Record<string, unknown>)[k];
        }
        return out;
      },
    },
  ),
);

// Convenience re-exports
export type { AppSettings };
export { DEFAULT_SETTINGS };
// Silence "unused" lint for `get`
void useSettingsStore.getState;
