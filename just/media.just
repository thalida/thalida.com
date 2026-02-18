set unstable

[doc("Sync media to R2")]
[arg('prefix', long, help="branch name as R2 key prefix (defaults to current git branch)")]
[arg('diff_base', long="diff-base", help="commit SHA to diff against for incremental sync")]
[script('bash')]
sync prefix="" diff_base="":
    set -euo pipefail
    PREFIX="{{prefix}}"
    DIFF_BASE="{{diff_base}}"
    if [ -z "$PREFIX" ]; then
        PREFIX="$(git rev-parse --abbrev-ref HEAD)"
    fi
    ARGS="--prefix $PREFIX"
    if [ -n "$DIFF_BASE" ]; then
        ARGS="$ARGS --diff-base $DIFF_BASE"
    fi
    bash scripts/sync-media.sh $ARGS

[doc("Delete a branch's media from R2")]
[arg('branch', long, help="branch name prefix to delete")]
cleanup branch:
    bash scripts/cleanup-r2-prefix.sh --prefix "{{branch}}"
