set unstable
set working-directory := '../app'

# ─── Serve ────────────────────────────────────────────────────────────

[doc("Run the frontend locally")]
serve:
    pnpm dev

# ─── Test ─────────────────────────────────────────────────────────────

[doc("Run app tests")]
test:
    pnpm test

[doc("Type-check the app")]
typecheck:
    pnpm typecheck

# ─── Build ────────────────────────────────────────────────────────────

[doc("Convert card SVGs to PNGs")]
convert-cards:
    pnpm convert-cards

[doc("Build the frontend")]
build:
    pnpm build

[doc("Build frontend for Cloudflare Pages (strips large media from output)")]
build-pages:
    pnpm build:pages

# ─── Deploy ──────────────────────────────────────────────────────────

[doc("Deploy to Cloudflare Pages")]
[arg('branch', long, help="git branch for the deployment")]
[arg('project', long, help="Cloudflare Pages project name")]
deploy branch project:
    pnpm exec wrangler pages deploy dist --project-name="{{project}}" --branch="{{branch}}"
