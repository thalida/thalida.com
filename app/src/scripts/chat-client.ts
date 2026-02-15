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

interface ChatMessage {
  id: string;
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

const joinForm = document.getElementById("chat-join") as HTMLFormElement;
const roomSection = document.getElementById("chat-room") as HTMLDivElement;
const usernameInput = document.getElementById(
  "chat-username",
) as HTMLInputElement;
const messagesEl = document.getElementById(
  "chat-messages",
) as HTMLDivElement;
const inputEl = document.getElementById("chat-input") as HTMLInputElement;
const sendBtn = document.getElementById("chat-send") as HTMLButtonElement;
const statusEl = document.getElementById("chat-status") as HTMLSpanElement;
const userCountEl = document.getElementById(
  "chat-user-count",
) as HTMLSpanElement;

function getAdminToken(): string | null {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("admin");
  if (token) {
    localStorage.setItem("admin_token", token);
    window.history.replaceState({}, "", window.location.pathname);
    return token;
  }
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

function connect(): void {
  if (
    ws &&
    (ws.readyState === WebSocket.OPEN ||
      ws.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  ws = new WebSocket(WS_URL);

  ws.addEventListener("open", () => {
    const token = getAdminToken();
    const joinMsg: Record<string, string> = {
      type: "join",
      username: username!,
    };
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
        id: data.id,
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
    } else if (data.type === "error") {
      username = null;
      ws?.close();
      joinForm.hidden = false;
      roomSection.hidden = true;
      usernameInput.focus();
      usernameInput.setCustomValidity(data.message);
      usernameInput.reportValidity();
    } else if (data.type === "remove") {
      const el = messagesEl.querySelector(`[data-msg-id="${data.id}"]`);
      if (el) el.remove();
    } else if (data.type === "warning") {
      appendNotice(data.message);
    } else if (data.type === "blocked") {
      appendNotice(data.message);
      inputEl.disabled = true;
      sendBtn.disabled = true;
      inputEl.placeholder = "You have been blocked.";
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

const RESERVED_NAMES = ["thalida", "tia"];

function validateUsername(): void {
  const pos = usernameInput.selectionStart;
  usernameInput.value = usernameInput.value.toLowerCase();
  usernameInput.setSelectionRange(pos, pos);

  const name = usernameInput.value.trim();
  if (RESERVED_NAMES.some((r) => name.includes(r))) {
    usernameInput.setCustomValidity("That name contains a reserved word.");
  } else {
    usernameInput.setCustomValidity("");
  }
}

function joinChat(): void {
  validateUsername();

  username = usernameInput.value.trim().toLowerCase().slice(0, 20);

  joinForm.hidden = true;
  roomSection.hidden = false;
  inputEl.disabled = false;
  sendBtn.disabled = false;
  inputEl.placeholder = "Type a message...";
  inputEl.focus();

  connect();
}

usernameInput.addEventListener("input", validateUsername);

usernameInput.focus();

joinForm.addEventListener("submit", (e) => {
  e.preventDefault();
  joinChat();
});
sendBtn.addEventListener("click", sendMessage);
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});
