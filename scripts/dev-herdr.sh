#!/usr/bin/env bash
# Opens a Herdr workspace with the dev environment: API (db + packages + api) and web.
set -euo pipefail

if ! command -v herdr >/dev/null 2>&1; then
  echo "herdr is not installed or not in PATH" >&2
  exit 1
fi

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

workspace="$(herdr workspace create --cwd "$root" --label "sryg dev" --focus)"
api_pane="$(jq -r '.result.root_pane.pane_id' <<<"$workspace")"

web_pane="$(herdr pane split --pane "$api_pane" --direction right --cwd "$root" --no-focus | jq -r '.result.pane.pane_id')"

herdr pane rename "$api_pane" api >/dev/null
herdr pane rename "$web_pane" web >/dev/null

herdr pane run "$api_pane" "pnpm db:up && pnpm build:packages && pnpm --filter @sryg/api dev" >/dev/null
herdr pane run "$web_pane" "pnpm dev" >/dev/null

echo "Herdr workspace 'sryg dev' started (api: $api_pane, web: $web_pane)"
