set unstable

mod api 'just/api.just'
mod app 'just/app.just'
mod media 'just/media.just'

[private]
default:
    @just --list --list-submodules

# ─── Setup ────────────────────────────────────────────────────────────

[doc("Full local setup: install deps, copy env templates, install hooks")]
[script('bash')]
setup: install
    set -euo pipefail
    if ! command -v pre-commit >/dev/null 2>&1; then
        echo "pre-commit not found, installing via Homebrew..."
        brew install pre-commit
    fi
    pre-commit install
    echo "pre-commit hooks installed"
    if [ ! -f api/.dev.vars ]; then
        cp api/.dev.vars.example api/.dev.vars
        echo "Created api/.dev.vars from template — edit it to add your secrets"
    else
        echo "api/.dev.vars already exists, skipping"
    fi
    if [ ! -f app/.env.development ]; then
        cp app/.env.example app/.env.development
        echo "Created app/.env.development from template"
    else
        echo "app/.env.development already exists, skipping"
    fi
    echo ""
    echo "Setup complete! Start developing with:"
    echo "  just api::serve   → API on http://localhost:8787"
    echo "  just app::serve   → App on http://localhost:4321"

[doc("Install dependencies for root, app, and api")]
install:
    npm install
    cd app && npm install
    cd api && npm install

# ─── Test ─────────────────────────────────────────────────────────────

[doc("Run all tests")]
test:
    just api::test
    just app::test

# ─── Lint & Format ────────────────────────────────────────────────────

[doc("Run ESLint across both packages")]
[arg('fix', long="fix", value="true", help="auto-fix lint issues")]
lint fix="false":
    {{ if fix == "true" { "npm run lint:fix" } else { "npm run lint" } }}

[doc("Run Prettier across the repo")]
[arg('check', long="check", value="true", help="check formatting without writing")]
format check="false":
    {{ if check == "true" { "npm run format:check" } else { "npm run format" } }}

# ─── Utilities ────────────────────────────────────────────────────────

[doc("Remove build artifacts")]
clean:
    rm -rf app/dist app/.astro app/.generated
