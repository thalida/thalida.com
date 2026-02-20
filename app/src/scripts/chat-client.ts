import { generateRandomUsername, validateUsername, setAdminUsername } from "./chat-utils";

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

interface MessageContext {
  collection: string;
  id: string;
  title: string;
}

type ServerMessage =
  | { type: "history"; messages: ChatMessage[] }
  | {
      type: "message";
      id: string;
      username: string;
      text: string;
      timestamp: number;
      context?: MessageContext;
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
  context?: MessageContext;
}

const MAX_AUTO_RETRIES = 5;

const WS_URL =
  document.querySelector<HTMLMetaElement>('meta[name="chat-ws-url"]')?.content?.trim() || "ws://localhost:8787/ws";
const API_BASE = WS_URL.replace(/^ws(s?):/, "http$1:").replace(/\/ws$/, "");

const LS_USERNAME_KEY = "chat_username";
const LS_CLIENT_ID_KEY = "chat_client_id";

let ws: WebSocket | null = null;
let username: string | null = null;
let clientId: string | null = null;
let adminUsername: string | null = null;
let isOwner = false;
let autoRetries = 0;
let pendingRename = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let currentContext: MessageContext | null = null;

const usernameInput = document.getElementById("chat-username") as HTMLInputElement;
const renameBtn = document.getElementById("chat-rename-btn") as HTMLButtonElement;
const renameControls = document.getElementById("chat-rename-controls") as HTMLSpanElement;
const messagesEl = document.getElementById("chat-messages") as HTMLDivElement;
const inputEl = document.getElementById("chat-input") as HTMLInputElement;
const sendBtn = document.getElementById("chat-send") as HTMLButtonElement;
const ownerStatusEl = document.getElementById("chat-owner-status") as HTMLSpanElement;
const userCountEl = document.getElementById("chat-user-count") as HTMLSpanElement;
const adminLink = document.getElementById("chat-admin-link") as HTMLAnchorElement;
const contextEl = document.getElementById("chat-context") as HTMLSpanElement;
const contextSelect = document.getElementById("chat-context-select") as HTMLSelectElement;

function getAdminToken(): string | null {
  return localStorage.getItem("admin_token");
}

function loadIdentity(): void {
  clientId = localStorage.getItem(LS_CLIENT_ID_KEY);
  if (!clientId) {
    clientId = crypto.randomUUID();
    localStorage.setItem(LS_CLIENT_ID_KEY, clientId);
  }
  username = localStorage.getItem(LS_USERNAME_KEY);
}

function saveUsername(name: string): void {
  localStorage.setItem(LS_USERNAME_KEY, name);
}

function clearIdentity(): void {
  localStorage.removeItem(LS_USERNAME_KEY);
  localStorage.removeItem(LS_CLIENT_ID_KEY);
  clientId = crypto.randomUUID();
  localStorage.setItem(LS_CLIENT_ID_KEY, clientId);
}

function appendMessage(msg: ChatMessage): void {
  const div = document.createElement("div");
  div.dataset.msgId = String(msg.id);
  const time = new Date(msg.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (msg.context) {
    const contextLine = document.createElement("div");
    contextLine.style.fontSize = "0.85em";
    contextLine.style.opacity = "0.7";
    const label = document.createTextNode("on: ");
    const link = document.createElement("a");
    link.href = `/${msg.context.collection}/${msg.context.id}`;
    link.textContent = msg.context.title;
    contextLine.appendChild(label);
    contextLine.appendChild(link);
    div.appendChild(contextLine);
  }

  const messageLine = document.createElement("div");
  messageLine.textContent = `[${time}] ${msg.username}: ${msg.text}`;
  div.appendChild(messageLine);

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
  if (clientId) data.clientId = clientId;
  ws.send(JSON.stringify({ type: CLIENT_MESSAGE_TYPE.JOIN, data }));
}

function connect(): void {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  ws = new WebSocket(WS_URL);

  ws.addEventListener("open", () => {
    sendJoin();
  });

  ws.addEventListener("message", (event) => {
    const data = JSON.parse(event.data) as ServerMessage;

    if (data.type === SERVER_MESSAGE_TYPE.JOINED) {
      isOwner = data.isOwner;
      username = data.username;
      usernameInput.value = data.username;
      saveUsername(data.username);
      renameControls.hidden = isOwner;
      updateAdminUI();
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
        context: data.context,
      });
    } else if (data.type === SERVER_MESSAGE_TYPE.STATUS) {
      const ownerLabel = adminUsername ?? "owner";
      ownerStatusEl.textContent = data.isOwnerOnline ? `${ownerLabel}: online` : `${ownerLabel}: offline`;
      ownerStatusEl.dataset.online = String(data.isOwnerOnline);
      userCountEl.textContent = `${data.userCount} user${data.userCount !== 1 ? "s" : ""} connected`;
    } else if (data.type === SERVER_MESSAGE_TYPE.ERROR) {
      if (data.code === "expired_username") {
        clearIdentity();
        username = generateRandomUsername();
        usernameInput.value = username;
        sendJoin();
        return;
      }

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

  const data: { text: string; context?: MessageContext } = { text };
  if (currentContext && contextSelect.value === "page") data.context = currentContext;

  ws.send(JSON.stringify({ type: CLIENT_MESSAGE_TYPE.MESSAGE, data }));
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

function updateAdminUI(): void {
  if (isOwner) {
    adminLink.href = "/logout";
    adminLink.textContent = "logout";
  } else {
    adminLink.href = "/login";
    adminLink.textContent = "admin login";
  }
}

updateAdminUI();

sendBtn.addEventListener("click", sendMessage);
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

function updatePlaceholder(): void {
  if (currentContext && contextSelect.value === "page") {
    inputEl.placeholder = `Message about ${currentContext.title}...`;
  } else {
    inputEl.placeholder = "Type a message...";
  }
}

function readPageContext(): void {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="page-context"]');
  if (meta?.content) {
    try {
      const ctx = JSON.parse(meta.content) as MessageContext;
      currentContext = ctx;
      const pageOption = contextSelect.querySelector<HTMLOptionElement>('option[value="page"]');
      if (pageOption) pageOption.textContent = ctx.title;
      contextSelect.value = "page";
      contextEl.hidden = false;
    } catch {
      currentContext = null;
      contextEl.hidden = true;
    }
  } else {
    currentContext = null;
    contextEl.hidden = true;
  }
  updatePlaceholder();
}

contextSelect.addEventListener("change", updatePlaceholder);

readPageContext();
document.addEventListener("astro:after-swap", readPageContext);

async function fetchConfig(): Promise<void> {
  try {
    const resp = await fetch(`${API_BASE}/config`);
    if (!resp.ok) return;
    const data = (await resp.json()) as { adminUsername?: string };
    if (data.adminUsername) {
      adminUsername = data.adminUsername;
      setAdminUsername(adminUsername);
      ownerStatusEl.textContent = `${adminUsername}: offline`;
    }
  } catch {
    console.warn("[chat] failed to fetch config, reserved name validation will be skipped client-side");
  }
}

fetchConfig().then(() => {
  loadIdentity();
  if (!username) {
    username = generateRandomUsername();
  }
  usernameInput.value = username;
  connect();
});
