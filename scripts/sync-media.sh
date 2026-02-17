#!/usr/bin/env bash
set -euo pipefail

BUCKET="thalida-media"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$ROOT_DIR/app"
PREFIX=""
DIFF_BASE=""

MEDIA_EXTENSIONS="jpg|jpeg|png|gif|webp|svg|mov|mp4"

usage() {
  echo "Usage: $0 --prefix <branch-name> [--diff-base <commit-sha>]"
  echo ""
  echo "Syncs media files to R2 under {prefix}/content/..."
  echo ""
  echo "Options:"
  echo "  --prefix      Required. Branch name used as R2 key prefix."
  echo "  --diff-base   Optional. Commit SHA to diff against HEAD."
  echo "                Only changed media files are uploaded."
  echo "                Omit for a full sync of all media."
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prefix)    PREFIX="$2"; shift 2 ;;
    --diff-base) DIFF_BASE="$2"; shift 2 ;;
    *) usage ;;
  esac
done

if [ -z "$PREFIX" ]; then
  echo "ERROR: --prefix is required"
  usage
fi

get_content_type() {
  case "$(echo "${1##*.}" | tr '[:upper:]' '[:lower:]')" in
    jpg|jpeg) echo "image/jpeg" ;;
    png)      echo "image/png" ;;
    gif)      echo "image/gif" ;;
    webp)     echo "image/webp" ;;
    svg)      echo "image/svg+xml" ;;
    mp4)      echo "video/mp4" ;;
    mov)      echo "video/quicktime" ;;
    *)        echo "application/octet-stream" ;;
  esac
}

upload() {
  local file="$1"
  local key="$2"
  local ct
  ct="$(get_content_type "$file")"
  npx wrangler r2 object put "$BUCKET/$key" --file="$file" --content-type="$ct" --remote 2>&1 | tail -1
}

is_media_file() {
  echo "$1" | grep -qiE "\.($MEDIA_EXTENSIONS)$"
}

# ── Collect files to sync ──────────────────────────────────────────

FILES=()

if [ -n "$DIFF_BASE" ]; then
  echo "Syncing media to R2 bucket: $BUCKET (prefix: $PREFIX, incremental from $DIFF_BASE)"
  echo ""

  CHANGED=$(git diff --name-only --diff-filter=ACMR "$DIFF_BASE"..HEAD 2>/dev/null || true)

  if [ -z "$CHANGED" ]; then
    echo "No files changed. Nothing to sync."
    exit 0
  fi

  while IFS= read -r relpath; do
    # Media in app/src/content/
    if [[ "$relpath" == app/src/content/* ]] && is_media_file "$relpath"; then
      file="$ROOT_DIR/$relpath"
      if [ -f "$file" ]; then
        SRC_PREFIX="$APP_DIR/src/"
        key="$PREFIX/${file#$SRC_PREFIX}"
        FILES+=("$file|$key")
      fi
    fi

    # Media in app/public/content/
    if [[ "$relpath" == app/public/content/* ]]; then
      file="$ROOT_DIR/$relpath"
      if [ -f "$file" ]; then
        PUB_PREFIX="$APP_DIR/public/"
        key="$PREFIX/${file#$PUB_PREFIX}"
        FILES+=("$file|$key")
      fi
    fi
  done <<< "$CHANGED"

  if [ ${#FILES[@]} -eq 0 ]; then
    echo "No media files changed. Nothing to sync."
    exit 0
  fi
else
  echo "Syncing media to R2 bucket: $BUCKET (prefix: $PREFIX, full sync)"
  echo ""

  # Images from app/src/content/
  if [ -d "$APP_DIR/src/content" ]; then
    SRC_PREFIX="$APP_DIR/src/"
    while IFS= read -r -d '' file; do
      key="$PREFIX/${file#$SRC_PREFIX}"
      FILES+=("$file|$key")
    done < <(find "$APP_DIR/src/content" -type f \( \
      -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o \
      -iname "*.gif" -o -iname "*.webp" -o -iname "*.svg" -o \
      -iname "*.mov" -o -iname "*.mp4" \
    \) -print0)
  fi

  # Videos and large media from app/public/content/
  if [ -d "$APP_DIR/public/content" ]; then
    PUB_PREFIX="$APP_DIR/public/"
    while IFS= read -r -d '' file; do
      key="$PREFIX/${file#$PUB_PREFIX}"
      FILES+=("$file|$key")
    done < <(find "$APP_DIR/public/content" -type f -print0)
  fi
fi

# ── Upload ─────────────────────────────────────────────────────────

TOTAL=${#FILES[@]}
echo "Found $TOTAL media file(s) to sync"
echo ""

COUNT=0
ERRORS=0

for entry in "${FILES[@]}"; do
  file="${entry%%|*}"
  key="${entry#*|}"
  COUNT=$((COUNT + 1))
  printf "  [%d/%d] %s " "$COUNT" "$TOTAL" "$key"
  if upload "$file" "$key"; then
    echo "ok"
  else
    echo "FAILED"
    ERRORS=$((ERRORS + 1))
  fi
done

echo ""
echo "Sync complete: $((COUNT - ERRORS))/$COUNT files uploaded"
if [ "$ERRORS" -gt 0 ]; then
  echo "WARNING: $ERRORS files failed to upload"
  exit 1
fi
