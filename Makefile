ROOT_DIR := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))
APP_DIR  := $(ROOT_DIR)app
API_DIR  := $(ROOT_DIR)api

.PHONY: setup install alias api-dev app-dev dev app-build app-preview api-preview test test-api test-app lint lint-fix format format-check deploy api-deploy-prod api-deploy-preview api-secrets-prod api-secrets-preview media-sync media-cleanup clean help

# ─── Setup ────────────────────────────────────────────────────────────

setup: install alias ## Full local setup: install deps, configure shell alias, copy env templates, install hooks
	@if ! command -v pre-commit >/dev/null 2>&1; then \
		echo "pre-commit not found, installing via Homebrew..." ; \
		brew install pre-commit ; \
	fi
	@cd $(ROOT_DIR) && pre-commit install
	@echo "pre-commit hooks installed"
	@if [ ! -f $(API_DIR)/.dev.vars ]; then \
		cp $(API_DIR)/.dev.vars.example $(API_DIR)/.dev.vars ; \
		echo "Created api/.dev.vars from template — edit it to add your secrets" ; \
	else \
		echo "api/.dev.vars already exists, skipping" ; \
	fi
	@if [ ! -f $(APP_DIR)/.env.development ]; then \
		cp $(APP_DIR)/.env.example $(APP_DIR)/.env.development ; \
		echo "Created app/.env.development from template" ; \
	else \
		echo "app/.env.development already exists, skipping" ; \
	fi
	@echo ""
	@echo "Setup complete! Run 'make dev' to see how to start the servers."

install: ## Install dependencies for root, app, and api
	cd $(ROOT_DIR) && npm install
	cd $(APP_DIR) && npm install
	cd $(API_DIR) && npm install

alias: ## Add a shell alias so `make` works from any subfolder
	@ALIAS_LINE="alias make='make -C \$$(git rev-parse --show-toplevel 2>/dev/null || echo .)'" ; \
	SHELL_NAME=$$(basename "$$SHELL") ; \
	case "$$SHELL_NAME" in \
		zsh)  RC_FILE="$$HOME/.zshrc" ;; \
		bash) \
			if [ -f "$$HOME/.bash_profile" ]; then \
				RC_FILE="$$HOME/.bash_profile" ; \
			else \
				RC_FILE="$$HOME/.bashrc" ; \
			fi ;; \
		fish) RC_FILE="$$HOME/.config/fish/config.fish" ; \
			ALIAS_LINE="function make; command make -C (git rev-parse --show-toplevel 2>/dev/null; or echo .) \$$argv; end" ;; \
		*)    RC_FILE="$$HOME/.profile" ;; \
	esac ; \
	if grep -qF 'git rev-parse --show-toplevel' "$$RC_FILE" 2>/dev/null; then \
		echo "Alias already exists in $$RC_FILE" ; \
	else \
		printf '\n# Run make from repo root regardless of cwd\n%s\n' "$$ALIAS_LINE" >> "$$RC_FILE" ; \
		echo "Added alias to $$RC_FILE" ; \
	fi ; \
	echo "Run 'source $$RC_FILE' or open a new terminal to activate."

# ─── Local Development ────────────────────────────────────────────────

api-dev: ## Start the API worker (http://localhost:8787)
	cd $(API_DIR) && npm run dev

app-dev: ## Start the Astro frontend (http://localhost:4321)
	cd $(APP_DIR) && npm run dev

dev: ## Reminder to start both servers
	@echo "Run these in separate terminals:"
	@echo "  make api-dev    → API on http://localhost:8787"
	@echo "  make app-dev    → App on http://localhost:4321"

# ─── Build ────────────────────────────────────────────────────────────

app-build: ## Build the frontend
	cd $(APP_DIR) && npm run build

# ─── Preview (tunneled for sharing) ──────────────────────────────────
# Requires: npx cloudflared (auto-downloaded on first use)
#
# Usage (3 terminals):
#   Terminal 1: make api-dev
#   Terminal 2: make api-preview    (tunnels API, updates app/.env)
#   Terminal 3: make app-preview    (builds frontend, previews, tunnels it)
#
# When done: Ctrl+C each. api-preview auto-restores app/.env to localhost.

api-preview: ## Tunnel the API and auto-update app/.env with the tunnel WS URL
	@LOG=$$(mktemp) ; \
	cleanup() { \
		kill $$PID 2>/dev/null ; \
		echo "" ; \
		rm -f $(APP_DIR)/.env.production ; \
		echo "Removed app/.env.production" ; \
		rm -f $$LOG ; \
	} ; \
	trap cleanup EXIT INT TERM ; \
	echo "Starting API tunnel on http://localhost:8787..." ; \
	npx cloudflared tunnel --url http://localhost:8787 > $$LOG 2>&1 & \
	PID=$$! ; \
	echo "Waiting for tunnel URL..." ; \
	URL="" ; \
	for i in $$(seq 1 30); do \
		URL=$$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' $$LOG 2>/dev/null | head -1) ; \
		if [ -n "$$URL" ]; then break; fi ; \
		sleep 1 ; \
	done ; \
	if [ -z "$$URL" ]; then \
		echo "ERROR: Could not get tunnel URL after 30s. Check that port 8787 is running." ; \
		exit 1 ; \
	fi ; \
	WS_URL="wss://$${URL#https://}/ws" ; \
	echo "PUBLIC_CHAT_WS_URL=$$WS_URL" > $(APP_DIR)/.env.production ; \
	echo "" ; \
	echo "API tunnel:  $$URL" ; \
	echo "WS URL:      $$WS_URL" ; \
	echo "Written to app/.env.production — now run 'make app-preview' in another terminal" ; \
	echo "Press Ctrl+C to stop (removes app/.env.production)" ; \
	echo "" ; \
	wait $$PID

app-preview: app-build ## Build frontend, preview on port 4322, and tunnel
	@LOG=$$(mktemp) ; \
	cleanup() { \
		kill $$TUNNEL_PID 2>/dev/null ; \
		kill $$PREVIEW_PID 2>/dev/null ; \
		rm -f $$LOG ; \
	} ; \
	trap cleanup EXIT INT TERM ; \
	echo "Starting preview server on port 4322..." ; \
	cd $(APP_DIR) && npm run preview > /dev/null 2>&1 & \
	PREVIEW_PID=$$! ; \
	sleep 2 ; \
	echo "Starting frontend tunnel on http://localhost:4322..." ; \
	npx cloudflared tunnel --url http://localhost:4322 > $$LOG 2>&1 & \
	TUNNEL_PID=$$! ; \
	URL="" ; \
	for i in $$(seq 1 30); do \
		URL=$$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' $$LOG 2>/dev/null | head -1) ; \
		if [ -n "$$URL" ]; then break; fi ; \
		sleep 1 ; \
	done ; \
	if [ -z "$$URL" ]; then \
		echo "ERROR: Could not get tunnel URL after 30s." ; \
		exit 1 ; \
	fi ; \
	echo "" ; \
	echo "Share this URL: $$URL" ; \
	echo "Press Ctrl+C to stop" ; \
	echo "" ; \
	wait $$TUNNEL_PID

# ─── Test ─────────────────────────────────────────────────────────────

test: test-api test-app ## Run all tests

test-api: ## Run API tests
	cd $(API_DIR) && npm test

test-app: ## Run app tests
	cd $(APP_DIR) && npm test

# ─── Lint & Format ────────────────────────────────────────────────────

lint: ## Run ESLint in both packages
	cd $(API_DIR) && npm run lint
	cd $(APP_DIR) && npm run lint

lint-fix: ## Run ESLint --fix in both packages
	cd $(API_DIR) && npm run lint:fix
	cd $(APP_DIR) && npm run lint:fix

format: ## Run Prettier --write across the repo
	cd $(ROOT_DIR) && npx prettier --write .

format-check: ## Run Prettier --check across the repo
	cd $(ROOT_DIR) && npx prettier --check .

# ─── Deploy ──────────────────────────────────────────────────────────

api-deploy-prod: ## Deploy the API Worker to production
	cd $(API_DIR) && npx wrangler deploy --env=""

api-deploy-preview: ## Deploy the API Worker to the preview environment
	cd $(API_DIR) && npx wrangler deploy --env preview

deploy: api-deploy-prod ## Deploy API Worker to production (frontend deploys via GitHub Actions)
	@echo ""
	@echo "API deployed. Frontend deploys via GitHub Actions on push."

api-secrets-prod: ## Set production Worker secrets (ADMIN_SECRET, OPENAI_API_KEY)
	cd $(API_DIR) && npx wrangler secret put ADMIN_SECRET --env="" && npx wrangler secret put OPENAI_API_KEY --env=""

api-secrets-preview: ## Set preview Worker secrets (ADMIN_SECRET, OPENAI_API_KEY)
	cd $(API_DIR) && npx wrangler secret put ADMIN_SECRET --env preview && npx wrangler secret put OPENAI_API_KEY --env preview

# ─── Media ───────────────────────────────────────────────────────────

media-sync: ## Sync media to R2 (uses current git branch as prefix)
	bash $(ROOT_DIR)scripts/sync-media.sh --prefix "$$(git -C $(ROOT_DIR) rev-parse --abbrev-ref HEAD)"

media-cleanup: ## Delete a branch's media from R2 (usage: make media-cleanup BRANCH=my-branch)
	@if [ -z "$(BRANCH)" ]; then echo "Usage: make media-cleanup BRANCH=branch-name"; exit 1; fi
	bash $(ROOT_DIR)scripts/cleanup-r2-prefix.sh --prefix "$(BRANCH)"

# ─── Utilities ────────────────────────────────────────────────────────

clean: ## Remove build artifacts
	rm -rf $(APP_DIR)/dist $(APP_DIR)/.astro $(APP_DIR)/.generated

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
