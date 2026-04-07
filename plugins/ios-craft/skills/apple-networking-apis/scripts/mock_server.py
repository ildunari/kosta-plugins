#!/usr/bin/env python3
"""
mock_server.py
--------------
A configurable HTTP mock server for local testing.

Features:
- Define routes with method, path templates (/users/{id}), headers, status, body.
- Path/query templating (e.g., "{id}", "{query.param}", "{uuid}").
- Failure sequences for chaos testing: [500, 500, 200].
- Per-route artificial delay (ms) and global CORS.
- Admin endpoints: /__admin/routes, /__admin/requests (list/reset).
- Hot-reload on config file changes (polling).

Config (JSON/YAML) shape:
{
  "port": 8080,
  "cors": {"enabled": true, "origins": ["*"], "headers": ["*"], "methods": ["*"]},
  "routes": [
    {"method":"GET","path":"/users/{id}","status":200,"headers":{"Content-Type":"application/json"},
     "body":{"id":"{id}","name":"User-{id}"}, "delay_ms":100, "failure_sequence":[500,200]}
  ]
}
"""
import argparse, json, os, re, sys, time, threading, logging, traceback
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs
from typing import Any, Dict, List, Optional

try:
    import yaml  # type: ignore
    HAS_YAML = True
except Exception:
    HAS_YAML = False

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

REQUEST_LOG: List[Dict[str, Any]] = []
ROUTES: List[Dict[str, Any]] = []
GLOBAL: Dict[str, Any] = {"cors": {"enabled": True, "origins": ["*"], "headers": ["*"], "methods": ["*"]}}
CONFIG_MTIME: float = 0.0
CONFIG_PATH: str = ""

def load_config(path: str) -> Dict[str, Any]:
    global CONFIG_MTIME
    ext = os.path.splitext(path)[1].lower()
    with open(path, "r", encoding="utf-8") as f:
        raw = f.read()
    data = yaml.safe_load(raw) if (ext in (".yml",".yaml") and HAS_YAML) else json.loads(raw)
    CONFIG_MTIME = os.path.getmtime(path)
    return data

def apply_config(cfg: Dict[str, Any]):
    global ROUTES, GLOBAL
    ROUTES = cfg.get("routes", []) or []
    GLOBAL = {"cors": {"enabled": False, "origins": ["*"], "headers": ["*"], "methods": ["*"]}}
    GLOBAL.update({k: v for k, v in cfg.items() if k != "routes"})
    for r in ROUTES:
        r["_failure_index"] = 0

def match_route(method: str, path: str) -> Optional[Dict[str, Any]]:
    for r in ROUTES:
        if r.get("method","GET").upper() != method.upper():
            continue
        tmpl = r.get("path", "/")
        # Convert path template to regex
        pattern = "^" + re.sub(r"\{([a-zA-Z0-9_]+)\}", r"(?P<\1>[^/]+)", tmpl) + "$"
        m = re.match(pattern, path)
        if m:
            r["_params"] = m.groupdict()
            return r
    return None

def render_template(obj: Any, ctx: Dict[str, Any]) -> Any:
    if isinstance(obj, str):
        def repl(m):
            key = m.group(1)
            if key == "uuid":
                import uuid
                return str(uuid.uuid4())
            # support nested query variables: query.foo
            if key.startswith("query."):
                return str(ctx.get("query", {}).get(key.split(".",1)[1], ""))
            return str(ctx.get(key, ""))
        return re.sub(r"\{([a-zA-Z0-9_\.]+)\}", repl, obj)
    if isinstance(obj, list):
        return [render_template(x, ctx) for x in obj]
    if isinstance(obj, dict):
        return {k: render_template(v, ctx) for k, v in obj.items()}
    return obj

class Handler(BaseHTTPRequestHandler):
    server_version = "MockServer/1.0"

    def _set_cors(self):
        c = GLOBAL.get("cors", {})
        if c.get("enabled"):
            self.send_header("Access-Control-Allow-Origin", ",".join(c.get("origins", ["*"])))
            self.send_header("Access-Control-Allow-Headers", ",".join(c.get("headers", ["*"])))
            self.send_header("Access-Control-Allow-Methods", ",".join(c.get("methods", ["*"])))

    def do_OPTIONS(self):
        self.send_response(200)
        self._set_cors()
        self.end_headers()

    def _handle_admin(self, path: str):
        if path == "/__admin/routes":
            body = json.dumps({"routes": ROUTES}, indent=2).encode()
            self.send_response(200); self.send_header("Content-Type","application/json"); self.end_headers(); self.wfile.write(body); return
        if path == "/__admin/requests":
            body = json.dumps({"requests": REQUEST_LOG[-200:]}, indent=2).encode()
            self.send_response(200); self.send_header("Content-Type","application/json"); self.end_headers(); self.wfile.write(body); return
        if path == "/__admin/requests/reset":
            REQUEST_LOG.clear()
            self.send_response(204); self.end_headers(); return
        return False

    def _maybe_reload(self):
        global CONFIG_MTIME
        try:
            mtime = os.path.getmtime(CONFIG_PATH)
            if mtime > CONFIG_MTIME:
                cfg = load_config(CONFIG_PATH)
                apply_config(cfg)
                logging.info("Reloaded config")
        except Exception:
            logging.exception("Failed to hot-reload config")

    def _record(self, entry: Dict[str, Any]):
        entry["t"] = time.time()
        REQUEST_LOG.append(entry)

    def do_generic(self):
        try:
            self._maybe_reload()
            parsed = urlparse(self.path)
            path = parsed.path
            if path.startswith("/__admin"):
                if self._handle_admin(path) is False:
                    self.send_response(404); self.end_headers()
                return
            route = match_route(self.command, path)
            if not route:
                self.send_response(404); self._set_cors(); self.end_headers(); self.wfile.write(b'{"error":"not found"}')
                return
            # build context
            length = int(self.headers.get("Content-Length", "0") or "0")
            body_bytes = self.rfile.read(length) if length else b""
            try:
                json_body = json.loads(body_bytes.decode("utf-8") or "null")
            except Exception:
                json_body = None
            query = {k: v[0] if isinstance(v, list) and v else "" for k, v in parse_qs(parsed.query).items()}
            ctx = {**route.get("_params", {}), "query": query, "body": json_body}
            # failure sequence
            seq = route.get("failure_sequence") or []
            status = route.get("status", 200)
            if seq:
                idx = route["_failure_index"]
                status = seq[min(idx, len(seq)-1)]
                if idx < len(seq)-1:
                    route["_failure_index"] += 1
            # delay
            delay_ms = int(route.get("delay_ms", 0) or 0)
            if delay_ms > 0:
                time.sleep(delay_ms/1000.0)
            # headers
            headers = {**route.get("headers", {})}
            for hk, hv in headers.items():
                if isinstance(hv, str):
                    headers[hk] = render_template(hv, ctx)
            # body
            body = route.get("body")
            if body is None:
                body = {"ok": True, "path": path, "params": route.get("_params", {}), "query": query}
            body = render_template(body, ctx)
            data = json.dumps(body).encode("utf-8") if not isinstance(body, (bytes, bytearray)) else body
            # response
            self.send_response(status)
            self._set_cors()
            for k, v in headers.items():
                self.send_header(k, v)
            if "Content-Type" not in headers:
                self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(data)
            self._record({"method": self.command, "path": path, "status": status, "query": query, "body": json_body})
        except Exception as e:
            logging.exception("handler error")
            self.send_response(500); self.end_headers(); self.wfile.write(b'{"error":"server error"}')

    def do_GET(self): self.do_generic()
    def do_POST(self): self.do_generic()
    def do_PUT(self): self.do_generic()
    def do_PATCH(self): self.do_generic()
    def do_DELETE(self): self.do_generic()

def serve(port: int):
    httpd = HTTPServer(("0.0.0.0", port), Handler)
    logging.info("Mock server listening on http://127.0.0.1:%d", port)
    httpd.serve_forever()

def main():
    global CONFIG_PATH
    ap = argparse.ArgumentParser(description="Run a configurable HTTP mock server.")
    ap.add_argument("--config", required=True, help="Path to JSON or YAML config file.")
    args = ap.parse_args()
    CONFIG_PATH = args.config
    cfg = load_config(CONFIG_PATH)
    apply_config(cfg)
    port = int(cfg.get("port", 8080))
    serve(port)

if __name__ == "__main__":
    main()
