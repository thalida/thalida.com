import { v7 as uuidv7 } from "uuid";
import { dispatch } from "./commands";
import type {
  BlockedEntry,
  Env,
  ChatMessage,
  ClientChatData,
  ClientDeleteByUserData,
  ClientDeleteData,
  ClientFlagData,
  ClientJoinData,
  ClientMessage,
  ConnectionInfo,
  ServerErrorCode,
  ServerMessage,
} from "./types";
import { CLIENT_MESSAGE_TYPE, SERVER_ERROR_CODE, SERVER_MESSAGE_TYPE } from "./types";
import {
  ADMIN_USERNAME,
  MAX_MESSAGE_LENGTH,
  MAX_USERNAME_LENGTH,
  MESSAGE_RETENTION_MS,
  MAX_WARNINGS,
  MIN_USERNAME_LENGTH,
  RESERVATION_DURATION_MS,
} from "./config";

const BLOCKED_IPS_KEY = "blockedIps";
const MESSAGES_KEY = "messages";
const RESERVATION_PREFIX = "reservation:";

interface UsernameReservation {
  clientId: string;
  lastSeen: number;
}

export class ChatRoom implements DurableObject {
  private messages: ChatMessage[] = [];
  private connections: Map<WebSocket, ConnectionInfo> = new Map();
  private spectators: Set<WebSocket> = new Set();
  private blockedEntries: Map<string, { username: string; blockedAt: number }> = new Map();
  private messagesLoaded = false;
  private blockedIpsLoaded = false;

  constructor(
    private state: DurableObjectState,
    private env: Env,
  ) {}

  // ── Storage: Load ───────────────────────────────────────────────────

  private async loadBlockedClients(): Promise<void> {
    if (this.blockedIpsLoaded) return;
    const stored = await this.state.storage.get<unknown>(BLOCKED_IPS_KEY);
    if (Array.isArray(stored)) {
      for (const entry of stored) {
        if (entry && typeof entry === "object" && "clientId" in entry) {
          const e = entry as { clientId: string; username: string; blockedAt: number };
          this.blockedEntries.set(e.clientId, { username: e.username, blockedAt: e.blockedAt });
        }
      }
    }
    this.blockedIpsLoaded = true;
  }

  private async loadMessages(): Promise<void> {
    if (this.messagesLoaded) return;
    const stored = await this.state.storage.get<ChatMessage[]>(MESSAGES_KEY);
    if (Array.isArray(stored)) {
      this.messages = stored;
    }
    this.pruneExpiredMessages();
    this.messagesLoaded = true;
  }

  // ── Storage: Save (fire-and-forget) ────────────────────────────────

  private saveMessages(): void {
    this.pruneExpiredMessages();
    this.state.storage.put(MESSAGES_KEY, this.messages).catch((err) => {
      console.error("[storage] failed to persist messages:", err);
    });
  }

  private saveBlockedClients(): void {
    const entries = [...this.blockedEntries.entries()].map(([clientId, info]) => ({
      clientId,
      username: info.username,
      blockedAt: info.blockedAt,
    }));
    this.state.storage.put(BLOCKED_IPS_KEY, entries).catch((err) => {
      console.error("[storage] failed to persist blocked clients:", err);
    });
  }

  private pruneExpiredMessages(): void {
    const cutoff = Date.now() - MESSAGE_RETENTION_MS;
    this.messages = this.messages.filter((m) => m.timestamp >= cutoff);
  }

  // ── Data Mutations (mutate + save) ─────────────────────────────────

  private addMessage(message: ChatMessage): void {
    this.messages.push(message);
    this.saveMessages();
  }

  private removeMessage(id: string): boolean {
    const idx = this.messages.findIndex((m) => m.id === id);
    if (idx === -1) return false;
    this.messages.splice(idx, 1);
    this.saveMessages();
    return true;
  }

  private removeMessagesByClient(clientId: string): ChatMessage[] {
    const removed = this.messages.filter((m) => m.clientId === clientId);
    this.messages = this.messages.filter((m) => m.clientId !== clientId);
    this.saveMessages();
    return removed;
  }

  private renameMessagesForClient(clientId: string, newUsername: string): void {
    for (const msg of this.messages) {
      if (msg.clientId === clientId) {
        msg.username = newUsername;
      }
    }
    this.saveMessages();
  }

  private blockClient(clientId: string, username: string): void {
    this.blockedEntries.set(clientId, { username, blockedAt: Date.now() });
    this.saveBlockedClients();
  }

  private unblockClient(clientId: string): void {
    this.blockedEntries.delete(clientId);
    this.saveBlockedClients();
  }

  private async getReservation(username: string): Promise<UsernameReservation | undefined> {
    return this.state.storage.get<UsernameReservation>(`${RESERVATION_PREFIX}${username}`);
  }

  private async upsertReservation(username: string, clientId: string): Promise<void> {
    await this.state.storage.put<UsernameReservation>(`${RESERVATION_PREFIX}${username}`, {
      clientId,
      lastSeen: Date.now(),
    });
  }

  private async cleanupExpiredReservations(): Promise<void> {
    const all = await this.state.storage.list<UsernameReservation>({ prefix: RESERVATION_PREFIX });
    const now = Date.now();
    const expired: string[] = [];
    for (const [key, value] of all) {
      if (now - value.lastSeen > RESERVATION_DURATION_MS) {
        expired.push(key);
      }
    }
    if (expired.length > 0) {
      await this.state.storage.delete(expired);
    }
  }

  // ── Public API ───────────────────────────────────────────────────────

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    await this.loadBlockedClients();
    await this.loadMessages();
    this.cleanupExpiredReservations().catch((err) => {
      console.error("[reservations] cleanup error:", err);
    });

    const [client, server] = Object.values(new WebSocketPair());

    server.accept();

    this.spectators.add(server);
    this.sendStatus(server);

    server.addEventListener("message", (event) => {
      this.handleMessage(server, event.data);
    });

    server.addEventListener("close", () => {
      this.removeConnection(server);
    });

    server.addEventListener("error", () => {
      this.removeConnection(server);
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  // ── Message Handlers ─────────────────────────────────────────────────

  private handleMessage(ws: WebSocket, raw: string | ArrayBuffer): void {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw)) as ClientMessage;
    } catch {
      this.sendError(ws, SERVER_ERROR_CODE.INVALID_MESSAGE, "Invalid JSON.");
      return;
    }

    const info = this.connections.get(ws);
    if (info?.isBlocked && msg.type !== CLIENT_MESSAGE_TYPE.JOIN) {
      this.sendBlocked(ws);
      return;
    }
    if (info?.isBlocked && msg.type === CLIENT_MESSAGE_TYPE.JOIN) {
      return;
    }

    switch (msg.type) {
      case CLIENT_MESSAGE_TYPE.JOIN:
        this.handleJoin(ws, msg.data);
        break;
      case CLIENT_MESSAGE_TYPE.MESSAGE:
        this.handleChatMessage(ws, msg.data);
        break;
      case CLIENT_MESSAGE_TYPE.DELETE:
        this.handleDelete(ws, msg.data);
        break;
      case CLIENT_MESSAGE_TYPE.FLAG:
        this.handleFlag(ws, msg.data);
        break;
      case CLIENT_MESSAGE_TYPE.DELETE_BY_USER:
        this.handleDeleteByUser(ws, msg.data);
        break;
      case CLIENT_MESSAGE_TYPE.UNBLOCK:
        this.handleUnblock(ws, msg.data.clientId);
        break;
    }
  }

  private async handleJoin(ws: WebSocket, { username, token, clientId }: ClientJoinData): Promise<void> {
    const isOwner = typeof token === "string" && token.length > 0 && token === this.env.ADMIN_SECRET;

    const resolvedClientId = clientId ?? crypto.randomUUID();
    const isBlocked = !isOwner && this.blockedEntries.has(resolvedClientId);

    const name = isOwner
      ? ADMIN_USERNAME
      : String(username ?? "")
          .trim()
          .toLowerCase();

    const usernamePattern = new RegExp(`^[a-z0-9_\\-.]{${MIN_USERNAME_LENGTH},${MAX_USERNAME_LENGTH}}$`);
    if (!usernamePattern.test(name)) {
      this.sendError(
        ws,
        SERVER_ERROR_CODE.INVALID_USERNAME,
        `Username must be ${MIN_USERNAME_LENGTH}-${MAX_USERNAME_LENGTH} characters: lowercase letters, numbers, hyphens, underscores, or dots.`,
      );
      return;
    }

    if (name.includes(ADMIN_USERNAME) && !isOwner) {
      this.sendError(ws, SERVER_ERROR_CODE.RESERVED_USERNAME, "That name contains a reserved word.");
      return;
    }

    for (const [existingWs, info] of this.connections) {
      if (info.username === name && existingWs !== ws && !(isOwner && info.isOwner)) {
        if (resolvedClientId && info.clientId === resolvedClientId) continue;
        this.sendError(ws, SERVER_ERROR_CODE.TAKEN_USERNAME, "That name is already taken.");
        return;
      }
    }

    if (!isOwner && resolvedClientId) {
      const reservation = await this.getReservation(name);
      if (reservation) {
        const expired = Date.now() - reservation.lastSeen > RESERVATION_DURATION_MS;
        if (reservation.clientId === resolvedClientId && expired) {
          this.sendError(ws, SERVER_ERROR_CODE.EXPIRED_USERNAME, "Your reserved username has expired.");
          return;
        }
        if (reservation.clientId !== resolvedClientId && !expired) {
          this.sendError(ws, SERVER_ERROR_CODE.TAKEN_USERNAME, "That name is already taken.");
          return;
        }
      }
      await this.upsertReservation(name, resolvedClientId);
    }

    // Detect rename: same clientId, different username
    const existingConn = this.connections.get(ws);
    const oldUsername = existingConn?.clientId === resolvedClientId ? existingConn.username : undefined;

    if (oldUsername != null && oldUsername !== name) {
      this.renameMessagesForClient(resolvedClientId, name);
      this.broadcast({ type: SERVER_MESSAGE_TYPE.RENAME, oldUsername, newUsername: name });
    }

    this.spectators.delete(ws);
    this.connections.set(ws, {
      clientId: resolvedClientId,
      username: name,
      isOwner,
      warnings: 0,
      isBlocked,
    });

    const connInfo = this.connections.get(ws);
    this.send(ws, { type: SERVER_MESSAGE_TYPE.JOINED, isOwner, username: name, isBlocked });
    if (connInfo) this.sendHistory(ws, connInfo);
    this.broadcastStatus();
  }

  private handleChatMessage(ws: WebSocket, { text: rawText, context }: ClientChatData): void {
    const info = this.connections.get(ws);
    if (!info) return;

    const text = String(rawText ?? "")
      .trim()
      .slice(0, MAX_MESSAGE_LENGTH);
    if (!text) return;

    if (info.isOwner && text.startsWith("/")) {
      if (dispatch(text, ws, this)) return;
    }

    const message: ChatMessage = {
      type: SERVER_MESSAGE_TYPE.MESSAGE,
      id: uuidv7(),
      clientId: info.clientId,
      username: info.username,
      text,
      timestamp: Date.now(),
      ...(context?.path && /^\/[-a-z0-9._/]*$/.test(context.path) ? { context } : {}),
    };

    this.addMessage(message);
    this.broadcastMessage(message);

    this.moderate(message, ws).catch((err) => {
      console.error("[moderation] unexpected error:", err);
    });
  }

  private handleUnblock(ws: WebSocket, clientId: string): void {
    const info = this.connections.get(ws);
    if (!info?.isOwner) {
      this.sendError(ws, SERVER_ERROR_CODE.UNAUTHORIZED, "Only the owner can unblock users.");
      return;
    }

    this.unblockClient(clientId);
    this.send(ws, { type: SERVER_MESSAGE_TYPE.UNBLOCKED, clientId });

    for (const [sock, connInfo] of this.connections) {
      if (connInfo.clientId === clientId && connInfo.isBlocked) {
        connInfo.isBlocked = false;
        this.send(sock, {
          type: SERVER_MESSAGE_TYPE.JOINED,
          isOwner: false,
          username: connInfo.username,
          isBlocked: false,
        });
        this.send(sock, {
          type: SERVER_MESSAGE_TYPE.WARNING,
          code: SERVER_ERROR_CODE.UNBLOCKED,
          message: "You have been unblocked.",
        });
      }
    }
  }

  private handleDelete(ws: WebSocket, { id }: ClientDeleteData): void {
    const info = this.connections.get(ws);
    if (!info?.isOwner) return;

    if (!this.removeMessage(id)) return;
    this.broadcast({ type: SERVER_MESSAGE_TYPE.REMOVE, id });
  }

  private handleFlag(ws: WebSocket, { id }: ClientFlagData): void {
    const info = this.connections.get(ws);
    if (!info?.isOwner) return;

    const message = this.messages.find((m) => m.id === id);
    if (!message) return;

    const targetClientId = message.clientId;
    if (!targetClientId) return;

    this.blockClient(targetClientId, message.username);

    for (const [targetWs, connInfo] of this.connections) {
      if (connInfo.clientId === targetClientId && !connInfo.isOwner) {
        this.sendBlocked(targetWs);
        connInfo.isBlocked = true;
      }
    }

    this.send(ws, {
      type: SERVER_MESSAGE_TYPE.FLAGGED,
      username: message.username,
      clientId: targetClientId,
      messageId: id,
    });
  }

  private handleDeleteByUser(ws: WebSocket, { clientId: targetClientId }: ClientDeleteByUserData): void {
    const info = this.connections.get(ws);
    if (!info?.isOwner) return;

    for (const msg of this.removeMessagesByClient(targetClientId)) {
      this.broadcast({ type: SERVER_MESSAGE_TYPE.REMOVE, id: msg.id });
    }
  }

  // ── Moderation ───────────────────────────────────────────────────────

  private async moderate(message: ChatMessage, senderWs: WebSocket): Promise<void> {
    const apiKey = this.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn("[moderation] skipped: OPENAI_API_KEY not set");
      return;
    }

    const result = await this.callModerationAPI(apiKey, message.text);
    if (!result) return;

    const flagged = result.flagged ?? false;
    if (!flagged) return;

    this.removeMessage(message.id);
    this.broadcast({ type: SERVER_MESSAGE_TYPE.REMOVE, id: message.id });

    this.addWarning(senderWs);
  }

  private addWarning(ws: WebSocket): void {
    const info = this.connections.get(ws);
    if (!info) return;

    info.warnings++;

    if (info.warnings >= MAX_WARNINGS) {
      info.isBlocked = true;
      this.blockClient(info.clientId, info.username);
      this.sendBlocked(ws);
    } else {
      const remaining = MAX_WARNINGS - info.warnings;
      this.sendWarning(
        ws,
        SERVER_ERROR_CODE.MODERATION_WARNING,
        `Your message was removed for violating community guidelines. ${remaining} warning${remaining !== 1 ? "s" : ""} remaining before you are blocked.`,
      );
    }
  }

  private async callModerationAPI(
    apiKey: string,
    text: string,
    retries = 3,
  ): Promise<{ flagged: boolean; categories: Record<string, boolean> } | null> {
    for (let attempt = 0; attempt < retries; attempt++) {
      const response = await fetch("https://api.openai.com/v1/moderations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "omni-moderation-latest",
          input: text,
        }),
      });

      if (response.status === 429) {
        const retryAfter = response.headers.get("retry-after");
        const waitMs = retryAfter ? Number(retryAfter) * 1000 : 1000 * 2 ** attempt;
        console.warn(`[moderation] rate limited (429), retrying in ${waitMs}ms (attempt ${attempt + 1}/${retries})`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      if (!response.ok) {
        const body = await response.text();
        console.error(`[moderation] OpenAI API error ${response.status}: ${body}`);
        return null;
      }

      const result = (await response.json()) as {
        results: Array<{
          flagged: boolean;
          categories: Record<string, boolean>;
        }>;
      };
      return result.results?.[0] ?? null;
    }

    console.error("[moderation] exhausted retries after 429s");
    return null;
  }

  // ── Command Interface ──────────────────────────────────────────────

  sendToSocket(ws: WebSocket, message: ServerMessage): void {
    this.send(ws, message);
  }

  handleDeleteMessage(ws: WebSocket, messageId: string): void {
    this.handleDelete(ws, { id: messageId });
  }

  getBlockedEntries(): BlockedEntry[] {
    return [...this.blockedEntries.entries()].map(([clientId, info]) => ({
      clientId,
      username: info.username,
      blockedAt: info.blockedAt,
    }));
  }

  // ── Sanitization ────────────────────────────────────────────────────

  private sanitizeMessage(msg: ChatMessage, viewer: ConnectionInfo): Record<string, unknown> {
    const isOwn = msg.clientId === viewer.clientId;
    if (viewer.isOwner) {
      return { ...msg, isOwn };
    }
    const { clientId: _stripped, ...rest } = msg;
    return { ...rest, isOwn };
  }

  // ── Connection Helpers ───────────────────────────────────────────────

  private removeConnection(ws: WebSocket): void {
    this.spectators.delete(ws);
    this.connections.delete(ws);
    this.broadcastStatus();
  }

  // ── Send Helpers (single socket) ─────────────────────────────────────

  private send(ws: WebSocket, message: ServerMessage): void {
    try {
      ws.send(JSON.stringify(message));
    } catch {
      this.spectators.delete(ws);
      this.connections.delete(ws);
    }
  }

  private sendError(ws: WebSocket, code: ServerErrorCode, message: string): void {
    this.send(ws, { type: SERVER_MESSAGE_TYPE.ERROR, code, message });
  }

  private sendWarning(ws: WebSocket, code: ServerErrorCode, message: string): void {
    this.send(ws, { type: SERVER_MESSAGE_TYPE.WARNING, code, message });
  }

  private sendBlocked(ws: WebSocket): void {
    this.send(ws, {
      type: SERVER_MESSAGE_TYPE.BLOCKED,
      code: SERVER_ERROR_CODE.MODERATION_BLOCKED,
      message: "You have been blocked.",
    });
  }

  private sendStatus(ws: WebSocket): void {
    this.send(ws, this.buildStatusMessage());
  }

  private sendHistory(ws: WebSocket, viewer: ConnectionInfo): void {
    const messages = this.messages.map((m) => this.sanitizeMessage(m, viewer));
    ws.send(JSON.stringify({ type: SERVER_MESSAGE_TYPE.HISTORY, messages }));
  }

  private broadcastMessage(message: ChatMessage): void {
    for (const [ws, info] of this.connections) {
      try {
        ws.send(JSON.stringify(this.sanitizeMessage(message, info)));
      } catch {
        this.spectators.delete(ws);
        this.connections.delete(ws);
      }
    }
  }

  // ── Broadcast Helpers (all sockets) ──────────────────────────────────

  private broadcast(message: ServerMessage, includeSpectators = false): void {
    for (const ws of this.connections.keys()) {
      this.send(ws, message);
    }
    if (includeSpectators) {
      for (const ws of this.spectators) {
        this.send(ws, message);
      }
    }
  }

  private broadcastStatus(): void {
    this.broadcast(this.buildStatusMessage(), true);
  }

  private buildStatusMessage(): ServerMessage {
    let isOwnerOnline = false;
    const uniqueClients = new Set<string>();
    for (const info of this.connections.values()) {
      if (info.isOwner) isOwnerOnline = true;
      uniqueClients.add(info.clientId);
    }
    return { type: SERVER_MESSAGE_TYPE.STATUS, isOwnerOnline, userCount: uniqueClients.size };
  }
}
