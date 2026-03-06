import type { ServerMessage, ChatMessage, MessageContext, ClientModAction } from "./chat-types";
import { CLIENT_MESSAGE_TYPE, SERVER_MESSAGE_TYPE } from "./chat-types";
import { validateUsername, setAdminUsername } from "./chat-utils";
import { SS_SESSION_TOKEN_KEY } from "@lib/constants";
import { truncateMiddle, formatMessageTime, renderNotice } from "./chat-render";
import { createIdleManager } from "./chat-idle";
import type { ChatElements } from "./chat-dom";

const RECONNECT_DELAY_MS = 3000;
const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const LS_CLIENT_ID_KEY = "chat_client_id";
const LS_CLIENT_TOKEN_KEY = "chat_client_token";

interface ChatClientState {
  ws: WebSocket | null;
  username: string | null;
  clientId: string | null;
  clientToken: string | null;
  adminUsername: string | null;
  isOwner: boolean;
  pendingRename: boolean;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  idleManager: ReturnType<typeof createIdleManager> | null;
}

export function createChatClient(els: ChatElements, wsUrl: string): void {
  const apiBase = wsUrl.replace(/^ws(s?):/, "http$1:").replace(/\/ws$/, "");

  const state: ChatClientState = {
    ws: null,
    username: null,
    clientId: null,
    clientToken: null,
    adminUsername: null,
    isOwner: false,
    pendingRename: false,
    reconnectTimer: null,
    idleManager: null,
  };

  // ---------------------------------------------------------------------------
  // Identity
  // ---------------------------------------------------------------------------

  function getSessionToken(): string | null {
    return sessionStorage.getItem(SS_SESSION_TOKEN_KEY);
  }

  function loadIdentity(): void {
    state.clientId = localStorage.getItem(LS_CLIENT_ID_KEY);
    state.clientToken = localStorage.getItem(LS_CLIENT_TOKEN_KEY);

    // One-time cleanup: remove stale clientId from old client-side generation
    // (server won't trust it without a signed token)
    if (state.clientId && !state.clientToken) {
      localStorage.removeItem(LS_CLIENT_ID_KEY);
      state.clientId = null;
    }

    // Remove legacy keys
    localStorage.removeItem("admin_token");
    localStorage.removeItem("chat_username");
  }

  // ---------------------------------------------------------------------------
  // WebSocket helpers
  // ---------------------------------------------------------------------------

  function wsSend(data: ClientModAction): void {
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;
    state.ws.send(JSON.stringify(data));
  }

  // ---------------------------------------------------------------------------
  // DOM rendering
  // ---------------------------------------------------------------------------

  function appendMessage(msg: ChatMessage): void {
    const isAdminMsg = state.adminUsername != null && msg.username === state.adminUsername;
    const frag = els.msgTpl.content.cloneNode(true) as DocumentFragment;
    const root = frag.firstElementChild as HTMLElement;

    root.dataset.msgId = String(msg.id);
    if (msg.clientId) root.dataset.clientId = msg.clientId;
    if (msg.isOwn) root.dataset.own = "";

    const el = (name: string) => root.querySelector(`[data-chat="${name}"]`) as HTMLElement;

    const usernameEl = el("username");
    usernameEl.textContent = msg.username;
    const isCurrentUser = msg.isOwn && msg.username === state.username;
    if (isCurrentUser) usernameEl.dataset.own = "";
    else if (isAdminMsg) usernameEl.dataset.admin = "";

    el("time").textContent = formatMessageTime(msg.timestamp);

    if (msg.context && msg.context.path.startsWith("/")) {
      const pageLink = el("page") as HTMLAnchorElement;
      pageLink.href = msg.context.path;
      pageLink.textContent = truncateMiddle(msg.context.path, 25);
      pageLink.title = msg.context.path;
      pageLink.hidden = false;
      el("at-sep").hidden = false;
    }

    el("text").textContent = msg.text;

    if (state.isOwner) {
      const deleteBtn = el("delete-btn") as HTMLButtonElement;
      deleteBtn.hidden = false;

      const snippet = msg.text.length > 50 ? msg.text.slice(0, 50) + "\u2026" : msg.text;

      deleteBtn.addEventListener("click", () => {
        const currentName = usernameEl.textContent ?? msg.username;
        if (confirm(`Delete message from ${currentName}?\n\n"${snippet}"`)) {
          wsSend({ type: CLIENT_MESSAGE_TYPE.DELETE, data: { id: msg.id } });
        }
      });

      const flagBtn = el("flag-btn") as HTMLButtonElement;
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

    els.messages.appendChild(frag);
    els.messages.scrollTop = els.messages.scrollHeight;
  }

  function appendSystemMessage(text: string, actions?: Array<{ label: string; action: () => void }>): HTMLElement {
    const root = renderNotice(els.noticeTpl, text, actions);
    els.messages.appendChild(root);
    els.messages.scrollTop = els.messages.scrollHeight;
    return root;
  }

  function updateStatus(isOwnerOnline: boolean, userCount: number, onlineUsernames: string[]): void {
    const ownerLabel = state.adminUsername ?? "owner";
    if (isOwnerOnline) els.statusDot.dataset.online = "";
    else delete els.statusDot.dataset.online;
    els.ownerStatus.textContent = ownerLabel;
    els.ownerWrap.title = `Site owner: ${isOwnerOnline ? "online" : "offline"}`;
    (els.userCount.querySelector('[data-chat="viewer-count"]') as HTMLElement).textContent = String(userCount);
    els.userCount.title = `${userCount} online`;

    const onlineSet = new Set(onlineUsernames);
    for (const row of els.messages.querySelectorAll<HTMLElement>("[data-msg-id]")) {
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
    els.usernameRow.hidden = blocked;
    els.input.disabled = blocked;
    els.sendBtn.disabled = blocked;
    els.input.placeholder = blocked ? "You have been blocked." : "";
  }

  function updateAdminUI(): void {
    const adminLinks = document.querySelectorAll<HTMLAnchorElement>('[data-nav="admin-link"]');
    for (const link of adminLinks) {
      if (state.isOwner) {
        link.href = "/logout";
        link.textContent = "logout";
      } else {
        link.href = "/login";
        link.textContent = "login";
      }
    }

    els.usernameInput.readOnly = state.isOwner;
    els.usernameInput.tabIndex = state.isOwner ? -1 : 0;
  }

  // ---------------------------------------------------------------------------
  // Message handlers (dispatch map)
  // ---------------------------------------------------------------------------

  const messageHandlers: Record<string, (data: ServerMessage) => void> = {
    [SERVER_MESSAGE_TYPE.JOINED](data) {
      if (data.type !== "joined") return;
      state.isOwner = data.isOwner;
      state.username = data.username;
      els.usernameInput.value = data.username;

      // Store server-issued identity credentials (only present on first visit)
      if (data.clientId) {
        state.clientId = data.clientId;
        localStorage.setItem(LS_CLIENT_ID_KEY, data.clientId);
      }
      if (data.clientToken) {
        state.clientToken = data.clientToken;
        localStorage.setItem(LS_CLIENT_TOKEN_KEY, data.clientToken);
      }

      updateAdminUI();
      setBlocked(data.isBlocked);
    },

    [SERVER_MESSAGE_TYPE.HISTORY](data) {
      if (data.type !== "history") return;
      els.messages.replaceChildren();
      for (const msg of data.messages) {
        appendMessage(msg);
      }
    },

    [SERVER_MESSAGE_TYPE.MESSAGE](data) {
      if (data.type !== "message") return;
      appendMessage({
        id: data.id,
        clientId: data.clientId,
        isOwn: data.isOwn,
        username: data.username,
        text: data.text,
        timestamp: data.timestamp,
        context: data.context,
      });
    },

    [SERVER_MESSAGE_TYPE.STATUS](data) {
      if (data.type !== "status") return;
      updateStatus(data.isOwnerOnline, data.userCount, data.onlineUsernames);
    },

    [SERVER_MESSAGE_TYPE.ERROR](data) {
      if (data.type !== "error") return;
      const usernameErrors = new Set(["invalid_username", "reserved_username", "taken_username"]);

      if (state.pendingRename && usernameErrors.has(data.code)) {
        state.pendingRename = false;
        els.usernameInput.setCustomValidity(data.message);
        els.usernameInput.reportValidity();
        els.usernameInput.value = state.username ?? "";
        return;
      }

      appendSystemMessage(data.message);
    },

    [SERVER_MESSAGE_TYPE.REMOVE](data) {
      if (data.type !== "remove") return;
      const el = els.messages.querySelector(`[data-msg-id="${CSS.escape(data.id)}"]`);
      if (el) el.remove();
    },

    [SERVER_MESSAGE_TYPE.CLEAR]() {
      els.messages.replaceChildren();
    },

    [SERVER_MESSAGE_TYPE.RENAME](data) {
      if (data.type !== "rename") return;
      const usernameEls = els.messages.querySelectorAll<HTMLElement>('[data-chat="username"]');
      for (const el of usernameEls) {
        if (el.textContent === data.oldUsername) {
          el.textContent = data.newUsername;
        }
      }
    },

    [SERVER_MESSAGE_TYPE.WARNING](data) {
      if (data.type !== "warning") return;
      appendSystemMessage(data.message);
    },

    [SERVER_MESSAGE_TYPE.BLOCKED](data) {
      if (data.type !== "blocked") return;
      appendSystemMessage(data.message);
      setBlocked(true);
    },

    [SERVER_MESSAGE_TYPE.UNBLOCKED](data) {
      if (data.type !== "unblocked") return;
      appendSystemMessage(`Unblocked user: ${data.clientId.slice(0, 8)}\u2026`);
    },

    [SERVER_MESSAGE_TYPE.HELP](data) {
      if (data.type !== "help") return;
      const lines = data.commands.map((c) => `  /${c.name} \u2014 ${c.description}`);
      appendSystemMessage(`Available commands:\n${lines.join("\n")}`);
    },

    [SERVER_MESSAGE_TYPE.FLAGGED](data) {
      if (data.type !== "flagged") return;
      appendSystemMessage(`Banned ${data.username}.\nDelete their messages?`, [
        {
          label: "all",
          action: () => wsSend({ type: CLIENT_MESSAGE_TYPE.DELETE_BY_USER, data: { clientId: data.clientId } }),
        },
        { label: "this one", action: () => wsSend({ type: CLIENT_MESSAGE_TYPE.DELETE, data: { id: data.messageId } }) },
        { label: "none", action: () => {} },
      ]);
    },

    [SERVER_MESSAGE_TYPE.BLOCKED_LIST](data) {
      if (data.type !== "blocked_list") return;
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
    },
  };

  // ---------------------------------------------------------------------------
  // Connection management
  // ---------------------------------------------------------------------------

  function sendJoin(): void {
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;

    const token = getSessionToken();
    const data: Record<string, string> = {};
    if (state.clientId) data.clientId = state.clientId;
    if (state.clientToken) data.clientToken = state.clientToken;
    if (token) data.token = token;
    state.ws.send(JSON.stringify({ type: CLIENT_MESSAGE_TYPE.JOIN, data }));
  }

  function connect(): void {
    if (state.ws && (state.ws.readyState === WebSocket.OPEN || state.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    // Enforce wss:// for non-localhost connections (SEC-3)
    const url = new URL(wsUrl);
    if (url.protocol === "ws:" && url.hostname !== "localhost" && !url.hostname.startsWith("127.")) {
      url.protocol = "wss:";
    }

    state.ws = new WebSocket(url.toString());

    state.ws.addEventListener("open", () => {
      sendJoin();
    });

    state.ws.addEventListener("message", (event) => {
      let data: ServerMessage;
      try {
        data = JSON.parse(event.data) as ServerMessage;
      } catch {
        console.warn("[chat] received malformed message");
        return;
      }
      const handler = messageHandlers[data.type];
      if (handler) handler(data);
    });

    state.ws.addEventListener("close", () => {
      scheduleReconnect();
    });

    state.ws.addEventListener("error", () => {
      state.ws?.close();
    });
  }

  function scheduleReconnect(): void {
    if (state.idleManager?.isIdle) return;
    if (state.reconnectTimer) return;
    state.reconnectTimer = setTimeout(() => {
      state.reconnectTimer = null;
      connect();
    }, RECONNECT_DELAY_MS);
  }

  // ---------------------------------------------------------------------------
  // User actions
  // ---------------------------------------------------------------------------

  function sendMessage(): void {
    const text = els.input.value.trim();
    if (!text || !state.ws || state.ws.readyState !== WebSocket.OPEN) return;

    const data: { text: string; context: MessageContext } = {
      text,
      context: { path: window.location.pathname },
    };

    state.ws.send(JSON.stringify({ type: CLIENT_MESSAGE_TYPE.MESSAGE, data }));
    els.input.value = "";
  }

  function validateUsernameInput(): boolean {
    const pos = els.usernameInput.selectionStart;
    els.usernameInput.value = els.usernameInput.value.toLowerCase();
    els.usernameInput.setSelectionRange(pos, pos);

    const result = validateUsername(els.usernameInput.value.trim());

    els.usernameInput.setCustomValidity(result.error ?? "");
    return result.valid;
  }

  function changeUsername(): void {
    if (state.isOwner) return;
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;
    if (!validateUsernameInput()) {
      els.usernameInput.reportValidity();
      return;
    }

    const newName = els.usernameInput.value.trim().toLowerCase().slice(0, 20);
    if (newName === state.username) return;

    state.pendingRename = true;
    state.ws.send(JSON.stringify({ type: CLIENT_MESSAGE_TYPE.RENAME, data: { username: newName } }));
  }

  // ---------------------------------------------------------------------------
  // Config fetching
  // ---------------------------------------------------------------------------

  async function fetchConfig(): Promise<void> {
    try {
      const resp = await fetch(`${apiBase}/config`);
      if (!resp.ok) return;
      const data = (await resp.json()) as { adminUsername?: string };
      if (data.adminUsername) {
        state.adminUsername = data.adminUsername;
        setAdminUsername(state.adminUsername);
        els.ownerStatus.textContent = state.adminUsername;
      }
    } catch {
      console.warn("[chat] failed to fetch config, reserved name validation will be skipped client-side");
    }
  }

  // ---------------------------------------------------------------------------
  // Event listeners
  // ---------------------------------------------------------------------------

  els.usernameInput.addEventListener("input", () => validateUsernameInput());
  els.usernameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      changeUsername();
      els.usernameInput.blur();
    } else if (e.key === "Escape") {
      els.usernameInput.value = state.username ?? "";
      els.usernameInput.blur();
    }
  });
  els.usernameInput.addEventListener("blur", () => {
    changeUsername();
  });

  els.sendBtn.addEventListener("click", sendMessage);
  els.input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  updateAdminUI();

  fetchConfig().then(() => {
    loadIdentity();
    connect();

    state.idleManager = createIdleManager({
      timeoutMs: IDLE_TIMEOUT_MS,
      onIdle() {
        if (state.reconnectTimer) {
          clearTimeout(state.reconnectTimer);
          state.reconnectTimer = null;
        }
        state.ws?.close();
      },
      onActive() {
        connect();
      },
    });

    document.addEventListener("visibilitychange", () => {
      state.idleManager?.handleVisibilityChange(document.hidden);
    });

    const chatEl = document.querySelector('[data-chat="panel"]');
    if (chatEl) {
      for (const event of ["mousemove", "keydown", "touchstart"] as const) {
        chatEl.addEventListener(event, () => state.idleManager?.handleActivity(), { passive: true });
      }
    }
  });
}
