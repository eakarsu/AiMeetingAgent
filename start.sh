#!/usr/bin/env bash

set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$project_dir"

if ! command -v node >/dev/null 2>&1; then
  printf 'Node.js 18 or newer is required.\n' >&2
  exit 1
fi

runtime_port="${PORT:-3000}"
if [[ ! "$runtime_port" =~ ^[0-9]+$ ]] || [ "$runtime_port" -lt 1 ] || [ "$runtime_port" -gt 65535 ]; then
  printf 'PORT must be an integer between 1 and 65535.\n' >&2
  exit 1
fi

export PORT="$runtime_port"
exec node src/main.js
