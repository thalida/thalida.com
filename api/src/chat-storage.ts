import type { BlockedEntry, ChatMessage, ConnectionInfo } from "./types";
import { MESSAGE_RETENTION_MS, RESERVATION_DURATION_MS } from "./config";

// Legacy KV keys — used only during one-time KV→SQL migration
const LEGACY_MESSAGES_KEY = "messages";
const LEGACY_BLOCKED_CLIENTS_KEY = "blockedClients";
const LEGACY_BLOCKED_KEY = "blockedIps"; // v1 key
const LEGACY_SCHEMA_VERSION_KEY = "schemaVersion";
const LEGACY_CLIENT_PREFIX = "client:";

interface ClientMapping {
  username: string;
  lastSeen: number;
}

export class ChatStorage {
  private messages: ChatMessage[] = [];
  private blockedEntries: Map<string, { username: string; blockedAt: number }> = new Map();
  private messagesLoaded = false;
  private blockedClientsLoaded = false;
  private schemaReady = false;
  private migrationDone = false;

  constructor(private storage: DurableObjectStorage) {}

  // ── Schema & Migration ──────────────────────────────────────────────

  private ensureSchema(): void {
    if (this.schemaReady) return;

    this.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        username TEXT NOT NULL,
        text TEXT NOT NULL,
        context_path TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
      CREATE INDEX IF NOT EXISTS idx_messages_client_id ON messages (client_id);
      CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at);

      CREATE TABLE IF NOT EXISTS blocked_clients (
        client_id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );

      CREATE TABLE IF NOT EXISTS clients (
        client_id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        last_seen_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
      CREATE INDEX IF NOT EXISTS idx_clients_username ON clients (username);
      CREATE INDEX IF NOT EXISTS idx_clients_last_seen_at ON clients (last_seen_at);
    `);

    // Migrate from old table name if it exists
    try {
      const cursor = this.storage.sql.exec<{ name: string }>(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='client_mappings'`,
      );
      for (const _row of cursor) {
        this.storage.sql.exec(`INSERT OR IGNORE INTO clients SELECT * FROM client_mappings`);
        this.storage.sql.exec(`DROP TABLE client_mappings`);
      }
    } catch (err) {
      console.error("[storage] client_mappings migration error:", err);
    }

    this.schemaReady = true;
  }

  /**
   * Migrate legacy KV data into SQL tables, then delete KV keys.
   * Runs once per DO instance lifetime on first boot after deploy.
   */
  private async migrateFromKV(): Promise<void> {
    if (this.migrationDone) return;
    this.migrationDone = true;

    // Quick check: if the primary legacy key is absent, skip all KV reads
    const hasLegacyMessages = await this.storage.get(LEGACY_MESSAGES_KEY);
    const hasLegacyBlocked = await this.storage.get(LEGACY_BLOCKED_CLIENTS_KEY);
    const hasLegacyBlockedV1 = await this.storage.get(LEGACY_BLOCKED_KEY);
    if (!hasLegacyMessages && !hasLegacyBlocked && !hasLegacyBlockedV1) return;

    // ── blocked clients (v1 "blockedIps" + v2 "blockedClients") ──
    const legacyBlocked = (hasLegacyBlocked ?? hasLegacyBlockedV1) as unknown;
    if (Array.isArray(legacyBlocked)) {
      for (const entry of legacyBlocked) {
        if (entry && typeof entry === "object" && "clientId" in entry) {
          const e = entry as { clientId: string; username: string; blockedAt: number };
          this.storage.sql.exec(
            `INSERT OR REPLACE INTO blocked_clients (client_id, username, created_at) VALUES (?, ?, ?)`,
            e.clientId,
            e.username,
            new Date(e.blockedAt).toISOString(),
          );
        }
      }
    }

    // ── messages ──
    if (Array.isArray(hasLegacyMessages)) {
      for (const m of hasLegacyMessages as ChatMessage[]) {
        this.storage.sql.exec(
          `INSERT OR REPLACE INTO messages (id, client_id, username, text, context_path, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
          m.id,
          m.clientId,
          m.username,
          m.text,
          m.context?.path ?? null,
          new Date(m.timestamp).toISOString(),
        );
      }
    }

    // ── client mappings ──
    const legacyClients = await this.storage.list<ClientMapping>({ prefix: LEGACY_CLIENT_PREFIX });
    for (const [key, value] of legacyClients) {
      const clientId = key.slice(LEGACY_CLIENT_PREFIX.length);
      this.storage.sql.exec(
        `INSERT OR REPLACE INTO clients (client_id, username, last_seen_at) VALUES (?, ?, ?)`,
        clientId,
        value.username,
        new Date(value.lastSeen).toISOString(),
      );
    }

    // ── delete old KV keys ──
    await this.storage.delete([
      LEGACY_MESSAGES_KEY,
      LEGACY_BLOCKED_CLIENTS_KEY,
      LEGACY_BLOCKED_KEY,
      LEGACY_SCHEMA_VERSION_KEY,
    ]);
    if (legacyClients.size > 0) {
      await this.storage.delete([...legacyClients.keys()]);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────

  private toISOString(ms: number): string {
    return new Date(ms).toISOString();
  }

  private fromISOString(iso: string): number {
    return new Date(iso).getTime();
  }

  // ── Loading ────────────────────────────────────────────────────────

  async loadBlockedClients(): Promise<void> {
    if (this.blockedClientsLoaded) return;

    this.ensureSchema();
    await this.migrateFromKV();

    const cursor = this.storage.sql.exec<{
      client_id: string;
      username: string;
      created_at: string;
    }>(`SELECT client_id, username, created_at FROM blocked_clients`);
    for (const row of cursor) {
      this.blockedEntries.set(row.client_id, {
        username: row.username,
        blockedAt: this.fromISOString(row.created_at),
      });
    }

    this.blockedClientsLoaded = true;
  }

  async loadMessages(): Promise<void> {
    if (this.messagesLoaded) return;

    this.ensureSchema();

    // Prune expired messages from SQL
    const cutoff = this.toISOString(Date.now() - MESSAGE_RETENTION_MS);
    this.storage.sql.exec(`DELETE FROM messages WHERE created_at < ?`, cutoff);

    const cursor = this.storage.sql.exec<{
      id: string;
      client_id: string;
      username: string;
      text: string;
      context_path: string | null;
      created_at: string;
    }>(`SELECT id, client_id, username, text, context_path, created_at FROM messages ORDER BY created_at`);

    this.messages = [];
    for (const row of cursor) {
      const msg: ChatMessage = {
        type: "message",
        id: row.id,
        clientId: row.client_id,
        username: row.username,
        text: row.text,
        timestamp: this.fromISOString(row.created_at),
      };
      if (row.context_path) {
        msg.context = { path: row.context_path };
      }
      this.messages.push(msg);
    }

    this.messagesLoaded = true;
  }

  // ── Messages ───────────────────────────────────────────────────────

  getMessages(): ChatMessage[] {
    return this.messages;
  }

  findMessage(id: string): ChatMessage | undefined {
    return this.messages.find((m) => m.id === id);
  }

  addMessage(message: ChatMessage): boolean {
    try {
      this.storage.sql.exec(
        `INSERT INTO messages (id, client_id, username, text, context_path, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
        message.id,
        message.clientId,
        message.username,
        message.text,
        message.context?.path ?? null,
        this.toISOString(message.timestamp),
      );
    } catch (err) {
      console.error("[storage] failed to persist message:", err);
      return false;
    }
    this.messages.push(message);
    return true;
  }

  removeMessage(id: string): boolean {
    const idx = this.messages.findIndex((m) => m.id === id);
    if (idx === -1) return false;
    try {
      this.storage.sql.exec(`DELETE FROM messages WHERE id = ?`, id);
    } catch (err) {
      console.error("[storage] failed to delete message:", err);
      return false;
    }
    this.messages.splice(idx, 1);
    return true;
  }

  removeMessagesByClient(clientId: string): ChatMessage[] {
    const removed = this.messages.filter((m) => m.clientId === clientId);
    if (removed.length === 0) return [];
    try {
      this.storage.sql.exec(`DELETE FROM messages WHERE client_id = ?`, clientId);
    } catch (err) {
      console.error("[storage] failed to delete messages by client:", err);
      return [];
    }
    this.messages = this.messages.filter((m) => m.clientId !== clientId);
    return removed;
  }

  renameMessagesForClient(clientId: string, newUsername: string): void {
    try {
      this.storage.sql.exec(`UPDATE messages SET username = ? WHERE client_id = ?`, newUsername, clientId);
    } catch (err) {
      console.error("[storage] failed to rename messages:", err);
      return;
    }
    for (const msg of this.messages) {
      if (msg.clientId === clientId) {
        msg.username = newUsername;
      }
    }
  }

  clearAllMessages(): void {
    try {
      this.storage.sql.exec(`DELETE FROM messages`);
    } catch (err) {
      console.error("[storage] failed to clear messages:", err);
      return;
    }
    this.messages = [];
  }

  // ── Blocked Clients ────────────────────────────────────────────────

  blockClient(clientId: string, username: string): void {
    const now = Date.now();
    try {
      this.storage.sql.exec(
        `INSERT OR REPLACE INTO blocked_clients (client_id, username, created_at) VALUES (?, ?, ?)`,
        clientId,
        username,
        this.toISOString(now),
      );
    } catch (err) {
      console.error("[storage] failed to persist blocked client:", err);
      return;
    }
    this.blockedEntries.set(clientId, { username, blockedAt: now });
  }

  unblockClient(clientId: string): void {
    try {
      this.storage.sql.exec(`DELETE FROM blocked_clients WHERE client_id = ?`, clientId);
    } catch (err) {
      console.error("[storage] failed to delete blocked client:", err);
      return;
    }
    this.blockedEntries.delete(clientId);
  }

  isBlocked(clientId: string): boolean {
    return this.blockedEntries.has(clientId);
  }

  getBlockedEntries(): BlockedEntry[] {
    return [...this.blockedEntries.entries()].map(([clientId, info]) => ({
      clientId,
      username: info.username,
      blockedAt: info.blockedAt,
    }));
  }

  // ── Client Mappings ────────────────────────────────────────────────

  getClientMapping(clientId: string): ClientMapping | undefined {
    const cursor = this.storage.sql.exec<{
      username: string;
      last_seen_at: string;
    }>(`SELECT username, last_seen_at FROM clients WHERE client_id = ?`, clientId);
    for (const row of cursor) {
      return { username: row.username, lastSeen: this.fromISOString(row.last_seen_at) };
    }
    return undefined;
  }

  setClientMapping(clientId: string, username: string): void {
    try {
      this.storage.sql.exec(
        `INSERT OR REPLACE INTO clients (client_id, username, last_seen_at) VALUES (?, ?, ?)`,
        clientId,
        username,
        new Date().toISOString(),
      );
    } catch (err) {
      console.error("[storage] failed to persist client mapping:", err);
    }
  }

  isUsernameTaken(username: string, excludeClientId: string, activeConnections: Iterable<ConnectionInfo>): boolean {
    // Check active connections first
    for (const info of activeConnections) {
      if (info.username === username && info.clientId !== excludeClientId) {
        return true;
      }
    }
    // Check stored mappings via SQL
    const cutoff = this.toISOString(Date.now() - RESERVATION_DURATION_MS);
    const cursor = this.storage.sql.exec<{ found: number }>(
      `SELECT 1 AS found FROM clients WHERE username = ? AND client_id != ? AND last_seen_at >= ? LIMIT 1`,
      username,
      excludeClientId,
      cutoff,
    );
    for (const _row of cursor) {
      return true;
    }
    return false;
  }

  cleanupExpiredClients(): void {
    const cutoff = this.toISOString(Date.now() - RESERVATION_DURATION_MS);
    try {
      this.storage.sql.exec(`DELETE FROM clients WHERE last_seen_at < ?`, cutoff);
    } catch (err) {
      console.error("[storage] failed to cleanup expired clients:", err);
    }
  }

  hasClient(clientId: string): boolean {
    const cursor = this.storage.sql.exec<{ found: number }>(
      `SELECT 1 AS found FROM clients WHERE client_id = ? LIMIT 1`,
      clientId,
    );
    for (const _row of cursor) {
      return true;
    }
    return false;
  }
}
