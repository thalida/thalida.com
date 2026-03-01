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
  MAX_MESSAGES,
  MAX_USERNAME_LENGTH,
  MAX_WARNINGS,
  MIN_USERNAME_LENGTH,
  RESERVATION_DURATION_MS,
} from "./config";

const BLOCKED_IPS_KEY = "blockedIps";
const RESERVATION_PREFIX = "reservation:";

interface UsernameReservation {
  clientId: string;
  lastSeen: number;
}

export class ChatRoom implements DurableObject {
  private messages: ChatMessage[] = [];
  private connections: Map<WebSocket, ConnectionInfo> = new Map();
  private spectators: Set<WebSocket> = new Set();
  private ipBySocket: Map<WebSocket, string> = new Map();
  private blockedEntries: Map<string, { username: string; blockedAt: number }> = new Map();
  private blockedIpsLoaded = false;

  constructor(
    private state: DurableObjectState,
    private env: Env,
  ) {}

  private async loadBlockedIps(): Promise<void> {
    if (this.blockedIpsLoaded) return;
    const stored = await this.state.storage.get<unknown>(BLOCKED_IPS_KEY);
    if (Array.isArray(stored)) {
      for (const entry of stored) {
        if (typeof entry === "string") {
          // Old format: plain IP strings
          this.blockedEntries.set(entry, { username: "unknown", blockedAt: 0 });
        } else if (entry && typeof entry === "object" && "ip" in entry) {
          // New format: { ip, username, blockedAt }
          const e = entry as { ip: string; username: string; blockedAt: number };
          this.blockedEntries.set(e.ip, { username: e.username, blockedAt: e.blockedAt });
        }
      }
    }
    this.blockedIpsLoaded = true;
  }

  private async persistBlockedIps(): Promise<void> {
    const entries = [...this.blockedEntries.entries()].map(([ip, info]) => ({
      ip,
      username: info.username,
      blockedAt: info.blockedAt,
    }));
    await this.state.storage.put(BLOCKED_IPS_KEY, entries);
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

    await this.loadBlockedIps();
    this.cleanupExpiredReservations().catch((err) => {
      console.error("[reservations] cleanup error:", err);
    });

    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    const [client, server] = Object.values(new WebSocketPair());

    server.accept();

    if (this.blockedEntries.has(ip)) {
      this.sendBlocked(
        server,
        SERVER_ERROR_CODE.MODERATION_BLOCKED,
        "You have been blocked due to repeated violations.",
      );
      server.close(1008, "blocked");
      return new Response(null, { status: 101, webSocket: client });
    }

    this.ipBySocket.set(server, ip);
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
    }
  }

  private async handleJoin(ws: WebSocket, { username, token, clientId }: ClientJoinData): Promise<void> {
    const isOwner = typeof token === "string" && token.length > 0 && token === this.env.ADMIN_SECRET;

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
        // Allow the same clientId to reuse their username across multiple tabs
        if (clientId && info.clientId === clientId) continue;
        this.sendError(ws, SERVER_ERROR_CODE.TAKEN_USERNAME, "That name is already taken.");
        return;
      }
    }

    if (!isOwner && clientId) {
      const reservation = await this.getReservation(name);
      if (reservation) {
        const expired = Date.now() - reservation.lastSeen > RESERVATION_DURATION_MS;
        if (reservation.clientId === clientId && expired) {
          this.sendError(ws, SERVER_ERROR_CODE.EXPIRED_USERNAME, "Your reserved username has expired.");
          return;
        }
        if (reservation.clientId !== clientId && !expired) {
          this.sendError(ws, SERVER_ERROR_CODE.TAKEN_USERNAME, "That name is already taken.");
          return;
        }
      }
      await this.upsertReservation(name, clientId);
    }

    this.spectators.delete(ws);
    this.connections.set(ws, {
      ip: this.ipBySocket.get(ws) ?? "unknown",
      username: name,
      isOwner,
      warnings: 0,
      isBlocked: false,
      clientId: clientId ?? undefined,
    });

    this.send(ws, { type: SERVER_MESSAGE_TYPE.JOINED, isOwner, username: name });
    this.send(ws, { type: SERVER_MESSAGE_TYPE.HISTORY, messages: this.messages });
    this.broadcastStatus();
  }

  private handleChatMessage(ws: WebSocket, { text: rawText, context }: ClientChatData): void {
    const info = this.connections.get(ws);
    if (!info) return;

    if (info.isBlocked) {
      this.sendBlocked(
        ws,
        SERVER_ERROR_CODE.MODERATION_BLOCKED,
        "You have been blocked from sending messages due to repeated violations.",
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
      id: uuidv7(),
      username: info.username,
      text,
      timestamp: Date.now(),
      ...(context?.path && /^\/[-a-z0-9._/]*$/.test(context.path) ? { context } : {}),
    };

    this.messages.push(message);
    if (this.messages.length > MAX_MESSAGES) {
      this.messages.shift();
    }

    this.broadcast(message);

    this.moderate(message, ws).catch((err) => {
      console.error("[moderation] unexpected error:", err);
    });
  }

  private handleUnblock(ws: WebSocket, ip: string): void {
    const info = this.connections.get(ws);
    if (!info?.isOwner) {
      this.sendError(ws, SERVER_ERROR_CODE.UNAUTHORIZED, "Only the owner can unblock users.");
      return;
    }

    this.blockedEntries.delete(ip);
    this.persistBlockedIps().catch((err) => {
      console.error("[unblock] failed to persist unblock:", err);
    });
    this.send(ws, { type: SERVER_MESSAGE_TYPE.UNBLOCKED, ip });
  }

  private handleDelete(ws: WebSocket, { id }: ClientDeleteData): void {
    const info = this.connections.get(ws);
    if (!info?.isOwner) return;

    const idx = this.messages.findIndex((m) => m.id === id);
    if (idx === -1) return;

    this.messages.splice(idx, 1);
    this.broadcast({ type: SERVER_MESSAGE_TYPE.REMOVE, id });
  }

  private handleFlag(ws: WebSocket, { id }: ClientFlagData): void {
    const info = this.connections.get(ws);
    if (!info?.isOwner) return;

    const message = this.messages.find((m) => m.id === id);
    if (!message) return;

    const targetUsername = message.username;

    // Find the target's IP from their connection
    let targetIp: string | undefined;
    for (const [, connInfo] of this.connections) {
      if (connInfo.username === targetUsername && !connInfo.isOwner) {
        targetIp = connInfo.ip;
        break;
      }
    }

    if (!targetIp) return;

    // Block the IP
    this.blockedEntries.set(targetIp, { username: targetUsername, blockedAt: Date.now() });
    this.persistBlockedIps().catch((err) => {
      console.error("[flag] failed to persist blocked IP:", err);
    });

    // Send BLOCKED to all of the target's sockets
    for (const [targetWs, connInfo] of this.connections) {
      if (connInfo.ip === targetIp && !connInfo.isOwner) {
        this.sendBlocked(targetWs, SERVER_ERROR_CODE.MODERATION_BLOCKED, "You have been blocked by the admin.");
        connInfo.isBlocked = true;
      }
    }

    // Respond to admin
    this.send(ws, {
      type: SERVER_MESSAGE_TYPE.FLAGGED,
      username: targetUsername,
      ip: targetIp,
      messageId: id,
    });
  }

  private handleDeleteByUser(ws: WebSocket, { username: targetUsername }: ClientDeleteByUserData): void {
    const info = this.connections.get(ws);
    if (!info?.isOwner) return;

    const toRemove = this.messages.filter((m) => m.username === targetUsername);
    this.messages = this.messages.filter((m) => m.username !== targetUsername);

    for (const msg of toRemove) {
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

    this.messages = this.messages.filter((m) => m.id !== message.id);
    this.broadcast({ type: SERVER_MESSAGE_TYPE.REMOVE, id: message.id });

    this.addWarning(senderWs);
  }

  private addWarning(ws: WebSocket): void {
    const info = this.connections.get(ws);
    if (!info) return;

    info.warnings++;

    if (info.warnings >= MAX_WARNINGS) {
      info.isBlocked = true;
      this.blockedEntries.set(info.ip, { username: info.username, blockedAt: Date.now() });
      this.persistBlockedIps().catch((err) => {
        console.error("[block] failed to persist blocked IP:", err);
      });
      this.sendBlocked(
        ws,
        SERVER_ERROR_CODE.MODERATION_BLOCKED,
        "You have been blocked from sending messages due to repeated violations.",
      );
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

  handleUnblockCommand(ws: WebSocket, ip: string): void {
    this.handleUnblock(ws, ip);
  }

  handleDeleteMessage(ws: WebSocket, messageId: string): void {
    this.handleDelete(ws, { id: messageId });
  }

  getBlockedEntries(): BlockedEntry[] {
    return [...this.blockedEntries.entries()].map(([ip, info]) => ({
      ip,
      username: info.username,
      blockedAt: info.blockedAt,
    }));
  }

  // ── Connection Helpers ───────────────────────────────────────────────

  private removeConnection(ws: WebSocket): void {
    this.ipBySocket.delete(ws);
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

  private sendBlocked(ws: WebSocket, code: ServerErrorCode, message: string): void {
    this.send(ws, { type: SERVER_MESSAGE_TYPE.BLOCKED, code, message });
  }

  private sendStatus(ws: WebSocket): void {
    this.send(ws, this.buildStatusMessage());
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
      // Deduplicate by clientId (multiple tabs share the same clientId);
      // fall back to ip+username for connections without one (e.g. owner)
      uniqueClients.add(info.clientId ?? `${info.ip}:${info.username}`);
    }
    return { type: SERVER_MESSAGE_TYPE.STATUS, isOwnerOnline, userCount: uniqueClients.size };
  }
}
