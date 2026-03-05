set unstable
set working-directory := '../app'

# ─── Serve ────────────────────────────────────────────────────────────

[doc("Run the frontend locally")]
serve:
    npm run dev

# ─── Test ─────────────────────────────────────────────────────────────

[doc("Run app tests")]
test:
    npm test

[doc("Type-check the app")]
typecheck:
    npm run typecheck

# ─── Build ────────────────────────────────────────────────────────────

[doc("Convert card SVGs to PNGs")]
convert-cards:
    npm run convert-cards

[doc("Build the frontend")]
build:
    npm run build

[doc("Build frontend for Cloudflare Pages (strips large media from output)")]
build-pages:
    npm run build:pages

# ─── Deploy ──────────────────────────────────────────────────────────

[doc("Deploy to Cloudflare Pages")]
[arg('branch', long, help="git branch for the deployment")]
[arg('project', long, help="Cloudflare Pages project name")]
deploy branch project:
    npx wrangler pages deploy dist --project-name="{{project}}" --branch="{{branch}}"
