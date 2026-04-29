#!/usr/bin/env python3
import json
import ssl
import threading
import time
import urllib.error
import urllib.request
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse


CONFIG = {
    "base_url": "https://kiberonekaliningrad.s20.online",
    "company_id": 18,
    "api_key": "28cba784-c049-11ed-8535-ac1f6b4782be",
    "app_key": "674bacf20ee8960c86c55795bb76690d",
    "page_size": 500,
    "port": 7788,
}

SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE

INDEX_HTML = Path(__file__).with_name("index.html")


def fetch_page(page: int):
    candidates = [
        f"{CONFIG['base_url']}/v2api/{CONFIG['company_id']}/lead/index",
        f"{CONFIG['base_url']}/v2api/lead/index",
        f"{CONFIG['base_url']}/api/v2/lead/index",
    ]

    body = json.dumps(
        {
            "auth": {"id": CONFIG["company_id"], "apiKey": CONFIG["api_key"]},
            "model": {"page": page, "count": CONFIG["page_size"]},
        }
    ).encode("utf-8")

    last_error = ""
    for url in candidates:
        req = urllib.request.Request(url, data=body, method="POST")
        req.add_header("Content-Type", "application/json")
        req.add_header("X-Api-Key", CONFIG["api_key"])
        req.add_header("X-APP-KEY", CONFIG["app_key"])
        req.add_header("Accept", "application/json")
        req.add_header("User-Agent", "CRM-Desktop/1.0")

        try:
            with urllib.request.urlopen(req, timeout=35, context=SSL_CTX) as resp:
                raw = resp.read().decode("utf-8")
                data = json.loads(raw)

            if isinstance(data, list):
                items = data
            elif isinstance(data, dict):
                items = data.get("data") or data.get("items") or data.get("leads") or []
            else:
                items = []

            return items, len(items) >= CONFIG["page_size"], url
        except urllib.error.HTTPError as e:
            snippet = e.read().decode("utf-8", errors="ignore")[:220]
            last_error = f"API {e.code} at {url}: {snippet}"
        except Exception as e:
            last_error = f"API error at {url}: {e}"

    raise RuntimeError(last_error or "CRM API request failed")


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        return

    def do_GET(self):
        if self.path == "/" or self.path.startswith("/index.html"):
            self.serve_index()
            return
        if self.path.startswith("/api/leads"):
            self.serve_leads()
            return
        self.send_response(404)
        self.end_headers()

    def serve_index(self):
        data = INDEX_HTML.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def serve_leads(self):
        qs = parse_qs(urlparse(self.path).query)
        page = int(qs.get("page", ["0"])[0])
        try:
            items, has_more, source = fetch_page(page)
            result = json.dumps({"items": items, "hasMore": has_more, "sourceUrl": source}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Length", str(len(result)))
            self.end_headers()
            self.wfile.write(result)
        except Exception as e:
            err = json.dumps({"error": str(e)}).encode("utf-8")
            self.send_response(500)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(err)))
            self.end_headers()
            self.wfile.write(err)


def open_browser(port: int):
    time.sleep(1.1)
    webbrowser.open(f"http://localhost:{port}")


def main():
    port = CONFIG["port"]
    print("=" * 55)
    print(" CRM Лиды — Desktop")
    print("=" * 55)
    print(f"Сервер: http://localhost:{port}")
    print("Остановка: Ctrl+C")
    print("=" * 55)

    threading.Thread(target=open_browser, args=(port,), daemon=True).start()
    server = HTTPServer(("localhost", port), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nСервер остановлен")


if __name__ == "__main__":
    main()
