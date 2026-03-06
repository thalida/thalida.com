import type { BlockedEntry, ChatMessage, ConnectionInfo } from "./types";
import { MESSAGE_RETENTION_MS, RESERVATION_DURATION_MS } from "./config";

const SCHEMA_VERSION_KEY = "schemaVersion";
const CURRENT_SCHEMA_VERSION = 2; // v1: blockedIps key, v2: blockedClients key
const BLOCKED_CLIENTS_KEY = "blockedClients";
const LEGACY_BLOCKED_KEY = "blockedIps";
const MESSAGES_KEY = "messages";
const CLIENT_PREFIX = "client:";

interface ClientMapping {
  username: string;
  lastSeen: number;
}

export class ChatStorage {
  private messages: ChatMessage[] = [];
  private blockedEntries: Map<string, { username: string; blockedAt: number }> = new Map();
  private messagesLoaded = false;
  private blockedClientsLoaded = false;
  private _lastSaveError: string | null = null;

  constructor(private storage: DurableObjectStorage) {}

  /** Last storage save error, if any. Cleared on next successful save. */
  get lastSaveError(): string | null {
    return this._lastSaveError;
  }

  // ── Loading ────────────────────────────────────────────────────────

  async loadBlockedClients(): Promise<void> {
    if (this.blockedClientsLoaded) return;

    // Run migrations if needed (MAINT-API-4)
    const version = (await this.storage.get<number>(SCHEMA_VERSION_KEY)) ?? 1;
    if (version < CURRENT_SCHEMA_VERSION) {
      await this.migrate(version);
    }

    const stored = await this.storage.get<unknown>(BLOCKED_CLIENTS_KEY);
    if (Array.isArray(stored)) {
      for (const entry of stored) {
        if (entry && typeof entry === "object" && "clientId" in entry) {
          const e = entry as { clientId: string; username: string; blockedAt: number };
          this.blockedEntries.set(e.clientId, { username: e.username, blockedAt: e.blockedAt });
        }
      }
    }
    this.blockedClientsLoaded = true;
  }

  private async migrate(fromVersion: number): Promise<void> {
    if (fromVersion < 2) {
      // v1 → v2: Rename blockedIps → blockedClients
      const legacy = await this.storage.get<unknown>(LEGACY_BLOCKED_KEY);
      if (legacy) {
        await this.storage.put(BLOCKED_CLIENTS_KEY, legacy);
        await this.storage.delete(LEGACY_BLOCKED_KEY);
      }
    }
    await this.storage.put(SCHEMA_VERSION_KEY, CURRENT_SCHEMA_VERSION);
  }

  async loadMessages(): Promise<void> {
    if (this.messagesLoaded) return;
    const stored = await this.storage.get<ChatMessage[]>(MESSAGES_KEY);
    if (Array.isArray(stored)) {
      this.messages = stored;
    }
    this.pruneExpiredMessages();
    this.messagesLoaded = true;
  }

  // ── Messages ───────────────────────────────────────────────────────

  getMessages(): ChatMessage[] {
    return this.messages;
  }

  findMessage(id: string): ChatMessage | undefined {
    return this.messages.find((m) => m.id === id);
  }

  addMessage(message: ChatMessage): void {
    this.messages.push(message);
    this.saveMessages();
  }

  removeMessage(id: string): boolean {
    const idx = this.messages.findIndex((m) => m.id === id);
    if (idx === -1) return false;
    this.messages.splice(idx, 1);
    this.saveMessages();
    return true;
  }

  removeMessagesByClient(clientId: string): ChatMessage[] {
    const removed = this.messages.filter((m) => m.clientId === clientId);
    this.messages = this.messages.filter((m) => m.clientId !== clientId);
    this.saveMessages();
    return removed;
  }

  renameMessagesForClient(clientId: string, newUsername: string): void {
    for (const msg of this.messages) {
      if (msg.clientId === clientId) {
        msg.username = newUsername;
      }
    }
    this.saveMessages();
  }

  /** Clears all messages from storage. Returns the IDs of removed messages. */
  clearAllMessages(): string[] {
    const ids = this.messages.map((m) => m.id);
    this.messages = [];
    this.saveMessages();
    return ids;
  }

  // ── Blocked Clients ────────────────────────────────────────────────

  blockClient(clientId: string, username: string): void {
    this.blockedEntries.set(clientId, { username, blockedAt: Date.now() });
    this.saveBlockedClients();
  }

  unblockClient(clientId: string): void {
    this.blockedEntries.delete(clientId);
    this.saveBlockedClients();
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

  async getClientMapping(clientId: string): Promise<ClientMapping | undefined> {
    return this.storage.get<ClientMapping>(`${CLIENT_PREFIX}${clientId}`);
  }

  async setClientMapping(clientId: string, username: string): Promise<void> {
    await this.storage.put<ClientMapping>(`${CLIENT_PREFIX}${clientId}`, {
      username,
      lastSeen: Date.now(),
    });
  }

  async isUsernameTaken(
    username: string,
    excludeClientId: string,
    activeConnections: Iterable<ConnectionInfo>,
  ): Promise<boolean> {
    // Check active connections first
    for (const info of activeConnections) {
      if (info.username === username && info.clientId !== excludeClientId) {
        return true;
      }
    }
    // Check stored mappings
    const all = await this.storage.list<ClientMapping>({ prefix: CLIENT_PREFIX });
    for (const [key, value] of all) {
      const cid = key.slice(CLIENT_PREFIX.length);
      if (cid !== excludeClientId && value.username === username) {
        const expired = Date.now() - value.lastSeen > RESERVATION_DURATION_MS;
        if (!expired) return true;
      }
    }
    return false;
  }

  async cleanupExpiredClients(): Promise<void> {
    const all = await this.storage.list<ClientMapping>({ prefix: CLIENT_PREFIX });
    const expired: string[] = [];
    const now = Date.now();
    for (const [key, value] of all) {
      if (now - value.lastSeen > RESERVATION_DURATION_MS) {
        expired.push(key);
      }
    }
    if (expired.length > 0) await this.storage.delete(expired);
  }

  // ── Private ────────────────────────────────────────────────────────

  private pruneExpiredMessages(): void {
    const cutoff = Date.now() - MESSAGE_RETENTION_MS;
    this.messages = this.messages.filter((m) => m.timestamp >= cutoff);
  }

  private saveMessages(): void {
    this.pruneExpiredMessages();
    this.storage
      .put(MESSAGES_KEY, this.messages)
      .then(() => {
        this._lastSaveError = null;
      })
      .catch((err) => {
        this._lastSaveError = `messages: ${err}`;
        console.error("[storage] failed to persist messages:", err);
      });
  }

  private saveBlockedClients(): void {
    const entries = [...this.blockedEntries.entries()].map(([clientId, info]) => ({
      clientId,
      username: info.username,
      blockedAt: info.blockedAt,
    }));
    this.storage
      .put(BLOCKED_CLIENTS_KEY, entries)
      .then(() => {
        this._lastSaveError = null;
      })
      .catch((err) => {
        this._lastSaveError = `blockedClients: ${err}`;
        console.error("[storage] failed to persist blocked clients:", err);
      });
  }
}
