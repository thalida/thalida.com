export interface NoticeAction {
  label: string;
  action: () => void;
}

export function truncateMiddle(path: string, maxLen: number): string {
  if (path.length <= maxLen) return path;
  const sep = "/\u2026/";
  const budget = maxLen - sep.length;
  const headLen = Math.ceil(budget / 2);
  const tailLen = Math.floor(budget / 2);
  const parts = path.split("/").filter(Boolean);
  let head = "";
  let tail = "";
  for (const p of parts) {
    const next = head ? `${head}/${p}` : `/${p}`;
    if (next.length > headLen) break;
    head = next;
  }
  for (let i = parts.length - 1; i >= 0; i--) {
    const next = tail ? `${parts[i]}/${tail}` : parts[i];
    if (next.length > tailLen) break;
    tail = next;
  }
  if (!head) head = path.slice(0, headLen);
  if (!tail) tail = path.slice(-tailLen);
  return `${head}${sep}${tail}`;
}

export function formatMessageTime(timestamp: number): string {
  const msgDate = new Date(timestamp);
  const isRecent = Date.now() - timestamp < 24 * 60 * 60 * 1000;
  return isRecent
    ? msgDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
    : msgDate.toLocaleDateString([], { month: "short", day: "numeric" }) +
        ", " +
        msgDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function renderNotice(template: HTMLTemplateElement, text: string, actions?: NoticeAction[]): HTMLElement {
  const frag = template.content.cloneNode(true) as DocumentFragment;
  const root = frag.firstElementChild as HTMLElement;

  const timeEl = root.querySelector('[data-chat="notice-time"]') as HTMLElement;
  timeEl.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

  const textEl = root.querySelector('[data-chat="notice-text"]') as HTMLElement;
  textEl.textContent = text;

  if (actions && actions.length > 0) {
    const actionsEl = root.querySelector('[data-chat="notice-actions"]') as HTMLElement;
    actionsEl.hidden = false;

    actions.forEach((a, i) => {
      if (i > 0) actionsEl.appendChild(document.createTextNode(" · "));
      const span = document.createElement("span");
      span.textContent = `[${a.label}]`;
      span.className = "cursor-pointer text-text hover:text-teal";
      span.addEventListener("click", () => {
        a.action();
        actionsEl.hidden = true;
        textEl.textContent = `${text} — ${a.label}`;
      });
      actionsEl.appendChild(span);
    });
  }

  return root;
}
