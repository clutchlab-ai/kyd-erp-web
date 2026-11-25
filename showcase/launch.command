#!/bin/sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
exec python3 - <<'PY'
import http.server
import os
import threading
import webbrowser

port = int(os.environ.get('PORT', '8872'))
server = http.server.ThreadingHTTPServer(('127.0.0.1', port), http.server.SimpleHTTPRequestHandler)
url = f'http://127.0.0.1:{port}/'
print(f'Wharton Insight AI ERP demo: {url}\nPress Ctrl+C to stop.', flush=True)
threading.Timer(0.25, lambda: webbrowser.open(url)).start()
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
PY
