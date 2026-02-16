interface ChatMessage {
  id: string;
  username: string;
  text: string;
  timestamp: number;
}

interface ConnectionInfo {
  username: string;
  isOwner: boolean;
  warnings: number;
  blocked: boolean;
}

type ClientMessage = { type: "join"; username: string; token?: string } | { type: "message"; text: string };

type ServerMessage =
  | { type: "history"; messages: ChatMessage[] }
  | {
      type: "message";
      id: string;
      username: string;
      text: string;
      timestamp: number;
    }
  | { type: "status"; ownerOnline: boolean; userCount: number }
  | { type: "error"; code: string; message: string }
  | { type: "remove"; id: string }
  | { type: "warning"; message: string }
  | { type: "blocked"; message: string };

import { v7 as uuidv7 } from "uuid";

const MAX_MESSAGES = 50;
const MAX_WARNINGS = 3;

export class ChatRoom implements DurableObject {
  private messages: ChatMessage[] = [];
  private connections: Map<WebSocket, ConnectionInfo> = new Map();

  constructor(
    private state: DurableObjectState,
    private env: Record<string, unknown>,
  ) {}

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];

    server.accept();

    server.addEventListener("message", (event) => {
      this.handleMessage(server, event.data);
    });

    server.addEventListener("close", () => {
      this.connections.delete(server);
      this.broadcastStatus();
    });

    server.addEventListener("error", () => {
      this.connections.delete(server);
      this.broadcastStatus();
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  private handleMessage(ws: WebSocket, raw: string | ArrayBuffer): void {
    const data = JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw)) as ClientMessage;

    if (data.type === "join") {
      const name = String(data.username ?? "")
        .trim()
        .toLowerCase()
        .slice(0, 20);
      if (name.length < 2 || !/^[a-z0-9_\-.]+$/.test(name)) {
        this.send(ws, {
          type: "error",
          code: "invalid_username",
          message: "Username must be 2-20 characters: lowercase letters, numbers, hyphens, underscores, or dots.",
        });
        return;
      }

      const isOwner =
        typeof data.token === "string" && data.token.length > 0 && data.token === (this.env.ADMIN_SECRET as string);

      const reserved = ["thalida", "tia"];
      if (reserved.some((r) => name.includes(r)) && !isOwner) {
        this.send(ws, {
          type: "error",
          code: "reserved_username",
          message: "That name contains a reserved word.",
        });
        return;
      }

      for (const [existingWs, info] of this.connections) {
        if (info.username === name && existingWs !== ws) {
          this.send(ws, {
            type: "error",
            code: "taken_username",
            message: "That name is already taken.",
          });
          return;
        }
      }

      this.connections.set(ws, {
        username: name,
        isOwner,
        warnings: 0,
        blocked: false,
      });

      this.send(ws, { type: "history", messages: this.messages });
      this.broadcastStatus();
      return;
    }

    if (data.type === "message") {
      const info = this.connections.get(ws);
      if (!info) return;

      if (info.blocked) {
        this.send(ws, {
          type: "blocked",
          message: "You have been blocked from sending messages due to repeated violations.",
        });
        return;
      }

      const text = String(data.text ?? "")
        .trim()
        .slice(0, 500);
      if (!text) return;

      const message: ChatMessage = {
        id: uuidv7(),
        username: info.username,
        text,
        timestamp: Date.now(),
      };

      this.messages.push(message);
      if (this.messages.length > MAX_MESSAGES) {
        this.messages.shift();
      }

      this.broadcast({
        type: "message",
        id: message.id,
        username: message.username,
        text: message.text,
        timestamp: message.timestamp,
      });

      this.moderate(message, ws, info).catch((err) => {
        console.error("[moderation] unexpected error:", err);
      });
    }
  }

  private async moderate(message: ChatMessage, senderWs: WebSocket, senderInfo: ConnectionInfo): Promise<void> {
    const apiKey = this.env.OPENAI_API_KEY as string | undefined;
    if (!apiKey) {
      console.warn("[moderation] skipped: OPENAI_API_KEY not set");
      return;
    }

    console.log(`[moderation] checking message ${message.id}: "${message.text}"`);

    const result = await this.callModerationAPI(apiKey, message.text);
    if (!result) return;

    const flagged = result.flagged ?? false;
    const categories = result.categories;
    console.log(
      `[moderation] result for ${message.id}: flagged=${flagged}`,
      categories
        ? `categories=${JSON.stringify(
            Object.entries(categories)
              .filter(([, v]) => v)
              .map(([k]) => k),
          )}`
        : "",
    );

    if (!flagged) return;

    console.log(`[moderation] removing message ${message.id} from ${senderInfo.username}`);

    this.messages = this.messages.filter((m) => m.id !== message.id);
    this.broadcast({ type: "remove", id: message.id });

    senderInfo.warnings++;
    console.log(`[moderation] ${senderInfo.username} now has ${senderInfo.warnings}/${MAX_WARNINGS} warnings`);

    if (senderInfo.warnings >= MAX_WARNINGS) {
      senderInfo.blocked = true;
      this.send(senderWs, {
        type: "blocked",
        message: "You have been blocked from sending messages due to repeated violations.",
      });
    } else {
      const remaining = MAX_WARNINGS - senderInfo.warnings;
      this.send(senderWs, {
        type: "warning",
        message: `Your message was removed for violating community guidelines. ${remaining} warning${remaining !== 1 ? "s" : ""} remaining before you are blocked.`,
      });
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

  private send(ws: WebSocket, message: ServerMessage): void {
    try {
      ws.send(JSON.stringify(message));
    } catch {
      this.connections.delete(ws);
    }
  }

  private broadcast(message: ServerMessage): void {
    for (const ws of this.connections.keys()) {
      this.send(ws, message);
    }
  }

  private broadcastStatus(): void {
    let ownerOnline = false;
    for (const info of this.connections.values()) {
      if (info.isOwner) {
        ownerOnline = true;
        break;
      }
    }

    this.broadcast({
      type: "status",
      ownerOnline,
      userCount: this.connections.size,
    });
  }
}
