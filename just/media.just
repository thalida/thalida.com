set unstable

[doc("Sync media to R2")]
[arg('prefix', long, help="branch name as R2 key prefix (defaults to current git branch)")]
[script('bash')]
sync prefix="":
    set -euo pipefail
    PREFIX="{{prefix}}"
    if [ -z "$PREFIX" ]; then
        PREFIX="$(git rev-parse --abbrev-ref HEAD)"
    fi
    bash scripts/sync-media.sh --prefix "$PREFIX"

[doc("Delete a branch's media from R2")]
[arg('branch', long, help="branch name prefix to delete")]
cleanup branch:
    bash scripts/cleanup-r2-prefix.sh --prefix "{{branch}}"
