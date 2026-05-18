// Dual-mode persistence: tries @tauri-apps/plugin-sql; falls back to localStorage.
import type { Conversation, Message, AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';

type SqlDb = {
  execute: (q: string, b?: unknown[]) => Promise<unknown>;
  select: <T = unknown>(q: string, b?: unknown[]) => Promise<T>;
};

let sqlDb: SqlDb | null = null;
let localStorageMode = false;
let initPromise: Promise<void> | null = null;

const LS = {
  CONVS: 'dv_conversations',
  MSGS: (id: string) => `dv_messages_${id}`,
  SETTINGS: 'dv_settings',
};

async function tryInit(): Promise<void> {
  try {
    const mod = await import('@tauri-apps/plugin-sql');
    const Database = mod.default ?? (mod as unknown as { default: { load: (s: string) => Promise<SqlDb> } }).default;
    sqlDb = (await (Database as unknown as { load: (s: string) => Promise<SqlDb> }).load('sqlite:datavora.db')) as SqlDb;
    await sqlDb.execute(`CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, model TEXT NOT NULL,
      system_prompt TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
      message_count INTEGER DEFAULT 0, last_message TEXT
    )`);
    await sqlDb.execute(`CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, role TEXT NOT NULL,
      content TEXT NOT NULL, tokens INTEGER, created_at INTEGER NOT NULL,
      attachments TEXT,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    )`);
    await sqlDb.execute(`CREATE INDEX IF NOT EXISTS idx_msg_conv ON messages(conversation_id)`);
    await sqlDb.execute(`CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY, value TEXT NOT NULL
    )`);
  } catch {
    localStorageMode = true;
    sqlDb = null;
    if (!localStorage.getItem(LS.CONVS)) localStorage.setItem(LS.CONVS, '[]');
  }
}

function readConvsLS(): Conversation[] {
  try {
    return JSON.parse(localStorage.getItem(LS.CONVS) ?? '[]') as Conversation[];
  } catch {
    return [];
  }
}
function writeConvsLS(c: Conversation[]): void {
  localStorage.setItem(LS.CONVS, JSON.stringify(c));
}

export const db = {
  async init(): Promise<void> {
    if (!initPromise) initPromise = tryInit();
    return initPromise;
  },

  isLocalMode(): boolean {
    return localStorageMode;
  },

  async saveConversation(c: Conversation): Promise<void> {
    await db.init();
    if (sqlDb) {
      await sqlDb.execute(
        `INSERT OR REPLACE INTO conversations (id, title, model, system_prompt, created_at, updated_at, message_count, last_message) VALUES (?,?,?,?,?,?,?,?)`,
        [c.id, c.title, c.model, c.systemPrompt ?? null, c.createdAt, c.updatedAt, c.messageCount, c.lastMessage ?? null],
      );
    } else {
      const all = readConvsLS().filter((x) => x.id !== c.id);
      all.push(c);
      writeConvsLS(all);
    }
  },

  async getConversations(): Promise<Conversation[]> {
    await db.init();
    if (sqlDb) {
      const rows = await sqlDb.select<Array<Record<string, unknown>>>(
        `SELECT * FROM conversations ORDER BY updated_at DESC`,
      );
      return rows.map((r) => ({
        id: String(r.id),
        title: String(r.title),
        model: String(r.model),
        systemPrompt: (r.system_prompt as string) ?? undefined,
        createdAt: Number(r.created_at),
        updatedAt: Number(r.updated_at),
        messageCount: Number(r.message_count ?? 0),
        lastMessage: (r.last_message as string) ?? undefined,
      }));
    }
    return readConvsLS().sort((a, b) => b.updatedAt - a.updatedAt);
  },

  async getConversation(id: string): Promise<Conversation | null> {
    const all = await db.getConversations();
    return all.find((c) => c.id === id) ?? null;
  },

  async updateConversationTitle(id: string, title: string): Promise<void> {
    await db.init();
    if (sqlDb) {
      await sqlDb.execute(`UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?`, [title, Date.now(), id]);
    } else {
      const all = readConvsLS();
      const c = all.find((x) => x.id === id);
      if (c) {
        c.title = title;
        c.updatedAt = Date.now();
        writeConvsLS(all);
      }
    }
  },

  async deleteConversation(id: string): Promise<void> {
    await db.init();
    if (sqlDb) {
      await sqlDb.execute(`DELETE FROM messages WHERE conversation_id = ?`, [id]);
      await sqlDb.execute(`DELETE FROM conversations WHERE id = ?`, [id]);
    } else {
      writeConvsLS(readConvsLS().filter((x) => x.id !== id));
      localStorage.removeItem(LS.MSGS(id));
    }
  },

  async saveMessage(m: Message): Promise<void> {
    await db.init();
    if (sqlDb) {
      await sqlDb.execute(
        `INSERT OR REPLACE INTO messages (id, conversation_id, role, content, tokens, created_at, attachments) VALUES (?,?,?,?,?,?,?)`,
        [m.id, m.conversationId, m.role, m.content, m.tokens ?? null, m.createdAt, m.attachments ? JSON.stringify(m.attachments) : null],
      );
    } else {
      const key = LS.MSGS(m.conversationId);
      const msgs: Message[] = JSON.parse(localStorage.getItem(key) ?? '[]');
      const idx = msgs.findIndex((x) => x.id === m.id);
      if (idx >= 0) msgs[idx] = m;
      else msgs.push(m);
      localStorage.setItem(key, JSON.stringify(msgs));
    }
  },

  async getMessages(conversationId: string): Promise<Message[]> {
    await db.init();
    if (sqlDb) {
      const rows = await sqlDb.select<Array<Record<string, unknown>>>(
        `SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`,
        [conversationId],
      );
      return rows.map((r) => ({
        id: String(r.id),
        conversationId: String(r.conversation_id),
        role: r.role as Message['role'],
        content: String(r.content),
        tokens: r.tokens != null ? Number(r.tokens) : undefined,
        createdAt: Number(r.created_at),
        attachments: r.attachments ? JSON.parse(String(r.attachments)) : undefined,
      }));
    }
    try {
      return JSON.parse(localStorage.getItem(LS.MSGS(conversationId)) ?? '[]') as Message[];
    } catch {
      return [];
    }
  },

  async deleteMessages(conversationId: string): Promise<void> {
    await db.init();
    if (sqlDb) {
      await sqlDb.execute(`DELETE FROM messages WHERE conversation_id = ?`, [conversationId]);
    } else {
      localStorage.removeItem(LS.MSGS(conversationId));
    }
  },

  async getSetting(key: string): Promise<string | null> {
    await db.init();
    if (sqlDb) {
      const rows = await sqlDb.select<Array<{ value: string }>>(`SELECT value FROM settings WHERE key = ?`, [key]);
      return rows[0]?.value ?? null;
    }
    try {
      const all = JSON.parse(localStorage.getItem(LS.SETTINGS) ?? '{}');
      return all[key] != null ? JSON.stringify(all[key]) : null;
    } catch {
      return null;
    }
  },

  async setSetting(key: string, value: string): Promise<void> {
    await db.init();
    if (sqlDb) {
      await sqlDb.execute(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, [key, value]);
    } else {
      const all = JSON.parse(localStorage.getItem(LS.SETTINGS) ?? '{}');
      try {
        all[key] = JSON.parse(value);
      } catch {
        all[key] = value;
      }
      localStorage.setItem(LS.SETTINGS, JSON.stringify(all));
    }
  },

  async getAllSettings(): Promise<AppSettings> {
    await db.init();
    const merged: AppSettings = { ...DEFAULT_SETTINGS };
    if (sqlDb) {
      const rows = await sqlDb.select<Array<{ key: string; value: string }>>(`SELECT key, value FROM settings`);
      for (const r of rows) {
        try {
          (merged as unknown as Record<string, unknown>)[r.key] = JSON.parse(r.value);
        } catch {
          /* skip */
        }
      }
    } else {
      try {
        const all = JSON.parse(localStorage.getItem(LS.SETTINGS) ?? '{}');
        Object.assign(merged, all);
      } catch {
        /* skip */
      }
    }
    return merged;
  },

  async exportAllConversations(): Promise<string> {
    const convs = await db.getConversations();
    const out: { conversations: Conversation[]; messages: Record<string, Message[]> } = {
      conversations: convs,
      messages: {},
    };
    for (const c of convs) out.messages[c.id] = await db.getMessages(c.id);
    return JSON.stringify(out, null, 2);
  },

  async importConversations(json: string): Promise<number> {
    const parsed = JSON.parse(json) as { conversations?: Conversation[]; messages?: Record<string, Message[]> };
    if (!parsed.conversations || !Array.isArray(parsed.conversations)) {
      throw new Error('Invalid import file: missing conversations[]');
    }
    let n = 0;
    for (const c of parsed.conversations) {
      await db.saveConversation(c);
      n++;
      const msgs = parsed.messages?.[c.id] ?? [];
      for (const m of msgs) await db.saveMessage(m);
    }
    return n;
  },

  async clearAllData(): Promise<void> {
    await db.init();
    if (sqlDb) {
      await sqlDb.execute(`DELETE FROM messages`);
      await sqlDb.execute(`DELETE FROM conversations`);
    } else {
      const convs = readConvsLS();
      for (const c of convs) localStorage.removeItem(LS.MSGS(c.id));
      localStorage.setItem(LS.CONVS, '[]');
    }
  },
};
