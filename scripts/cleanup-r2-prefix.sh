#!/usr/bin/env bash
set -euo pipefail

BUCKET="thalida-media"
PREFIX=""

usage() {
  echo "Usage: $0 --prefix <branch-name>"
  echo ""
  echo "Deletes all objects under {prefix}/ in the R2 bucket."
  echo "Example: $0 --prefix v-2026"
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

# Safety: never delete the main prefix via this script
if [ "$PREFIX" = "main" ]; then
  echo "ERROR: Refusing to delete the main prefix. This script is for cleaning up branch prefixes."
  exit 1
fi

echo "Cleaning up R2 prefix: $PREFIX/ in bucket $BUCKET"
echo ""

# List all objects under the prefix and delete them one by one
# wrangler r2 object list outputs JSON; extract keys with a simple parser
KEYS=$(npx wrangler r2 object list "$BUCKET" --prefix "$PREFIX/" --remote 2>/dev/null \
  | grep -o '"key":"[^"]*"' \
  | sed 's/"key":"//;s/"$//' || true)

if [ -z "$KEYS" ]; then
  echo "No objects found under prefix: $PREFIX/"
  exit 0
fi

COUNT=0
TOTAL=$(echo "$KEYS" | wc -l | tr -d ' ')
echo "Found $TOTAL objects to delete"

echo "$KEYS" | while IFS= read -r key; do
  COUNT=$((COUNT + 1))
  printf "  [%d/%d] Deleting %s " "$COUNT" "$TOTAL" "$key"
  if npx wrangler r2 object delete "$BUCKET/$key" --remote > /dev/null 2>&1; then
    echo "ok"
  else
    echo "FAILED"
  fi
done

echo ""
echo "Cleanup complete"
