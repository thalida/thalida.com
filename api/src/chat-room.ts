import { dispatch } from "./commands";
import { ChatStorage } from "./chat-storage";
import { callModerationAPI } from "./chat-moderation";
import type {
  BlockedEntry,
  Env,
  ChatMessage,
  ClientChatData,
  ClientDeleteByUserData,
  ClientDeleteData,
  ClientFlagData,
  ClientJoinData,
  ClientRenameData,
  ConnectionInfo,
  ServerErrorCode,
  ServerMessage,
} from "./types";
import { CLIENT_MESSAGE_TYPE, SERVER_ERROR_CODE, SERVER_MESSAGE_TYPE } from "./types";
import {
  ADMIN_USERNAME as DEFAULT_ADMIN_USERNAME,
  MAX_MESSAGE_LENGTH,
  MAX_USERNAME_LENGTH,
  MAX_USERNAME_RETRIES,
  MAX_USERNAME_SUFFIX,
  MAX_WARNINGS,
  MIN_USERNAME_LENGTH,
  generateRandomUsername,
} from "./config";
import { verifySessionToken, createClientToken, verifyClientToken } from "./session";

// Rate limiting: max 5 messages per second per connection
const RATE_LIMIT_WINDOW_MS = 1000;
const RATE_LIMIT_MAX_MESSAGES = 5;

export class ChatRoom implements DurableObject {
  private storage: ChatStorage;
  private connections: Map<WebSocket, ConnectionInfo> = new Map();
  private spectators: Set<WebSocket> = new Set();
  private messageTimes: Map<WebSocket, number[]> = new Map();

  private readonly adminUsername: string;

  constructor(
    private state: DurableObjectState,
    private env: Env,
  ) {
    this.storage = new ChatStorage(state.storage);
    this.adminUsername = (env.ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME).toLowerCase();
  }

  // ── Rate Limiting ───────────────────────────────────────────────────

  private isRateLimited(ws: WebSocket): boolean {
    const now = Date.now();
    let times = this.messageTimes.get(ws);
    if (!times) {
      times = [];
      this.messageTimes.set(ws, times);
    }

    // Remove timestamps outside the window
    const cutoff = now - RATE_LIMIT_WINDOW_MS;
    while (times.length > 0 && times[0] < cutoff) {
      times.shift();
    }

    if (times.length >= RATE_LIMIT_MAX_MESSAGES) {
      return true;
    }

    times.push(now);
    return false;
  }

  // ── Public API ───────────────────────────────────────────────────────

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    await this.storage.loadBlockedClients();
    await this.storage.loadMessages();
    this.storage.cleanupExpiredClients().catch((err) => {
      console.error("[clients] cleanup error:", err);
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

  private async handleMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw));
    } catch {
      this.sendError(ws, SERVER_ERROR_CODE.INVALID_MESSAGE, "Invalid JSON.");
      return;
    }

    // Runtime validation (SEC-API-5): verify msg shape before processing
    const msg = parsed as Record<string, unknown>;
    if (!msg || typeof msg !== "object" || typeof msg.type !== "string") {
      this.sendError(ws, SERVER_ERROR_CODE.INVALID_MESSAGE, "Invalid message format.");
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

    const data: unknown = msg.data ?? {};

    // READ-API-3: await async handlers for clarity
    switch (msg.type) {
      case CLIENT_MESSAGE_TYPE.JOIN:
        await this.handleJoin(ws, data as ClientJoinData);
        break;
      case CLIENT_MESSAGE_TYPE.RENAME:
        await this.handleRename(ws, data as ClientRenameData);
        break;
      case CLIENT_MESSAGE_TYPE.MESSAGE:
        await this.handleChatMessage(ws, data as ClientChatData);
        break;
      case CLIENT_MESSAGE_TYPE.DELETE: {
        const d = data as Record<string, unknown>;
        await this.handleDelete(ws, { id: String(d.id ?? "") });
        break;
      }
      case CLIENT_MESSAGE_TYPE.FLAG: {
        const d = data as Record<string, unknown>;
        await this.handleFlag(ws, { id: String(d.id ?? "") });
        break;
      }
      case CLIENT_MESSAGE_TYPE.DELETE_BY_USER: {
        const d = data as Record<string, unknown>;
        await this.handleDeleteByUser(ws, { clientId: String(d.clientId ?? "") });
        break;
      }
      case CLIENT_MESSAGE_TYPE.UNBLOCK: {
        const d = data as Record<string, unknown>;
        await this.handleUnblock(ws, String(d.clientId ?? ""));
        break;
      }
    }
  }

  private async handleJoin(ws: WebSocket, { token, clientId, clientToken }: ClientJoinData): Promise<void> {
    // Verify admin via session token (HMAC-based, constant-time verification)
    let isOwner = false;
    if (typeof token === "string" && token.length > 0) {
      isOwner = await verifySessionToken(token, this.env.SIGNING_SECRET);
    }

    // Resolve client identity:
    // - If clientId + clientToken provided and valid -> returning user
    // - Otherwise -> new user, server generates identity
    let resolvedClientId: string;
    let isNewClient = true;

    if (
      typeof clientId === "string" &&
      clientId.length > 0 &&
      typeof clientToken === "string" &&
      clientToken.length > 0
    ) {
      const tokenValid = await verifyClientToken(clientId, clientToken, this.env.SIGNING_SECRET);
      if (tokenValid && (await this.storage.hasClient(clientId))) {
        resolvedClientId = clientId;
        isNewClient = false;
      } else {
        resolvedClientId = crypto.randomUUID();
      }
    } else {
      resolvedClientId = crypto.randomUUID();
    }

    const resolvedClientToken = isNewClient
      ? await createClientToken(resolvedClientId, this.env.SIGNING_SECRET)
      : undefined;

    const isBlocked = !isOwner && this.storage.isBlocked(resolvedClientId);

    let name: string;
    if (isOwner) {
      name = this.adminUsername;
    } else {
      const mapping = await this.storage.getClientMapping(resolvedClientId);
      if (mapping) {
        name = mapping.username;
        await this.storage.setClientMapping(resolvedClientId, name); // update lastSeen
      } else {
        name = generateRandomUsername();
        let retries = 0;
        while (await this.storage.isUsernameTaken(name, resolvedClientId, this.connections.values())) {
          retries++;
          if (retries >= MAX_USERNAME_RETRIES) {
            // Exhausted base names — append numeric suffix with bounded attempts
            let suffix = 1;
            const baseName = generateRandomUsername();
            name = `${baseName}-${suffix}`;
            while (
              suffix <= MAX_USERNAME_SUFFIX &&
              (await this.storage.isUsernameTaken(name, resolvedClientId, this.connections.values()))
            ) {
              suffix++;
              name = `${baseName}-${suffix}`;
            }
            if (suffix > MAX_USERNAME_SUFFIX) {
              // Absolute fallback: use a UUID-based name
              name = `user-${crypto.randomUUID().slice(0, 8)}`;
            }
            break;
          }
          name = generateRandomUsername();
        }
        await this.storage.setClientMapping(resolvedClientId, name);
      }
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
    this.send(ws, {
      type: SERVER_MESSAGE_TYPE.JOINED,
      isOwner,
      username: name,
      isBlocked,
      // Only return credentials on first visit (new clients)
      ...(isNewClient ? { clientId: resolvedClientId, clientToken: resolvedClientToken } : {}),
    });
    if (connInfo) this.sendHistory(ws, connInfo);
    this.broadcastStatus();
  }

  private async handleRename(ws: WebSocket, { username }: ClientRenameData): Promise<void> {
    const info = this.connections.get(ws);
    if (!info) return;

    if (info.isOwner) {
      this.sendError(ws, SERVER_ERROR_CODE.UNAUTHORIZED, "Admin cannot rename.");
      return;
    }

    const name = String(username ?? "")
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

    if (name.includes(this.adminUsername)) {
      this.sendError(ws, SERVER_ERROR_CODE.RESERVED_USERNAME, "That name contains a reserved word.");
      return;
    }

    if (await this.storage.isUsernameTaken(name, info.clientId, this.connections.values())) {
      this.sendError(ws, SERVER_ERROR_CODE.TAKEN_USERNAME, "That name is already taken.");
      return;
    }

    const oldUsername = info.username;
    await this.storage.setClientMapping(info.clientId, name);
    this.storage.renameMessagesForClient(info.clientId, name);
    info.username = name;
    this.broadcast({ type: SERVER_MESSAGE_TYPE.RENAME, oldUsername, newUsername: name });
    this.send(ws, { type: SERVER_MESSAGE_TYPE.JOINED, isOwner: false, username: name, isBlocked: info.isBlocked });
    this.broadcastStatus();
  }

  private async handleChatMessage(ws: WebSocket, { text: rawText, context }: ClientChatData): Promise<void> {
    const info = this.connections.get(ws);
    if (!info) return;

    // Rate limiting (SEC-API-3)
    if (this.isRateLimited(ws)) {
      this.sendWarning(
        ws,
        SERVER_ERROR_CODE.MODERATION_WARNING,
        "You are sending messages too quickly. Please slow down.",
      );
      return;
    }

    const text = String(rawText ?? "")
      .trim()
      .slice(0, MAX_MESSAGE_LENGTH);
    if (!text) return;

    if (info.isOwner && text.startsWith("/")) {
      if (dispatch(text, ws, this)) return;
    }

    const message: ChatMessage = {
      type: SERVER_MESSAGE_TYPE.MESSAGE,
      id: `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`,
      clientId: info.clientId,
      username: info.username,
      text,
      timestamp: Date.now(),
      ...(context?.path && /^\/[-a-z0-9._/]*$/.test(context.path) ? { context: { path: context.path } } : {}),
    };

    if (!this.storage.addMessage(message)) return;
    this.broadcastMessage(message);

    this.moderate(message, ws).catch((err) => {
      console.error("[moderation] unexpected error:", err);
    });
  }

  private async handleUnblock(ws: WebSocket, clientId: string): Promise<void> {
    const info = this.connections.get(ws);
    if (!info?.isOwner) {
      this.sendError(ws, SERVER_ERROR_CODE.UNAUTHORIZED, "Only the owner can unblock users.");
      return;
    }

    this.storage.unblockClient(clientId);
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

  private async handleDelete(ws: WebSocket, { id }: ClientDeleteData): Promise<void> {
    const info = this.connections.get(ws);
    if (!info?.isOwner) {
      this.sendError(ws, SERVER_ERROR_CODE.UNAUTHORIZED, "Only the owner can delete messages.");
      return;
    }

    if (!this.storage.removeMessage(id)) return;
    this.broadcast({ type: SERVER_MESSAGE_TYPE.REMOVE, id });
  }

  private async handleFlag(ws: WebSocket, { id }: ClientFlagData): Promise<void> {
    const info = this.connections.get(ws);
    if (!info?.isOwner) {
      this.sendError(ws, SERVER_ERROR_CODE.UNAUTHORIZED, "Only the owner can flag users.");
      return;
    }

    const message = this.storage.findMessage(id);
    if (!message) return;

    const targetClientId = message.clientId;
    if (!targetClientId) return;

    this.storage.blockClient(targetClientId, message.username);

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

  private async handleDeleteByUser(ws: WebSocket, { clientId: targetClientId }: ClientDeleteByUserData): Promise<void> {
    const info = this.connections.get(ws);
    if (!info?.isOwner) {
      this.sendError(ws, SERVER_ERROR_CODE.UNAUTHORIZED, "Only the owner can delete user messages.");
      return;
    }

    for (const msg of this.storage.removeMessagesByClient(targetClientId)) {
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

    const result = await callModerationAPI(apiKey, message.text);
    if (!result) return;

    const flagged = result.flagged ?? false;
    if (!flagged) return;

    this.storage.removeMessage(message.id);
    this.broadcast({ type: SERVER_MESSAGE_TYPE.REMOVE, id: message.id });

    this.addWarning(senderWs);
  }

  private addWarning(ws: WebSocket): void {
    const info = this.connections.get(ws);
    if (!info) return;

    info.warnings++;

    if (info.warnings >= MAX_WARNINGS) {
      info.isBlocked = true;
      this.storage.blockClient(info.clientId, info.username);
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

  // ── Command Interface ──────────────────────────────────────────────

  sendToSocket(ws: WebSocket, message: ServerMessage): void {
    this.send(ws, message);
  }

  handleDeleteMessage(ws: WebSocket, messageId: string): void {
    this.handleDelete(ws, { id: messageId });
  }

  getBlockedEntries(): BlockedEntry[] {
    return this.storage.getBlockedEntries();
  }

  clearMessages(): void {
    this.storage.clearAllMessages();
    this.broadcast({ type: SERVER_MESSAGE_TYPE.CLEAR });
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
    this.messageTimes.delete(ws);
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
    const messages = this.storage.getMessages().map((m) => this.sanitizeMessage(m, viewer));
    try {
      ws.send(JSON.stringify({ type: SERVER_MESSAGE_TYPE.HISTORY, messages }));
    } catch {
      this.spectators.delete(ws);
      this.connections.delete(ws);
    }
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
    const uniqueUsernames = new Set<string>();
    for (const info of this.connections.values()) {
      if (info.isOwner) isOwnerOnline = true;
      uniqueClients.add(info.clientId);
      uniqueUsernames.add(info.username);
    }
    return {
      type: SERVER_MESSAGE_TYPE.STATUS,
      isOwnerOnline,
      userCount: uniqueClients.size,
      onlineUsernames: [...uniqueUsernames],
    };
  }
}
