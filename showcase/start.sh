#!/bin/sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
PORT="${PORT:-8872}"
printf 'Wharton Insight AI ERP demo: http://127.0.0.1:%s\nPress Ctrl+C to stop.\n' "$PORT"
exec python3 -m http.server "$PORT" --bind 127.0.0.1
