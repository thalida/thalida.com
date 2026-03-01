import { validateUsername, setAdminUsername, LS_ADMIN_TOKEN_KEY } from "@components/Chat/chat-utils";
import { truncateMiddle, formatMessageTime, renderNotice } from "@components/Chat/chat-render";

const RECONNECT_DELAY_MS = 3000;

const CLIENT_MESSAGE_TYPE = {
  JOIN: "join",
  RENAME: "rename",
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
      clientId?: string;
      isOwn?: boolean;
      username: string;
      text: string;
      timestamp: number;
      context?: MessageContext;
    }
  | { type: "joined"; isOwner: boolean; username: string; isBlocked: boolean }
  | { type: "status"; isOwnerOnline: boolean; userCount: number; onlineUsernames: string[] }
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
  clientId?: string;
  isOwn?: boolean;
  username: string;
  text: string;
  timestamp: number;
  context?: MessageContext;
}

const WS_URL =
  document.querySelector<HTMLMetaElement>('meta[name="chat-ws-url"]')?.content?.trim() || "ws://localhost:8787/ws";
const API_BASE = WS_URL.replace(/^ws(s?):/, "http$1:").replace(/\/ws$/, "");

const LS_CLIENT_ID_KEY = "chat_client_id";

let ws: WebSocket | null = null;
let username: string | null = null;
let clientId: string | null = null;
let adminUsername: string | null = null;
let isOwner = false;
let pendingRename = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

const usernameInput = document.querySelector('[data-chat="username-input"]') as HTMLInputElement;
const usernameRow = document.querySelector('[data-chat="username-row"]') as HTMLLabelElement;
const messagesEl = document.querySelector('[data-chat="messages"]') as HTMLDivElement;
const inputEl = document.querySelector('[data-chat="input"]') as HTMLInputElement;
const sendBtn = document.querySelector('[data-chat="send"]') as HTMLButtonElement;
const statusDotEl = document.querySelector('[data-chat="owner-status-dot"]') as HTMLSpanElement;
const ownerStatusEl = document.querySelector('[data-chat="owner-status"]') as HTMLSpanElement;
const ownerWrapEl = document.querySelector('[data-chat="owner-wrap"]') as HTMLSpanElement;
const userCountEl = document.querySelector('[data-chat="user-count"]') as HTMLSpanElement;

function getAdminToken(): string | null {
  return localStorage.getItem(LS_ADMIN_TOKEN_KEY);
}

function loadIdentity(): void {
  clientId = localStorage.getItem(LS_CLIENT_ID_KEY);
  if (!clientId) {
    clientId = crypto.randomUUID();
    localStorage.setItem(LS_CLIENT_ID_KEY, clientId);
  }
}

const msgTpl = document.querySelector('[data-chat="msg-tpl"]') as HTMLTemplateElement;
const noticeTpl = document.querySelector('[data-chat="notice-tpl"]') as HTMLTemplateElement;

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
  const isAdminMsg = adminUsername != null && msg.username === adminUsername;
  const frag = msgTpl.content.cloneNode(true) as DocumentFragment;
  const root = frag.firstElementChild as HTMLElement;

  root.dataset.msgId = String(msg.id);
  if (msg.clientId) root.dataset.clientId = msg.clientId;
  if (msg.isOwn) root.dataset.own = "";

  const slot = (name: string) => root.querySelector(`[data-chat="${name}"]`) as HTMLElement;

  const usernameEl = slot("username");
  usernameEl.textContent = msg.username;
  const isCurrentUser = msg.isOwn && msg.username === username;
  if (isCurrentUser) usernameEl.dataset.own = "";
  else if (isAdminMsg) usernameEl.dataset.admin = "";

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
    if (!isAdminMsg) {
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
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  const token = getAdminToken();
  const data: Record<string, string> = {};
  if (clientId) data.clientId = clientId;
  if (token) data.token = token;
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
        isOwn: data.isOwn,
        username: data.username,
        text: data.text,
        timestamp: data.timestamp,
        context: data.context,
      });
    } else if (data.type === SERVER_MESSAGE_TYPE.STATUS) {
      updateStatus(data.isOwnerOnline, data.userCount, data.onlineUsernames);
    } else if (data.type === SERVER_MESSAGE_TYPE.ERROR) {
      const usernameErrors = new Set(["invalid_username", "reserved_username", "taken_username"]);

      if (pendingRename && usernameErrors.has(data.code)) {
        pendingRename = false;
        usernameInput.setCustomValidity(data.message);
        usernameInput.reportValidity();
        usernameInput.value = username ?? "";
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
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  if (!validateUsernameInput()) {
    usernameInput.reportValidity();
    return;
  }

  const newName = usernameInput.value.trim().toLowerCase().slice(0, 20);
  if (newName === username) return;

  pendingRename = true;
  ws.send(JSON.stringify({ type: CLIENT_MESSAGE_TYPE.RENAME, data: { username: newName } }));
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

function updateStatus(isOwnerOnline: boolean, userCount: number, onlineUsernames: string[]): void {
  const ownerLabel = adminUsername ?? "owner";
  if (isOwnerOnline) statusDotEl.dataset.online = "";
  else delete statusDotEl.dataset.online;
  ownerStatusEl.textContent = ownerLabel;
  ownerWrapEl.title = `Site owner: ${isOwnerOnline ? "online" : "offline"}`;
  (userCountEl.querySelector('[data-chat="viewer-count"]') as HTMLElement).textContent = String(userCount);
  userCountEl.title = `${userCount} online`;

  const onlineSet = new Set(onlineUsernames);
  for (const row of messagesEl.querySelectorAll<HTMLElement>("[data-msg-id]")) {
    const dot = row.querySelector<HTMLElement>('[data-chat="status-dot"]');
    const usernameEl = row.querySelector<HTMLElement>('[data-chat="username"]');
    if (!dot || !usernameEl) continue;
    if (onlineSet.has(usernameEl.textContent ?? "")) {
      dot.dataset.online = "";
    } else {
      delete dot.dataset.online;
    }
  }
}

function setBlocked(blocked: boolean): void {
  usernameRow.hidden = blocked;
  inputEl.disabled = blocked;
  sendBtn.disabled = blocked;
  inputEl.placeholder = blocked ? "You have been blocked." : "";
}

function updateAdminUI(): void {
  const adminLinks = document.querySelectorAll<HTMLAnchorElement>('[data-nav="admin-link"]');
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
      ownerStatusEl.textContent = adminUsername;
    }
  } catch {
    console.warn("[chat] failed to fetch config, reserved name validation will be skipped client-side");
  }
}

fetchConfig().then(() => {
  loadIdentity();
  connect();
});
