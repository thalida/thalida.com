interface ChatMessage {
  username: string;
  text: string;
  timestamp: number;
}

interface ConnectionInfo {
  username: string;
  isOwner: boolean;
}

type ClientMessage =
  | { type: "join"; username: string; token?: string }
  | { type: "message"; text: string };

type ServerMessage =
  | { type: "history"; messages: ChatMessage[] }
  | { type: "message"; username: string; text: string; timestamp: number }
  | { type: "status"; ownerOnline: boolean; userCount: number };

const MAX_MESSAGES = 50;

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

    this.state.acceptWebSocket(server);

    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(ws: WebSocket, rawMessage: string | ArrayBuffer): void {
    const data = JSON.parse(
      typeof rawMessage === "string"
        ? rawMessage
        : new TextDecoder().decode(rawMessage),
    ) as ClientMessage;

    if (data.type === "join") {
      const isOwner =
        typeof data.token === "string" &&
        data.token.length > 0 &&
        data.token === (this.env.ADMIN_SECRET as string);

      const info: ConnectionInfo = {
        username: data.username,
        isOwner,
      };
      this.connections.set(ws, info);

      // Send message history to the new connection
      this.send(ws, { type: "history", messages: this.messages });

      // Broadcast updated status to everyone
      this.broadcastStatus();
      return;
    }

    if (data.type === "message") {
      const info = this.connections.get(ws);
      if (!info) return;

      const message: ChatMessage = {
        username: info.username,
        text: data.text,
        timestamp: Date.now(),
      };

      this.messages.push(message);
      if (this.messages.length > MAX_MESSAGES) {
        this.messages.shift();
      }

      this.broadcast({
        type: "message",
        username: message.username,
        text: message.text,
        timestamp: message.timestamp,
      });
    }
  }

  webSocketClose(ws: WebSocket): void {
    this.connections.delete(ws);
    this.broadcastStatus();
  }

  webSocketError(ws: WebSocket): void {
    this.connections.delete(ws);
    this.broadcastStatus();
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
