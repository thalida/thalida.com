import {
  generateRandomUsername,
  validateUsername,
  setAdminUsername,
  LS_ADMIN_TOKEN_KEY,
} from "@components/Chat/chat-utils";
import { truncateMiddle, formatMessageTime, renderNotice } from "@components/Chat/chat-render";

const RECONNECT_DELAY_MS = 3000;

const CLIENT_MESSAGE_TYPE = {
  JOIN: "join",
  MESSAGE: "message",
  DELETE: "delete",
  FLAG: "flag",
  DELETE_BY_USER: "delete_by_user",
  UNBLOCK: "unblock",
} as const;

const SERVER_MESSAGE_TYPE = {
  ERROR: "error",
  WARNING: "warning",
  BLOCKED: "blocked",
  UNBLOCKED: "unblocked",
  HELP: "help",
  FLAGGED: "flagged",
  BLOCKED_LIST: "blocked_list",
  JOINED: "joined",
  STATUS: "status",
  HISTORY: "history",
  REMOVE: "remove",
  MESSAGE: "message",
  RENAME: "rename",
} as const;

interface MessageContext {
  path: string;
}

type ServerMessage =
  | { type: "history"; messages: ChatMessage[] }
  | {
      type: "message";
      id: string;
      clientId: string;
      username: string;
      text: string;
      timestamp: number;
      context?: MessageContext;
    }
  | { type: "joined"; isOwner: boolean; username: string; isBlocked: boolean }
  | { type: "status"; isOwnerOnline: boolean; userCount: number }
  | { type: "error"; code: string; message: string }
  | { type: "remove"; id: string }
  | { type: "warning"; code: string; message: string }
  | { type: "blocked"; code: string; message: string }
  | { type: "unblocked"; clientId: string }
  | { type: "help"; commands: Array<{ name: string; description: string }> }
  | { type: "flagged"; username: string; clientId: string; messageId: string }
  | { type: "blocked_list"; entries: Array<{ clientId: string; username: string; blockedAt: number }> }
  | { type: "rename"; oldUsername: string; newUsername: string };

interface ChatMessage {
  id: string;
  clientId: string;
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

const usernameInput = document.getElementById("chat-username") as HTMLInputElement;
const usernameRow = document.getElementById("js-chat-username-row") as HTMLDivElement;
const messagesEl = document.getElementById("js-chat-messages") as HTMLDivElement;
const inputEl = document.getElementById("js-chat-input") as HTMLInputElement;
const sendBtn = document.getElementById("js-chat-send") as HTMLButtonElement;
const statusDotEl = document.getElementById("js-chat-status-dot") as HTMLSpanElement;
const ownerStatusEl = document.getElementById("js-chat-owner-status") as HTMLSpanElement;
const userCountEl = document.getElementById("js-chat-user-count") as HTMLSpanElement;

function getAdminToken(): string | null {
  return localStorage.getItem(LS_ADMIN_TOKEN_KEY);
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

const msgTpl = document.getElementById("chat-msg-tpl") as HTMLTemplateElement;
const noticeTpl = document.getElementById("chat-notice-tpl") as HTMLTemplateElement;

type ClientModAction =
  | { type: typeof CLIENT_MESSAGE_TYPE.DELETE; data: { id: string } }
  | { type: typeof CLIENT_MESSAGE_TYPE.FLAG; data: { id: string } }
  | { type: typeof CLIENT_MESSAGE_TYPE.DELETE_BY_USER; data: { clientId: string } }
  | { type: typeof CLIENT_MESSAGE_TYPE.UNBLOCK; data: { clientId: string } };

function wsSend(data: ClientModAction): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(data));
}

function appendMessage(msg: ChatMessage): void {
  const isAdmin = adminUsername != null && msg.username === adminUsername;
  const frag = msgTpl.content.cloneNode(true) as DocumentFragment;
  const root = frag.firstElementChild as HTMLElement;

  root.dataset.msgId = String(msg.id);
  root.dataset.clientId = msg.clientId;

  const slot = (name: string) => root.querySelector(`[data-chat="${name}"]`) as HTMLElement;

  const usernameEl = slot("username");
  usernameEl.textContent = msg.username;
  if (isAdmin) usernameEl.dataset.admin = "";

  slot("time").textContent = formatMessageTime(msg.timestamp);

  if (msg.context) {
    const pageLink = slot("page") as HTMLAnchorElement;
    pageLink.href = msg.context.path;
    pageLink.textContent = truncateMiddle(msg.context.path, 25);
    pageLink.title = msg.context.path;
    pageLink.hidden = false;
    slot("at-sep").hidden = false;
  }

  slot("text").textContent = msg.text;

  if (isOwner) {
    const deleteBtn = slot("delete-btn") as HTMLButtonElement;
    deleteBtn.hidden = false;

    const snippet = msg.text.length > 50 ? msg.text.slice(0, 50) + "…" : msg.text;

    deleteBtn.addEventListener("click", () => {
      const currentName = usernameEl.textContent ?? msg.username;
      if (confirm(`Delete message from ${currentName}?\n\n"${snippet}"`)) {
        wsSend({ type: CLIENT_MESSAGE_TYPE.DELETE, data: { id: msg.id } });
      }
    });

    const flagBtn = slot("flag-btn") as HTMLButtonElement;
    if (!isAdmin) {
      flagBtn.hidden = false;
    }

    flagBtn.addEventListener("click", () => {
      const currentName = usernameEl.textContent ?? msg.username;
      if (confirm(`Flag & ban ${currentName}?\n\n"${snippet}"`)) {
        wsSend({ type: CLIENT_MESSAGE_TYPE.FLAG, data: { id: msg.id } });
      }
    });
  }

  messagesEl.appendChild(frag);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function appendSystemMessage(text: string, actions?: Array<{ label: string; action: () => void }>): HTMLElement {
  const root = renderNotice(noticeTpl, text, actions);
  messagesEl.appendChild(root);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return root;
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
      updateAdminUI();
      setBlocked(data.isBlocked);
    } else if (data.type === SERVER_MESSAGE_TYPE.HISTORY) {
      messagesEl.innerHTML = "";
      for (const msg of data.messages) {
        appendMessage(msg);
      }
    } else if (data.type === SERVER_MESSAGE_TYPE.MESSAGE) {
      appendMessage({
        id: data.id,
        clientId: data.clientId,
        username: data.username,
        text: data.text,
        timestamp: data.timestamp,
        context: data.context,
      });
    } else if (data.type === SERVER_MESSAGE_TYPE.STATUS) {
      updateStatus(data.isOwnerOnline, data.userCount);
    } else if (data.type === SERVER_MESSAGE_TYPE.ERROR) {
      const usernameErrors = new Set(["invalid_username", "reserved_username", "taken_username", "expired_username"]);

      if (data.code === "expired_username") {
        clearIdentity();
        username = generateRandomUsername();
        usernameInput.value = username;
        sendJoin();
        return;
      }

      if (pendingRename && usernameErrors.has(data.code)) {
        pendingRename = false;
        usernameInput.setCustomValidity(data.message);
        usernameInput.reportValidity();
        usernameInput.value = username ?? "";
        return;
      }

      if (usernameErrors.has(data.code) && autoRetries < MAX_AUTO_RETRIES) {
        autoRetries++;
        username = generateRandomUsername();
        usernameInput.value = username;
        sendJoin();
        return;
      }

      if (usernameErrors.has(data.code)) {
        appendSystemMessage("Could not auto-join. Please change your username and try saving.");
        usernameInput.focus();
        return;
      }

      appendSystemMessage(data.message);
    } else if (data.type === SERVER_MESSAGE_TYPE.REMOVE) {
      const el = messagesEl.querySelector(`[data-msg-id="${data.id}"]`);
      if (el) el.remove();
    } else if (data.type === SERVER_MESSAGE_TYPE.RENAME) {
      const usernameEls = messagesEl.querySelectorAll<HTMLElement>('[data-chat="username"]');
      for (const el of usernameEls) {
        if (el.textContent === data.oldUsername) {
          el.textContent = data.newUsername;
        }
      }
    } else if (data.type === SERVER_MESSAGE_TYPE.WARNING) {
      appendSystemMessage(data.message);
    } else if (data.type === SERVER_MESSAGE_TYPE.BLOCKED) {
      appendSystemMessage(data.message);
      setBlocked(true);
    } else if (data.type === SERVER_MESSAGE_TYPE.UNBLOCKED) {
      appendSystemMessage(`Unblocked user: ${data.clientId.slice(0, 8)}\u2026`);
    } else if (data.type === SERVER_MESSAGE_TYPE.HELP) {
      const lines = data.commands.map((c) => `  /${c.name} — ${c.description}`);
      appendSystemMessage(`Available commands:\n${lines.join("\n")}`);
    } else if (data.type === SERVER_MESSAGE_TYPE.FLAGGED) {
      appendSystemMessage(`Banned ${data.username}.\nDelete their messages?`, [
        {
          label: "all",
          action: () => wsSend({ type: CLIENT_MESSAGE_TYPE.DELETE_BY_USER, data: { clientId: data.clientId } }),
        },
        { label: "this one", action: () => wsSend({ type: CLIENT_MESSAGE_TYPE.DELETE, data: { id: data.messageId } }) },
        { label: "none", action: () => {} },
      ]);
    } else if (data.type === SERVER_MESSAGE_TYPE.BLOCKED_LIST) {
      if (data.entries.length === 0) {
        appendSystemMessage("No blocked users.");
      } else {
        appendSystemMessage(`Blocked users (${data.entries.length}):`);
        for (const e of data.entries) {
          const date = e.blockedAt > 0 ? new Date(e.blockedAt).toLocaleDateString() : "unknown date";
          appendSystemMessage(`  ${e.username} \u2014 ${e.clientId.slice(0, 8)}\u2026 (blocked ${date})`, [
            {
              label: "unblock",
              action: () => {
                wsSend({ type: CLIENT_MESSAGE_TYPE.UNBLOCK, data: { clientId: e.clientId } });
              },
            },
          ]);
        }
      }
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
  }, RECONNECT_DELAY_MS);
}

function sendMessage(): void {
  const text = inputEl.value.trim();
  if (!text || !ws || ws.readyState !== WebSocket.OPEN) return;

  const data: { text: string; context: MessageContext } = {
    text,
    context: { path: window.location.pathname },
  };

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
  if (isOwner) return;
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
    usernameInput.blur();
  } else if (e.key === "Escape") {
    usernameInput.value = username ?? "";
    usernameInput.blur();
  }
});
usernameInput.addEventListener("blur", () => {
  changeUsername();
});

function updateStatus(isOwnerOnline: boolean, userCount: number): void {
  const ownerLabel = adminUsername ?? "owner";
  statusDotEl.dataset.online = String(isOwnerOnline);
  ownerStatusEl.textContent = isOwnerOnline ? `${ownerLabel} online` : `${ownerLabel} offline`;
  ownerStatusEl.dataset.online = String(isOwnerOnline);
  const viewerText = `${userCount} online`;
  (userCountEl.querySelector('[data-chat="viewer-count"]') as HTMLElement).textContent = viewerText;
  userCountEl.title = viewerText;
}

function setBlocked(blocked: boolean): void {
  usernameRow.hidden = blocked;
  inputEl.disabled = blocked;
  sendBtn.disabled = blocked;
  inputEl.placeholder = blocked ? "You have been blocked." : "";
}

function updateAdminUI(): void {
  const adminLinks = document.querySelectorAll<HTMLAnchorElement>("#js-admin-link");
  for (const link of adminLinks) {
    if (isOwner) {
      link.href = "/logout";
      link.textContent = "logout";
    } else {
      link.href = "/login";
      link.textContent = "login";
    }
  }

  usernameInput.readOnly = isOwner;
  usernameInput.tabIndex = isOwner ? -1 : 0;
}

updateAdminUI();

sendBtn.addEventListener("click", sendMessage);
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

async function fetchConfig(): Promise<void> {
  try {
    const resp = await fetch(`${API_BASE}/config`);
    if (!resp.ok) return;
    const data = (await resp.json()) as { adminUsername?: string };
    if (data.adminUsername) {
      adminUsername = data.adminUsername;
      setAdminUsername(adminUsername);
      ownerStatusEl.textContent = `${adminUsername} offline`;
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
