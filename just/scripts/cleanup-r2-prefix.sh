#!/usr/bin/env bash
set -euo pipefail

BUCKET="thalida-media"
PREFIX=""

usage() {
  echo "Usage: $0 --prefix <branch-name>"
  echo ""
  echo "Deletes all objects under {prefix}/ in the R2 bucket."
  echo "Example: $0 --prefix v-2026"
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

# Safety: never delete the main prefix via this script
if [ "$PREFIX" = "main" ]; then
  echo "ERROR: Refusing to delete the main prefix. This script is for cleaning up branch prefixes."
  exit 1
fi

R2_ENDPOINT="https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com"

echo "Cleaning up R2 prefix: $PREFIX/ in bucket $BUCKET"
echo ""

aws s3 rm "s3://$BUCKET/$PREFIX/" --recursive --endpoint-url "$R2_ENDPOINT"

echo ""
echo "Cleanup complete"
