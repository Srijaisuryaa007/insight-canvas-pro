// Thin wrapper around @tauri-apps/plugin-sql with a localStorage fallback for browser dev.
import type { Conversation, Message } from "@/types";

type DB = {
  execute: (sql: string, args?: unknown[]) => Promise<unknown>;
  select: <T = unknown>(sql: string, args?: unknown[]) => Promise<T[]>;
};

let dbPromise: Promise<DB | null> | null = null;

async function getDB(): Promise<DB | null> {
  if (dbPromise) return dbPromise;
  dbPromise = (async () => {
    try {
      const mod = await import("@tauri-apps/plugin-sql");
      const Database = (mod as any).default ?? mod;
      const db = await Database.load("sqlite:conversations.db");
      await db.execute(`CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        model TEXT NOT NULL,
        system_prompt TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        message_count INTEGER DEFAULT 0
      )`);
      await db.execute(`CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        tokens INTEGER,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      )`);
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id)`);
      return db;
    } catch (e) {
      console.warn("[db] Tauri SQL plugin unavailable — falling back to localStorage", e);
      return null;
    }
  })();
  return dbPromise;
}

// localStorage fallback (browser dev only)
const LS_CONV = "dv_conversations";
const LS_MSGS = "dv_messages";
const lsRead = <T,>(k: string): T[] => { try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch { return []; } };
const lsWrite = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v));

export const dbAPI = {
  async listConversations(): Promise<Conversation[]> {
    const db = await getDB();
    if (db) {
      const rows = await db.select<any>("SELECT * FROM conversations ORDER BY updated_at DESC");
      return rows.map((r) => ({
        id: r.id, title: r.title, model: r.model, systemPrompt: r.system_prompt ?? undefined,
        createdAt: r.created_at, updatedAt: r.updated_at, messageCount: r.message_count ?? 0,
      }));
    }
    return lsRead<Conversation>(LS_CONV).sort((a, b) => b.updatedAt - a.updatedAt);
  },

  async createConversation(c: Conversation): Promise<void> {
    const db = await getDB();
    if (db) {
      await db.execute(
        "INSERT INTO conversations (id,title,model,system_prompt,created_at,updated_at,message_count) VALUES (?,?,?,?,?,?,?)",
        [c.id, c.title, c.model, c.systemPrompt ?? null, c.createdAt, c.updatedAt, c.messageCount]
      );
      return;
    }
    const all = lsRead<Conversation>(LS_CONV);
    all.push(c);
    lsWrite(LS_CONV, all);
  },

  async updateConversation(id: string, patch: Partial<Conversation>): Promise<void> {
    const db = await getDB();
    if (db) {
      const fields = Object.keys(patch).map((k) => {
        const col = k === "systemPrompt" ? "system_prompt" : k === "messageCount" ? "message_count" : k === "createdAt" ? "created_at" : k === "updatedAt" ? "updated_at" : k;
        return `${col}=?`;
      }).join(",");
      await db.execute(`UPDATE conversations SET ${fields} WHERE id=?`, [...Object.values(patch), id]);
      return;
    }
    const all = lsRead<Conversation>(LS_CONV).map((c) => (c.id === id ? { ...c, ...patch } : c));
    lsWrite(LS_CONV, all);
  },

  async deleteConversation(id: string): Promise<void> {
    const db = await getDB();
    if (db) {
      await db.execute("DELETE FROM messages WHERE conversation_id=?", [id]);
      await db.execute("DELETE FROM conversations WHERE id=?", [id]);
      return;
    }
    lsWrite(LS_CONV, lsRead<Conversation>(LS_CONV).filter((c) => c.id !== id));
    lsWrite(LS_MSGS, lsRead<Message>(LS_MSGS).filter((m) => m.conversationId !== id));
  },

  async listMessages(conversationId: string): Promise<Message[]> {
    const db = await getDB();
    if (db) {
      const rows = await db.select<any>(
        "SELECT * FROM messages WHERE conversation_id=? ORDER BY created_at ASC",
        [conversationId]
      );
      return rows.map((r) => ({
        id: r.id, conversationId: r.conversation_id, role: r.role,
        content: r.content, tokens: r.tokens ?? undefined, createdAt: r.created_at,
      }));
    }
    return lsRead<Message>(LS_MSGS).filter((m) => m.conversationId === conversationId);
  },

  async addMessage(m: Message): Promise<void> {
    const db = await getDB();
    if (db) {
      await db.execute(
        "INSERT INTO messages (id,conversation_id,role,content,tokens,created_at) VALUES (?,?,?,?,?,?)",
        [m.id, m.conversationId, m.role, m.content, m.tokens ?? null, m.createdAt]
      );
      return;
    }
    const all = lsRead<Message>(LS_MSGS);
    all.push(m);
    lsWrite(LS_MSGS, all);
  },
};
