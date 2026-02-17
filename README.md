# thalida.com

Portfolio site with a live chat, project tree, and content viewer.

## Project Structure

```
app/    Astro frontend (Cloudflare Pages)
api/    Cloudflare Worker + Durable Object (chat backend)
docs/   Design docs and plans
```

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- npm (comes with Node)
- make (pre-installed on macOS/Linux)

## Quick Start

```bash
make setup
```

This single command:

1. Installs dependencies for both `app/` and `api/`
2. Adds a shell alias so `make` works from any subfolder in the repo
3. Copies env templates (`api/.dev.vars`, `app/.env`) if they don't already exist

After setup, edit `api/.dev.vars` to add your secrets (see below), then start developing:

```bash
make api-dev    # Terminal 1 — API on http://localhost:8787
make app-dev    # Terminal 2 — App on http://localhost:4321
```

Run `make` or `make help` to see all available commands.

## Environment Variables

### API secrets (`api/.dev.vars`)

| Variable         | Required | Description                                                                                                                                               |
| ---------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ADMIN_SECRET`   | Yes      | Any secret string. Used to log in as the site owner.                                                                                                      |
| `OPENAI_API_KEY` | No       | OpenAI API key for chat moderation. Leave blank to skip moderation locally. Free at [platform.openai.com/api-keys](https://platform.openai.com/api-keys). |

### Frontend (`app/.env`)

| Variable             | Default                  | Description                                                                                |
| -------------------- | ------------------------ | ------------------------------------------------------------------------------------------ |
| `PUBLIC_CHAT_WS_URL` | `ws://localhost:8787/ws` | WebSocket URL for the chat API. Auto-updated by `make api-preview`.                        |
| `PUBLIC_R2_BASE_URL` | _(empty)_                | R2 public URL for media. Empty = local files. Set in Cloudflare Pages for deployed builds. |

## Log In as the Owner

Visit `http://localhost:4321?admin=YOUR_ADMIN_SECRET` (the value from `api/.dev.vars`). The token is saved to `localStorage`, so you only need to do this once per browser.

## Testing with Someone Else (Tunnels)

Share your local dev environment using [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) (free, no account needed). You need three terminals:

```bash
make api-dev       # Terminal 1 — start the API server
make api-preview   # Terminal 2 — tunnel the API, auto-updates app/.env
make app-preview   # Terminal 3 — builds frontend, previews on port 4322, tunnels it
```

`make api-preview` automatically updates `app/.env` with the tunnel WebSocket URL and restores it to localhost when you Ctrl+C. Share the frontend tunnel URL printed by `make app-preview` with your tester.

The preview server runs on port 4322 to avoid conflicting with the dev server on 4321.

## Media (Cloudflare R2)

Images, videos, and large GIFs are hosted on Cloudflare R2 instead of being bundled in the Cloudflare Pages build (which has a 25 MiB per-file limit).

- **Local dev**: Media is served from local files with Astro image optimization. No R2 needed.
- **Deployed builds**: `PUBLIC_R2_BASE_URL` + `CF_PAGES_BRANCH` are used to construct R2 URLs at build time.

### How it works

Media is stored in R2 under branch-based prefixes:

```
thalida-media/
  main/content/gallery/hudsonvalley/IMAG1094.jpg      (production)
  v-2026/content/gallery/hudsonvalley/IMAG1094.jpg    (feature branch)
```

- **On every push**, a GitHub Action syncs media to R2 under `{branch}/content/...`
- **On PR merge**, a GitHub Action deletes the merged branch's R2 prefix (auto-cleanup)
- **Cloudflare Pages** uses `CF_PAGES_BRANCH` (a built-in env var) to resolve the correct prefix at build time

### Manual sync and cleanup

```bash
make media-sync                     # Sync media using current git branch as prefix
make media-cleanup BRANCH=v-2026    # Delete a branch's media from R2
```

### One-time setup: R2 bucket

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) > R2 Object Storage > Create bucket
2. Name it `thalida-media`
3. Enable **Public Development URL** (Settings > Public Development URL)
4. Copy the public URL (e.g., `https://pub-xxxx.r2.dev`)
5. Set `PUBLIC_R2_BASE_URL` to that URL in Cloudflare Pages env vars (same value for both Production and Preview)

### Cloudflare Pages build command

Use `npm run build:pages` as the build command (instead of `npm run build`). This removes large media files from the build output after Astro finishes (avoiding the 25 MiB per-file Cloudflare Pages limit) while preserving the HTML content partials needed for the project tree viewer.

## Configuration

All Astro configuration lives in `app/astro.config.mjs`. Allowed hosts for dev and preview (`*.thalida.com` and `*.trycloudflare.com`) are set via the `--allowed-hosts` flag in `app/package.json` scripts.

## Deployment

### Automatic (via GitHub)

Every push and PR is handled automatically by GitHub Actions:

1. **Media sync**: Uploads media to R2 under `{branch}/content/...`
2. **Frontend build + deploy**: After media sync completes, builds the Astro app and deploys to Cloudflare Pages via `wrangler pages deploy`
3. **API Worker**: Deploys to production on push to `main` (if `api/` changed) and to a preview environment on PRs
4. **Cleanup**: On PR merge, the merged branch's R2 media prefix is auto-deleted

Cloudflare Pages auto-deploy must be **paused** in the dashboard since GitHub Actions handles the build and deploy.

Preview frontends talk to a shared preview API Worker (`thalida-chat-api-preview`).

### One-time setup: Cloudflare Pages

Connect the repo to Cloudflare Pages via the dashboard:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) > Workers and Pages > Create > Pages > Connect to Git
2. Select the `thalida.com` repo, set production branch to `main`
3. Configure the build:
   - **Root directory**: `app`
   - **Build command**: `npm run build:pages`
   - **Build output directory**: `dist`
4. Set environment variables (Settings > Environment Variables):
   - **Production**:
     - `PUBLIC_CHAT_WS_URL` = `wss://thalida-chat-api.<your-subdomain>.workers.dev/ws`
     - `PUBLIC_R2_BASE_URL` = `https://pub-xxxx.r2.dev` (your R2 public URL)
   - **Preview**:
     - `PUBLIC_CHAT_WS_URL` = `wss://thalida-chat-api-preview.<your-subdomain>.workers.dev/ws`
     - `PUBLIC_R2_BASE_URL` = `https://pub-xxxx.r2.dev` (same R2 public URL)
5. Under Build watch paths, add include path: `app/**` (avoids rebuilding when only `api/` changes)

### Required GitHub Secrets and Variables

Set these in your repo settings under Settings > Secrets and variables > Actions:

**Secrets:**

| Secret                  | Description                                             |
| ----------------------- | ------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | API token with Workers and Pages edit permissions       |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID (found in the dashboard URL) |

**Variables:**

| Variable                   | Description                                                           |
| -------------------------- | --------------------------------------------------------------------- |
| `R2_PUBLIC_URL`            | R2 public URL (e.g., `https://pub-xxxx.r2.dev`)                       |
| `CLOUDFLARE_PAGES_PROJECT` | Cloudflare Pages project name (found in the Pages dashboard overview) |

### One-time setup: Production Worker secrets

```bash
make api-secrets-prod     # Prompts for ADMIN_SECRET and OPENAI_API_KEY
make api-deploy-prod      # Deploy the production Worker
```

### One-time setup: Preview Worker secrets

```bash
make api-secrets-preview  # Prompts for ADMIN_SECRET and OPENAI_API_KEY (preview)
make api-deploy-preview   # Deploy the preview Worker
```

### Manual deployment

```bash
make deploy               # Deploy API Worker to production (alias for api-deploy-prod)
make api-deploy-preview   # Deploy API Worker to preview environment
```

The frontend deploys automatically via GitHub Actions on push. No manual step needed.

## All Commands

| Command                    | Description                                                         |
| -------------------------- | ------------------------------------------------------------------- |
| `make setup`               | Full local setup: install deps, add shell alias, copy env templates |
| `make install`             | Install dependencies for root, app, and api                         |
| `make alias`               | Add shell alias so `make` works from any subfolder                  |
| `make api-dev`             | Start the API worker on http://localhost:8787                       |
| `make app-dev`             | Start the Astro frontend on http://localhost:4321                   |
| `make app-build`           | Build the frontend                                                  |
| `make api-preview`         | Tunnel the API, auto-update `app/.env` with the WS URL              |
| `make app-preview`         | Build, preview on port 4322, and tunnel the frontend                |
| `make lint`                | Run ESLint in both packages                                         |
| `make lint-fix`            | Run ESLint --fix in both packages                                   |
| `make format`              | Run Prettier --write across the repo                                |
| `make format-check`        | Run Prettier --check across the repo                                |
| `make deploy`              | Deploy API Worker to production (frontend via GitHub Actions)       |
| `make api-deploy-prod`     | Deploy API Worker to production                                     |
| `make api-deploy-preview`  | Deploy API Worker to preview environment                            |
| `make api-secrets-prod`    | Set production Worker secrets (ADMIN_SECRET, OPENAI_API_KEY)        |
| `make api-secrets-preview` | Set preview Worker secrets (ADMIN_SECRET, OPENAI_API_KEY)           |
| `make media-sync`          | Sync media to R2 using current git branch as prefix                 |
| `make media-cleanup`       | Delete a branch's media from R2 (`BRANCH=name`)                     |
| `make clean`               | Remove build artifacts                                              |
