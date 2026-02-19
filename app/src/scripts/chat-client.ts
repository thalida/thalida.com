import { generateRandomUsername, validateUsername, setReservedNames } from "./chat-utils";

const CLIENT_MESSAGE_TYPE = {
  JOIN: "join",
  MESSAGE: "message",
} as const;

const SERVER_MESSAGE_TYPE = {
  ERROR: "error",
  WARNING: "warning",
  BLOCKED: "blocked",
  UNBLOCKED: "unblocked",
  JOINED: "joined",
  STATUS: "status",
  HISTORY: "history",
  REMOVE: "remove",
  MESSAGE: "message",
} as const;

type ServerMessage =
  | { type: "history"; messages: ChatMessage[] }
  | {
      type: "message";
      id: string;
      username: string;
      text: string;
      timestamp: number;
    }
  | { type: "joined"; isOwner: boolean; username: string }
  | { type: "status"; isOwnerOnline: boolean; userCount: number }
  | { type: "error"; code: string; message: string }
  | { type: "remove"; id: string }
  | { type: "warning"; code: string; message: string }
  | { type: "blocked"; code: string; message: string }
  | { type: "unblocked"; ip: string };

interface ChatMessage {
  id: string;
  username: string;
  text: string;
  timestamp: number;
}

const MAX_AUTO_RETRIES = 5;

const WS_URL =
  document.querySelector<HTMLMetaElement>('meta[name="chat-ws-url"]')?.content?.trim() || "ws://localhost:8787/ws";
const API_BASE = WS_URL.replace(/^ws(s?):/, "http$1:").replace(/\/ws$/, "");

let ws: WebSocket | null = null;
let username: string | null = null;
let isOwner = false;
let autoRetries = 0;
let pendingRename = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

const usernameInput = document.getElementById("chat-username") as HTMLInputElement;
const renameBtn = document.getElementById("chat-rename-btn") as HTMLButtonElement;
const messagesEl = document.getElementById("chat-messages") as HTMLDivElement;
const inputEl = document.getElementById("chat-input") as HTMLInputElement;
const sendBtn = document.getElementById("chat-send") as HTMLButtonElement;
const connectionStatusEl = document.getElementById("chat-connection-status") as HTMLSpanElement;
const ownerStatusEl = document.getElementById("chat-owner-status") as HTMLSpanElement;
const userCountEl = document.getElementById("chat-user-count") as HTMLSpanElement;
const adminBtn = document.getElementById("chat-admin-btn") as HTMLButtonElement;

function getAdminToken(): string | null {
  return localStorage.getItem("admin_token");
}

function appendMessage(msg: ChatMessage): void {
  const div = document.createElement("div");
  div.dataset.msgId = String(msg.id);
  const time = new Date(msg.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  div.textContent = `[${time}] ${msg.username}: ${msg.text}`;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function appendNotice(text: string): void {
  const div = document.createElement("div");
  div.textContent = text;
  div.style.fontStyle = "italic";
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function sendJoin(): void {
  if (!ws || ws.readyState !== WebSocket.OPEN || !username) return;

  const token = getAdminToken();
  const data: Record<string, string> = { username };
  if (token) data.token = token;
  ws.send(JSON.stringify({ type: CLIENT_MESSAGE_TYPE.JOIN, data }));
}

function connect(): void {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  connectionStatusEl.textContent = "connecting...";
  ws = new WebSocket(WS_URL);

  ws.addEventListener("open", () => {
    connectionStatusEl.textContent = "online";
    sendJoin();
  });

  ws.addEventListener("message", (event) => {
    const data = JSON.parse(event.data) as ServerMessage;

    if (data.type === SERVER_MESSAGE_TYPE.JOINED) {
      isOwner = data.isOwner;
      username = data.username;
      usernameInput.value = data.username;
      usernameInput.readOnly = isOwner;
      renameBtn.disabled = isOwner;
      updateAdminBtn();
    } else if (data.type === SERVER_MESSAGE_TYPE.HISTORY) {
      messagesEl.innerHTML = "";
      for (const msg of data.messages) {
        appendMessage(msg);
      }
    } else if (data.type === SERVER_MESSAGE_TYPE.MESSAGE) {
      appendMessage({
        id: data.id,
        username: data.username,
        text: data.text,
        timestamp: data.timestamp,
      });
    } else if (data.type === SERVER_MESSAGE_TYPE.STATUS) {
      ownerStatusEl.textContent = data.isOwnerOnline ? "thalida: online" : "thalida: offline";
      ownerStatusEl.dataset.online = String(data.isOwnerOnline);
      userCountEl.textContent = `${data.userCount} user${data.userCount !== 1 ? "s" : ""} connected`;
    } else if (data.type === SERVER_MESSAGE_TYPE.ERROR) {
      if (pendingRename) {
        pendingRename = false;
        usernameInput.setCustomValidity(data.message);
        usernameInput.reportValidity();
        usernameInput.value = username ?? "";
        return;
      }

      if (autoRetries < MAX_AUTO_RETRIES) {
        autoRetries++;
        username = generateRandomUsername();
        usernameInput.value = username;
        sendJoin();
        return;
      }

      appendNotice("Could not auto-join. Please change your username and try saving.");
      usernameInput.focus();
    } else if (data.type === SERVER_MESSAGE_TYPE.REMOVE) {
      const el = messagesEl.querySelector(`[data-msg-id="${data.id}"]`);
      if (el) el.remove();
    } else if (data.type === SERVER_MESSAGE_TYPE.WARNING) {
      appendNotice(data.message);
    } else if (data.type === SERVER_MESSAGE_TYPE.BLOCKED) {
      appendNotice(data.message);
      inputEl.disabled = true;
      sendBtn.disabled = true;
      inputEl.placeholder = "You have been blocked.";
    } else if (data.type === SERVER_MESSAGE_TYPE.UNBLOCKED) {
      appendNotice(`Unblocked IP: ${data.ip}`);
    }
  });

  ws.addEventListener("close", () => {
    connectionStatusEl.textContent = "reconnecting...";
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

  ws.send(JSON.stringify({ type: CLIENT_MESSAGE_TYPE.MESSAGE, data: { text } }));
  inputEl.value = "";
}

function validateUsernameInput(): boolean {
  const pos = usernameInput.selectionStart;
  usernameInput.value = usernameInput.value.toLowerCase();
  usernameInput.setSelectionRange(pos, pos);

  const result = validateUsername(usernameInput.value.trim());

  usernameInput.setCustomValidity(result.error ?? "");
  return result.valid;
}

function changeUsername(): void {
  if (!validateUsernameInput()) {
    usernameInput.reportValidity();
    return;
  }

  const newName = usernameInput.value.trim().toLowerCase().slice(0, 20);
  if (newName === username) return;

  pendingRename = true;
  username = newName;
  sendJoin();
}

usernameInput.addEventListener("input", () => validateUsernameInput());
usernameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    changeUsername();
  }
});
renameBtn.addEventListener("click", changeUsername);

function updateAdminBtn(): void {
  adminBtn.textContent = isOwner ? "admin logout" : "admin login";
}

function reconnect(): void {
  if (ws) {
    ws.close();
    ws = null;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  connect();
}

adminBtn.addEventListener("click", async () => {
  if (isOwner) {
    localStorage.removeItem("admin_token");
    isOwner = false;
    username = generateRandomUsername();
    usernameInput.value = username;
    usernameInput.readOnly = false;
    renameBtn.disabled = false;
    updateAdminBtn();
    reconnect();
    return;
  }

  const secret = prompt("Enter admin secret:");
  if (!secret) return;

  try {
    const resp = await fetch(`${API_BASE}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: secret }),
    });
    const result = (await resp.json()) as { ok: boolean };
    if (!result.ok) {
      alert("Invalid admin secret.");
      return;
    }
  } catch {
    alert("Could not verify admin secret. Please try again.");
    return;
  }

  localStorage.setItem("admin_token", secret);
  username = "thalida";
  reconnect();
});

updateAdminBtn();

sendBtn.addEventListener("click", sendMessage);
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

async function fetchConfig(): Promise<void> {
  try {
    const resp = await fetch(`${API_BASE}/config`);
    const data = (await resp.json()) as { ok: boolean; reservedNames?: string[] };
    if (data.ok && Array.isArray(data.reservedNames)) {
      setReservedNames(data.reservedNames);
    }
  } catch {
    console.warn("[chat] failed to fetch config, reserved name validation will be skipped client-side");
  }
}

fetchConfig().then(() => {
  username = generateRandomUsername();
  usernameInput.value = username;
  connect();
});
