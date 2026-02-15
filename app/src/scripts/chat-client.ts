type ServerMessage =
  | { type: "history"; messages: ChatMessage[] }
  | { type: "message"; username: string; text: string; timestamp: number }
  | { type: "status"; ownerOnline: boolean; userCount: number };

interface ChatMessage {
  username: string;
  text: string;
  timestamp: number;
}

const WS_URL =
  document
    .querySelector<HTMLMetaElement>('meta[name="chat-ws-url"]')
    ?.content?.trim() || "ws://localhost:8787/ws";

let ws: WebSocket | null = null;
let username: string | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

const messagesEl = document.getElementById(
  "chat-messages",
) as HTMLDivElement;
const inputEl = document.getElementById("chat-input") as HTMLInputElement;
const sendBtn = document.getElementById("chat-send") as HTMLButtonElement;
const statusEl = document.getElementById(
  "chat-status",
) as HTMLSpanElement;
const userCountEl = document.getElementById(
  "chat-user-count",
) as HTMLSpanElement;

function getAdminToken(): string | null {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("admin");
  if (token) {
    localStorage.setItem("admin_token", token);
    // Clean the URL
    window.history.replaceState({}, "", window.location.pathname);
    return token;
  }
  return localStorage.getItem("admin_token");
}

function getUsername(): string {
  if (!username) {
    const stored = sessionStorage.getItem("chat_username");
    if (stored) {
      username = stored;
    } else {
      const input = prompt("Choose a display name for chat:");
      username = input?.trim() || `visitor-${Math.floor(Math.random() * 10000)}`;
      sessionStorage.setItem("chat_username", username);
    }
  }
  return username;
}

function appendMessage(msg: ChatMessage): void {
  const div = document.createElement("div");
  const time = new Date(msg.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  div.textContent = `[${time}] ${msg.username}: ${msg.text}`;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function connect(): void {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  ws = new WebSocket(WS_URL);

  ws.addEventListener("open", () => {
    const name = getUsername();
    const token = getAdminToken();

    const joinMsg: Record<string, string> = { type: "join", username: name };
    if (token) joinMsg.token = token;

    ws!.send(JSON.stringify(joinMsg));
  });

  ws.addEventListener("message", (event) => {
    const data = JSON.parse(event.data) as ServerMessage;

    if (data.type === "history") {
      messagesEl.innerHTML = "";
      for (const msg of data.messages) {
        appendMessage(msg);
      }
    } else if (data.type === "message") {
      appendMessage({
        username: data.username,
        text: data.text,
        timestamp: data.timestamp,
      });
    } else if (data.type === "status") {
      statusEl.textContent = data.ownerOnline
        ? "thalida is online"
        : "thalida is offline";
      statusEl.dataset.online = String(data.ownerOnline);
      userCountEl.textContent = `${data.userCount} user${data.userCount !== 1 ? "s" : ""} connected`;
    }
  });

  ws.addEventListener("close", () => {
    statusEl.textContent = "disconnected";
    scheduleReconnect();
  });

  ws.addEventListener("error", () => {
    ws?.close();
  });
}

function scheduleReconnect(): void {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, 3000);
}

function sendMessage(): void {
  const text = inputEl.value.trim();
  if (!text || !ws || ws.readyState !== WebSocket.OPEN) return;

  ws.send(JSON.stringify({ type: "message", text }));
  inputEl.value = "";
}

sendBtn.addEventListener("click", sendMessage);
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

connect();
