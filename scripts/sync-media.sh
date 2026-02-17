#!/usr/bin/env bash
set -euo pipefail

BUCKET="thalida-media"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$ROOT_DIR/app"
PREFIX=""

usage() {
  echo "Usage: $0 --prefix <branch-name>"
  echo ""
  echo "Syncs media files to R2 under {prefix}/content/..."
  echo "Example: $0 --prefix main"
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prefix) PREFIX="$2"; shift 2 ;;
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

echo "Syncing media to R2 bucket: $BUCKET (prefix: $PREFIX)"
echo ""

COUNT=0
ERRORS=0

# Images from app/src/content/
echo "=== app/src/content/ ==="
if [ -d "$APP_DIR/src/content" ]; then
  SRC_PREFIX="$APP_DIR/src/"
  while IFS= read -r -d '' file; do
    key="$PREFIX/${file#$SRC_PREFIX}"
    COUNT=$((COUNT + 1))
    printf "  [%d] %s " "$COUNT" "$key"
    if upload "$file" "$key"; then
      echo "ok"
    else
      echo "FAILED"
      ERRORS=$((ERRORS + 1))
    fi
  done < <(find "$APP_DIR/src/content" -type f \( \
    -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o \
    -iname "*.gif" -o -iname "*.webp" -o -iname "*.svg" -o \
    -iname "*.mov" -o -iname "*.mp4" \
  \) -print0)
fi

# Videos and large media from app/public/content/
if [ -d "$APP_DIR/public/content" ]; then
  echo ""
  echo "=== app/public/content/ ==="
  PUB_PREFIX="$APP_DIR/public/"
  while IFS= read -r -d '' file; do
    key="$PREFIX/${file#$PUB_PREFIX}"
    COUNT=$((COUNT + 1))
    printf "  [%d] %s " "$COUNT" "$key"
    if upload "$file" "$key"; then
      echo "ok"
    else
      echo "FAILED"
      ERRORS=$((ERRORS + 1))
    fi
  done < <(find "$APP_DIR/public/content" -type f -print0)
fi

echo ""
echo "Sync complete: $((COUNT - ERRORS))/$COUNT files uploaded"
if [ "$ERRORS" -gt 0 ]; then
  echo "WARNING: $ERRORS files failed to upload"
  exit 1
fi
