# Portfolio Site with Live Chat -- Design

**Date:** 2026-02-15
**Branch:** v-2026

## Overview

Redesign thalida.com as a single-page portfolio with live chat. The page has three columns: a chat sidebar (left), a project tree directory (center), and a content viewer (right). Visitors can chat with each other and with thalida when she's online. No permanent chat history -- a rolling buffer of recent messages provides context, and refreshing starts a fresh session.

## Architecture

### Frontend (Astro, static)

- **Deployed to:** Cloudflare Pages
- **Framework:** Astro (static build)
- **Styling:** Default browser CSS only -- no Tailwind, no custom styles
- Single `index.astro` page with a 3-column HTML layout
- Content from `src/content` (projects, guides, gallery, versions, recipes, links) is read at build time via Astro content collections
- Tree data and all rendered content HTML are embedded in the page at build time
- Chat column uses client-side JS (vanilla TypeScript) to manage WebSocket connection

### Backend (Cloudflare Worker + Durable Object)

- **Deployed via:** Wrangler (Cloudflare Workers)
- **Language:** TypeScript
- A single Worker handles HTTP routing and WebSocket upgrade
- A single Durable Object (`ChatRoom`) manages all chat state in memory
- No database, no persistent storage

### Data Flow

1. Visitor loads static Astro page from Cloudflare Pages
2. Client JS opens WebSocket to the Worker (`wss://api.thalida.com/ws` or similar)
3. Worker routes the connection to the global `ChatRoom` Durable Object
4. Durable Object sends the recent message buffer, broadcasts new messages, tracks online users
5. Tree navigation and project content viewing are entirely client-side (pre-rendered at build time)

## Directory Structure

```
thalida.com/
├── app/                        # Astro frontend
│   ├── src/
│   │   ├── content/            # Content collections (from main branch)
│   │   │   ├── projects/
│   │   │   ├── guides/
│   │   │   ├── gallery/
│   │   │   ├── versions/
│   │   │   ├── recipes/
│   │   │   └── links/
│   │   ├── content.config.ts   # Collection definitions (from main branch)
│   │   ├── pages/
│   │   │   └── index.astro     # Single page: 3-column layout
│   │   ├── components/
│   │   │   ├── Chat.astro      # Chat column (client-side island)
│   │   │   ├── ProjectTree.astro
│   │   │   └── ContentViewer.astro
│   │   └── scripts/
│   │       └── chat-client.ts  # WebSocket client logic
│   ├── astro.config.mjs
│   ├── package.json
│   └── tsconfig.json
├── api/                        # Cloudflare Worker backend
│   ├── src/
│   │   ├── index.ts            # Worker entry (routing, auth, WS upgrade)
│   │   └── chat-room.ts        # Durable Object class
│   ├── wrangler.toml
│   ├── package.json
│   └── tsconfig.json
├── .gitignore
└── README.md
```

## Frontend Detail

### Column 1 -- Chat (left)

- Header: "Chat" title + status indicator ("thalida is online" / "thalida is offline")
- Shows count of currently connected users
- Message list: each message shows username + text, chronological order, auto-scrolls to bottom
- Input area at bottom: text input + send button
- On first message, user is prompted for a display name (stored in `sessionStorage`, cleared on refresh)
- On page load, WebSocket connects and receives the last ~50 messages from the buffer
- Refreshing the page gives the user a new identity (new sessionStorage)

### Column 2 -- Project Tree (center)

- Collapsible tree organized by collection: projects, guides, gallery, versions, recipes, links
- Each collection is a folder node; items inside are leaf nodes showing the title from frontmatter
- Built at Astro build time, embedded as data in the page
- Uses native `<details>/<summary>` HTML elements for expand/collapse
- Clicking a leaf highlights it and shows its content in the right column

### Column 3 -- Content Viewer (right)

- Displays the rendered markdown content of the selected item (title, description, images, body)
- All item HTML is pre-rendered by Astro at build time and embedded as hidden `<div>` elements
- Client JS toggles visibility based on tree selection
- Default state: "Click a project to view it" welcome message

## Backend Detail

### Worker (`api/src/index.ts`)

- Routes:
  - `GET /ws` -- Upgrades to WebSocket, passes connection to the `ChatRoom` Durable Object
  - `POST /auth` -- Accepts a secret token, returns a session token marking the connection as "thalida"
- CORS configured for the Astro site's domain

### Durable Object: ChatRoom (`api/src/chat-room.ts`)

- Single global instance (one room for the entire site)
- In-memory state (not persisted):
  - `messages: Array<{username, text, timestamp}>` -- rolling buffer, max 50
  - `connections: Map<WebSocket, {username, isOwner}>` -- all active connections

### WebSocket Protocol (JSON)

Client sends:

- `{type: "join", username: "visitor123", token?: "..."}` -- join with optional auth token
- `{type: "message", text: "hello"}` -- send a chat message

Server sends:

- `{type: "history", messages: [...]}` -- sent on connect, last ~50 messages
- `{type: "message", username, text, timestamp}` -- broadcast on new message
- `{type: "status", ownerOnline: true/false, userCount: N}` -- broadcast on connection changes

### Auth Flow

1. thalida visits a secret URL (e.g. `/?admin=SECRET`) or a `/login` page
2. Client stores a token in localStorage
3. On WebSocket connect, client sends the token in the `join` message
4. Worker verifies the token against an environment variable (`ADMIN_SECRET`)
5. If valid, the connection is flagged as `isOwner: true`
6. Durable Object broadcasts owner online/offline status on connect/disconnect

## Decisions & Trade-offs

- **All content embedded in a single page:** Keeps navigation instant (no page loads) but increases initial page size. Acceptable for a portfolio with ~30 content items.
- **No persistent chat storage:** Messages live only in the Durable Object's memory. If the DO is evicted (after ~30s of inactivity), the buffer resets to empty. This matches the stated requirement.
- **No database:** Keeps the stack simple. If persistent features are needed later, Cloudflare D1 or KV can be added.
- **No custom styling:** The initial version uses only default browser CSS. Styling can be layered on later without architectural changes.
- **sessionStorage for identity:** Users get a new random identity on each page load/refresh. No accounts, no persistence.

## Content Migration

The `src/content` directory and `content.config.ts` from the `main` branch need to be brought into `app/src/content` and `app/src/content.config.ts` on the `v-2026` branch. The content config can be simplified -- no pagination needed, no separate route pages, just the collection definitions and tree structure.

## Future Considerations (not in scope)

- Custom styling / theme
- Persistent chat history (D1)
- User accounts
- Mobile responsive layout
- Rate limiting on chat messages
- Content search
