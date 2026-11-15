#!/usr/bin/env bash
set -euo pipefail

# Pre-commit secret guard for VeroRoute Edge.
# Runs gitleaks v8.21.2 if installed, and always runs a lightweight staged-file
# check so commits are protected even in environments without gitleaks.

export PATH="$HOME/.local/bin:$PATH"

staged_files=$(git diff --cached --name-only --diff-filter=ACM)
if [ -z "$staged_files" ]; then
  exit 0
fi

# 1. Block sensitive filenames in any directory from ever being staged
while IFS= read -r file; do
  if [[ "$file" =~ (^|/)\.dev\.vars$ ]] || \
     [[ "$file" =~ (^|/)\.env(\..*)?$ && "$file" != ".env.example" && "$file" != "deploy/searxng/.env.example" ]] || \
     [[ "$file" =~ (^|/)deploy-personal\.sh$ ]] || \
     [[ "$file" =~ (^|/)backups/ ]] || \
     [[ "$file" =~ (^|/)kv-.*-backup.*\.json$ ]] || \
     [[ "$file" =~ \.(tar\.gz|pem)$ ]]; then
    echo "ERROR: Blocked sensitive file from commit: $file" >&2
    exit 1
  fi
done <<< "$staged_files"

# 2. Run gitleaks v8.21.2 if available
if command -v gitleaks >/dev/null 2>&1; then
  gitleaks git --pre-commit --staged --redact --verbose --config=".gitleaks.toml"
fi

# 3. Lightweight regex scan on staged additions (do NOT exclude tests/ globally)
staged_diff=$(git diff --cached -U0 -- . ':!.dev.vars.example' ':!deploy/searxng/.env.example' ':!deploy/searxng/searxng-settings.yml' ':!.gitleaks.toml' ':!scripts/pre-commit-secrets.sh' || true)
if [ -n "$staged_diff" ]; then
  if echo "$staged_diff" | grep -E '^\+.*(sk-proj-[A-Za-z0-9_-]{20,}|sk-or-v1-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{35}|gsk_[A-Za-z0-9]{20,}|csk-[A-Za-z0-9]{20,}|nvapi-[A-Za-z0-9_-]{20,}|GOCSPX-[A-Za-z0-9_-]{20,}|ABSK[A-Za-z0-9+/=]{20,}|SEARXNG_SECRET=[A-Za-z0-9]{16,}|AUTH_TOKEN\s*=\s*"admin")' >/dev/null; then
    echo "ERROR: Potential secret or default AUTH_TOKEN=\"admin\" detected in staged changes." >&2
    echo "Remove the secret or use environment variables / wrangler secret put." >&2
    exit 1
  fi
fi

exit 0
