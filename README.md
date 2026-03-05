# thalida.com

Portfolio site with a live chat, project tree, and content viewer.


## Project Structure

```text
app/    Astro frontend (Cloudflare Pages)
api/    Cloudflare Worker + Durable Object (chat backend)
docs/   Design docs and plans
```


## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- npm (comes with Node)
- [just](https://github.com/casey/just#installation) command runner


## Quick Start

```bash
just setup
```

This single command:

1. Installs dependencies for both `app/` and `api/`
2. Copies env templates (`api/.dev.vars`, `app/.env.development`)
   if they don't already exist
3. Installs pre-commit hooks

After setup, edit `api/.dev.vars` to add your secrets (see below),
then start developing:

```bash
just api::serve    # Terminal 1 — API on http://localhost:8787
just app::serve    # Terminal 2 — App on http://localhost:4321
```

Run `just` to see all available commands.


## Environment Variables


### API secrets (`api/.dev.vars`)

| Variable         | Required | Description                                   |
| ---------------- | -------- | --------------------------------------------- |
| `ADMIN_SECRET`   | Yes      | Any secret string. Used to log in as owner.   |
| `OPENAI_API_KEY` | No       | OpenAI key for chat moderation. [Get one][ok] |

[ok]: https://platform.openai.com/api-keys


### Frontend (`app/.env.development`)

| Variable              | Default                 | Description                                               |
| --------------------- | ----------------------- | --------------------------------------------------------- |
| `PUBLIC_API_BASE_URL` | `http://localhost:8787` | Base URL of the API worker (WS URL derived automatically) |
| `PUBLIC_R2_BASE_URL`  | _(empty)_               | R2 public URL for media                                   |

`PUBLIC_API_BASE_URL` tunnel URL is auto-written to `.env.production`
by `just api::serve --env preview`. `PUBLIC_R2_BASE_URL` is empty for
local dev (uses local files) and set in Cloudflare Pages for deploys.


## Log In as the Owner

Click the **admin login** button in the chat panel and enter the
`ADMIN_SECRET` value from `api/.dev.vars`. The token is validated
against the API, saved to `localStorage`, and the chat reconnects as
the owner (username "thalida"). You only need to do this once per
browser — click **admin logout** to clear it.


## Testing with Someone Else (Tunnels)

Share your local dev environment using
[Cloudflare Tunnel][cft] (free, no account needed).
You need three terminals:

[cft]: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/

```bash
just api::serve                # Terminal 1 — start the API server
just api::serve --env preview  # Terminal 2 — tunnel the API
just app::serve --env preview  # Terminal 3 — build, preview, tunnel
```

`just api::serve --env preview` writes the tunnel WebSocket URL to
`app/.env.production` (used by `astro build`) and removes it on
Ctrl+C. Your `app/.env.development` (used by `astro dev`) is never
touched. Share the frontend tunnel URL printed by
`just app::serve --env preview` with your tester.

The preview server runs on port 4322 to avoid conflicting with the
dev server on 4321.


## Media (Cloudflare R2)

Images, videos, and large GIFs are hosted on Cloudflare R2 instead
of being bundled in the Cloudflare Pages build (which has a 25 MiB
per-file limit).

- **Local dev**: Media is served from local files with Astro image
  optimization. No R2 needed.
- **Deployed builds**: `PUBLIC_R2_BASE_URL` + `CF_PAGES_BRANCH` are
  used to construct R2 URLs at build time.


### How it works

Media is stored in R2 under branch-based prefixes:

```text
thalida-media/
  main/content/gallery/hudsonvalley/IMAG1094.jpg
  v-2026/content/gallery/hudsonvalley/IMAG1094.jpg
```

- **On every push**, a GitHub Action syncs media to R2 under
  `{branch}/content/...`
- **On PR merge**, a GitHub Action deletes the merged branch's R2
  prefix (auto-cleanup)
- **Cloudflare Pages** uses `CF_PAGES_BRANCH` (a built-in env var)
  to resolve the correct prefix at build time


### Manual sync and cleanup

```bash
just media::sync                       # Sync using current branch
just media::cleanup --branch v-2026    # Delete a branch's R2 media
```


### One-time setup: R2 bucket

1. Go to [Cloudflare Dashboard][cfd] > R2 Object Storage > Create
   bucket
2. Name it `thalida-media`
3. Enable **Public Development URL** (Settings > Public Development
   URL)
4. Copy the public URL (e.g., `https://pub-xxxx.r2.dev`)
5. Set `PUBLIC_R2_BASE_URL` to that URL in Cloudflare Pages env vars
   (same value for both Production and Preview)

[cfd]: https://dash.cloudflare.com/


### Cloudflare Pages build command

Use `npm run build:pages` as the build command (instead of
`npm run build`). This removes large media files from the build
output after Astro finishes (avoiding the 25 MiB per-file Cloudflare
Pages limit) while preserving the HTML content partials needed for
the project tree viewer.


## Configuration

All Astro configuration lives in `app/astro.config.mjs`. Allowed
hosts for dev and preview (`*.thalida.com` and
`*.trycloudflare.com`) are set via the `--allowed-hosts` flag in
`app/package.json` scripts.


## Deployment


### Automatic (via GitHub)

Every push and PR is handled automatically by GitHub Actions:

1. **Media sync**: Uploads media to R2 under
   `{branch}/content/...`
2. **Frontend build + deploy**: After media sync completes, builds
   the Astro app and deploys to Cloudflare Pages via
   `wrangler pages deploy`
3. **API Worker**: Deploys to production on push to `main`
   (if `api/` changed) and to a preview environment on PRs
4. **Cleanup**: On PR merge, the merged branch's R2 media prefix
   is auto-deleted

Cloudflare Pages auto-deploy must be **paused** in the dashboard
since GitHub Actions handles the build and deploy.

Preview frontends talk to a shared preview API Worker
(`thalida-chat-api-preview`).


### One-time setup: Cloudflare Pages

Connect the repo to Cloudflare Pages via the dashboard:

1. Go to [Cloudflare Dashboard][cfd] > Workers and Pages > Create >
   Pages > Connect to Git
2. Select the `thalida.com` repo, set production branch to `main`
3. Configure the build:
   - **Root directory**: `app`
   - **Build command**: `npm run build:pages`
   - **Build output directory**: `dist`
4. Set environment variables (Settings > Environment Variables):
   - **Production**:
     - `PUBLIC_API_BASE_URL` =
       `https://thalida-chat-api.<subdomain>.workers.dev`
     - `PUBLIC_R2_BASE_URL` =
       `https://pub-xxxx.r2.dev` (your R2 public URL)
   - **Preview**:
     - `PUBLIC_API_BASE_URL` =
       `https://thalida-chat-api-preview.<subdomain>.workers.dev`
     - `PUBLIC_R2_BASE_URL` =
       `https://pub-xxxx.r2.dev` (same R2 public URL)
5. Under Build watch paths, add include path: `app/**` (avoids
   rebuilding when only `api/` changes)


### Required GitHub Secrets and Variables

Set these in your repo settings under Settings > Secrets and
variables > Actions:

**Secrets:**

| Secret                  | Description                              |
| ----------------------- | ---------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | API token with Workers+Pages permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID               |

**Variables:**

| Variable                      | Description                   |
| ----------------------------- | ----------------------------- |
| `PUBLIC_R2_BASE_URL`          | R2 public URL                 |
| `CLOUDFLARE_PAGES_PROJECT`    | Cloudflare Pages project name |
| `PUBLIC_API_BASE_URL`         | Production API base URL       |
| `PUBLIC_API_BASE_URL_PREVIEW` | Preview API base URL          |


### One-time setup: Production Worker secrets

```bash
just api::secrets --env prod     # Prompts for secrets
just api::deploy --env prod      # Deploy the production Worker
```


### One-time setup: Preview Worker secrets

```bash
just api::secrets --env preview  # Prompts for secrets (preview)
just api::deploy --env preview   # Deploy the preview Worker
```


### Manual deployment

```bash
just api::deploy --env prod      # Deploy API Worker to production
just api::deploy --env preview   # Deploy API Worker to preview
```

The frontend deploys automatically via GitHub Actions on push. No
manual step needed.


## All Commands

Run `just` to see this list interactively.

| Command                            | Description                          |
| ---------------------------------- | ------------------------------------ |
| `just setup`                       | Full local setup: deps + env         |
| `just install`                     | Install deps for root, app, and api  |
| `just test`                        | Run all tests                        |
| `just lint`                        | Run ESLint in both packages          |
| `just lint --fix`                  | Run ESLint --fix in both packages    |
| `just format`                      | Run Prettier --write across the repo |
| `just format --check`              | Run Prettier --check across the repo |
| `just clean`                       | Remove build artifacts               |
| `just api::serve`                  | Start API on <http://localhost:8787> |
| `just api::serve --env preview`    | Tunnel API, write WS URL to env      |
| `just api::test`                   | Run API tests                        |
| `just api::deploy --env <env>`     | Deploy API Worker (prod or preview)  |
| `just api::secrets --env <env>`    | Set Worker secrets (prod or preview) |
| `just app::serve`                  | Start Astro dev server (port 4321)   |
| `just app::serve --env preview`    | Build, preview on 4322, and tunnel   |
| `just app::test`                   | Run app tests                        |
| `just app::build`                  | Build the frontend                   |
| `just app::build-pages`            | Build for Cloudflare Pages           |
| `just app::deploy`                 | Deploy to Cloudflare Pages (CI)      |
| `just media::sync`                 | Sync media to R2 (current branch)    |
| `just media::cleanup --branch <b>` | Delete a branch's media from R2      |
