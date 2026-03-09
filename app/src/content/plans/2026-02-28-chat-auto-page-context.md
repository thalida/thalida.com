---
title: "Chat Auto Page Context Implementation Plan"
description: "Silently attach the current page path to every chat message automatically, removing the user-facing page/general context selector entirely."
publishedOn: 2026-02-28
planType: "implementation"
topic: "chat-auto-page-context"
status: "completed"
---

# Chat Auto Page Context Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Silently attach the current page path to every chat message automatically, removing the user-facing page/general context selector entirely.

**Architecture:** Replace the structured `{ collection, id, title }` context with a simple `{ path: string }` read from `window.location.pathname` at send time. The server validates the path with a regex before storing/broadcasting. No UI indicator — context is invisible to the sender.

**Tech Stack:** Astro, TypeScript, Cloudflare Workers / Durable Objects, WebSocket

---

### Task 1: Update `MessageContext` type in the API

**Files:**
- Modify: `api/src/types.ts:3-7`

**Step 1: Update the `MessageContext` interface**

Replace lines 3–7:
```ts
export interface MessageContext {
  path: string;
}
```

**Step 2: Verify `ClientChatData` still compiles (no change needed, it uses `MessageContext` by reference)**

Check `api/src/types.ts:42-45` — `context?: MessageContext` already uses the type, no edit needed.

**Step 3: Run API type-check**

```bash
just api::typecheck
```
Expected: no errors (or command not found — skip if unavailable, TypeScript errors will surface in next task)

---

### Task 2: Update server-side context validation in `chat-room.ts`

**Files:**
- Modify: `api/src/chat-room.ts:237-244`

**Step 1: Replace the context inclusion check**

Current code at line 243:
```ts
...(context?.collection && context?.id && context?.title ? { context } : {}),
```

Replace with:
```ts
...(context?.path && /^\/[a-z0-9\-._/]*$/.test(context.path) ? { context } : {}),
```

The full updated `message` object block (lines 237–244) becomes:
```ts
const message: ChatMessage = {
  type: SERVER_MESSAGE_TYPE.MESSAGE,
  id: uuidv7(),
  username: info.username,
  text,
  timestamp: Date.now(),
  ...(context?.path && /^\/[a-z0-9\-._/]*$/.test(context.path) ? { context } : {}),
};
```

**Step 2: Run API type-check**

```bash
just api::typecheck
```
Expected: no errors

**Step 3: Commit**

```bash
git add api/src/types.ts api/src/chat-room.ts
git commit -m "feat: simplify MessageContext to { path } with server-side validation"
```

---

### Task 3: Update `chat-client.ts` — types and message display

**Files:**
- Modify: `app/src/components/Chat/chat-client.ts:22-26` (local `MessageContext` interface)
- Modify: `app/src/components/Chat/chat-client.ts:28-52` (ServerMessage union — context shape)
- Modify: `app/src/components/Chat/chat-client.ts:107-134` (`appendMessage`)

**Step 1: Update the local `MessageContext` interface (lines 22–26)**

Replace:
```ts
interface MessageContext {
  collection: string;
  id: string;
  title: string;
}
```
With:
```ts
interface MessageContext {
  path: string;
}
```

**Step 2: Update `appendMessage` context rendering (lines 115–126)**

Current:
```ts
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
```

Replace with:
```ts
if (msg.context) {
  const contextLine = document.createElement("div");
  contextLine.style.fontSize = "0.85em";
  contextLine.style.opacity = "0.7";
  const label = document.createTextNode("on: ");
  const link = document.createElement("a");
  link.href = msg.context.path;
  link.textContent = msg.context.path;
  contextLine.appendChild(label);
  contextLine.appendChild(link);
  div.appendChild(contextLine);
}
```

**Step 3: Run app type-check**

```bash
just app::typecheck
```
Expected: no errors (some may still exist from removed vars — that's fine, those are removed in Task 4)

---

### Task 4: Update `chat-client.ts` — remove context UI, always send path

**Files:**
- Modify: `app/src/components/Chat/chat-client.ts`

**Step 1: Remove `currentContext` module-level variable (line 71)**

Delete the line:
```ts
let currentContext: MessageContext | null = null;
```

**Step 2: Remove `contextEl` and `contextSelect` DOM references (lines 80–81)**

Delete both lines:
```ts
const contextEl = document.getElementById("js-chat-context") as HTMLSpanElement;
const contextSelect = document.getElementById("js-chat-context-select") as HTMLSelectElement;
```

**Step 3: Update `sendMessage()` to always attach path context (lines 254–263)**

Current:
```ts
function sendMessage(): void {
  const text = inputEl.value.trim();
  if (!text || !ws || ws.readyState !== WebSocket.OPEN) return;

  const data: { text: string; context?: MessageContext } = { text };
  if (currentContext && contextSelect.value === "page") data.context = currentContext;

  ws.send(JSON.stringify({ type: CLIENT_MESSAGE_TYPE.MESSAGE, data }));
  inputEl.value = "";
}
```

Replace with:
```ts
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
```

**Step 4: Remove `updatePlaceholder()` function and its listener (lines 325–354)**

Delete the entire `updatePlaceholder` function:
```ts
function updatePlaceholder(): void {
  if (currentContext && contextSelect.value === "page") {
    inputEl.placeholder = `Message about ${currentContext.title}...`;
  } else {
    inputEl.placeholder = "Type a message...";
  }
}
```

Also delete the listener line:
```ts
contextSelect.addEventListener("change", updatePlaceholder);
```

**Step 5: Remove `readPageContext()` and related listeners (lines 333–357)**

Delete the entire `readPageContext` function:
```ts
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
```

Also delete these two lines:
```ts
readPageContext();
document.addEventListener("astro:after-swap", readPageContext);
```

**Step 6: Run app type-check**

```bash
just app::typecheck
```
Expected: no errors

**Step 7: Commit**

```bash
git add app/src/components/Chat/chat-client.ts
git commit -m "feat: auto-attach current page path as chat context, remove context selector UI"
```

---

### Task 5: Remove context selector from `Chat.astro`

**Files:**
- Modify: `app/src/components/Chat/Chat.astro:55-61`

**Step 1: Remove the `<span id="js-chat-context">` block**

Delete lines 55–61:
```html
<span id="js-chat-context" hidden>
  about
  <select id="js-chat-context-select">
    <option value="page"></option>
    <option value="general">general</option>
  </select>
</span>
```

**Step 2: Commit**

```bash
git add app/src/components/Chat/Chat.astro
git commit -m "chore: remove chat context selector from UI"
```

---

### Task 6: Remove `page-context` meta tag from `BaseLayout.astro`

**Files:**
- Modify: `app/src/layouts/BaseLayout/BaseLayout.astro:43`
- Modify: `app/src/layouts/BaseLayout/BaseLayout.astro:10-21` (Props interface — remove `pageContext`)

**Step 1: Remove the meta tag (line 43)**

Delete:
```astro
{pageContext && <meta name="page-context" content={JSON.stringify(pageContext)} />}
```

**Step 2: Remove `pageContext` from the Props interface (lines 14–18)**

Remove:
```ts
pageContext?: {
  collection: string;
  id: string;
  title: string;
} | null;
```

**Step 3: Remove `pageContext` from the destructured props (line 21)**

Current:
```ts
const { title = "thalida", activePage, activeCollection, pageContext = null } = Astro.props;
```

Replace with:
```ts
const { title = "thalida", activePage, activeCollection } = Astro.props;
```

**Step 4: Run app type-check**

```bash
just app::typecheck
```
Expected: errors from pages that still pass `pageContext` to `BaseLayout` — fix those in the next step.

---

### Task 7: Remove `pageContext` prop from all page files

**Files:**
- Modify: `app/src/pages/about.astro`
- Modify: `app/src/pages/[collection]/post/[...id].astro`

**Step 1: Check which pages pass `pageContext`**

```bash
grep -rn "pageContext" app/src/pages/
```

**Step 2: Remove `pageContext` prop from `about.astro`**

Find the `<BaseLayout ... pageContext={...}>` call and remove the `pageContext={...}` prop entirely.

**Step 3: Remove `pageContext` prop from `[collection]/post/[...id].astro`**

Find the `<BaseLayout ... pageContext={...}>` call and remove the `pageContext={...}` prop. Also remove any variable that was only used for that prop (e.g. `pageTitle` if it was only used for context — check first).

**Step 4: Run app type-check**

```bash
just app::typecheck
```
Expected: no errors

**Step 5: Build to verify no build errors**

```bash
just app::build
```
Expected: build succeeds with no errors

**Step 6: Commit**

```bash
git add app/src/layouts/BaseLayout/BaseLayout.astro app/src/pages/about.astro "app/src/pages/[collection]/post/[...id].astro"
git commit -m "chore: remove pageContext prop from BaseLayout and pages"
```

---

### Task 8: Mark TODO complete

**Files:**
- Modify: `TODO.md`

**Step 1: Check the TODO item**

Open `TODO.md` and find `- [ ] chat page mapping` (line 6). Mark it complete:
```
- [x] chat page mapping
```

**Step 2: Commit**

```bash
git add TODO.md
git commit -m "chore: mark chat page mapping TODO complete"
```
