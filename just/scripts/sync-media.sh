#!/usr/bin/env bash
set -euo pipefail

BUCKET="thalida-media"
ROOT_DIR="$(git rev-parse --show-toplevel)"
APP_DIR="$ROOT_DIR/app"
PREFIX=""

MEDIA_INCLUDES=(
  --include "*.jpg" --include "*.jpeg" --include "*.png"
  --include "*.gif" --include "*.webp" --include "*.svg"
  --include "*.mov" --include "*.mp4"
)

usage() {
  echo "Usage: $0 --prefix <branch-name>"
  echo ""
  echo "Syncs media files to R2 under {prefix}/content/..."
  echo ""
  echo "Options:"
  echo "  --prefix   Required. Branch name used as R2 key prefix."
  echo ""
  echo "Required env vars:"
  echo "  CLOUDFLARE_ACCOUNT_ID   Cloudflare account ID (used to build R2 S3 endpoint)"
  echo "  AWS_ACCESS_KEY_ID       R2 S3 API access key"
  echo "  AWS_SECRET_ACCESS_KEY   R2 S3 API secret key"
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

if [ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
  echo "ERROR: CLOUDFLARE_ACCOUNT_ID is not set"
  exit 1
fi

R2_ENDPOINT="https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com"
DEST="s3://$BUCKET/$PREFIX"

echo "Syncing media to R2 bucket: $BUCKET (prefix: $PREFIX)"
echo ""

ERRORS=0

# Media from app/src/content/ (only media extensions)
if [ -d "$APP_DIR/src/content" ]; then
  echo "Syncing app/src/content/ (media files only)..."
  if ! aws s3 sync "$APP_DIR/src/content/" "$DEST/content/" \
    --endpoint-url "$R2_ENDPOINT" \
    --exclude "*" \
    "${MEDIA_INCLUDES[@]}"; then
    ERRORS=$((ERRORS + 1))
  fi
  echo ""
fi

# All files from app/public/content/
if [ -d "$APP_DIR/public/content" ]; then
  echo "Syncing app/public/content/ (all files)..."
  if ! aws s3 sync "$APP_DIR/public/content/" "$DEST/content/" \
    --endpoint-url "$R2_ENDPOINT"; then
    ERRORS=$((ERRORS + 1))
  fi
  echo ""
fi

if [ "$ERRORS" -gt 0 ]; then
  echo "WARNING: $ERRORS sync operations failed"
  exit 1
fi

echo "Sync complete"
