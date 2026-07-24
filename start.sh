#!/usr/bin/env bash

set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$project_dir"
set -a
source "$project_dir/.env"
set +a

if ! command -v node >/dev/null 2>&1; then
  printf 'Node.js 18 or newer is required.\n' >&2
  exit 1
fi

: "${BACKEND_PORT:?BACKEND_PORT is required}"
: "${FRONTEND_PORT:?FRONTEND_PORT is required}"
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${JWT_SECRET:?JWT_SECRET is required}"
for runtime_port in "$BACKEND_PORT" "$FRONTEND_PORT"; do
  [[ "$runtime_port" =~ ^[0-9]+$ ]] && [ "$runtime_port" -ge 1 ] && [ "$runtime_port" -le 65535 ] || { printf 'Assigned ports must be integers between 1 and 65535.\n' >&2; exit 1; }
  lsof -nP -iTCP:"$runtime_port" -sTCP:LISTEN >/dev/null 2>&1 && { printf 'Assigned port %s is already in use.\n' "$runtime_port" >&2; exit 1; }
done
export BACKEND_PORT FRONTEND_PORT
exec node src/main.js
