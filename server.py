#!/usr/bin/env python3
"""HTTP server for the English Grammar app — serves static files + Anthropic API proxy."""
import http.server
import json
import os
import sys
import urllib.request
import urllib.error
from socketserver import ThreadingMixIn

DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(DIR)

PORT = 8080

class ThreadingHTTPServer(ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True

class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        print(f"[{self.address_string()}] {args[0]}")

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        if self.path == '/api/generate':
            self._handle_generate()
        else:
            self.send_response(404)
            self.end_headers()

    def _handle_generate(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(length))
            api_key = body.get('api_key', '')
            model = body.get('model', 'deepseek-chat')
            prompt = body.get('prompt', '')

            if not api_key:
                self._json_resp(400, {'error': '请先在设置中配置 DeepSeek API Key'})
                return
            if not prompt:
                self._json_resp(400, {'error': '请求内容为空'})
                return

            req_body = json.dumps({
                'model': model,
                'max_tokens': 4096,
                'messages': [{'role': 'user', 'content': prompt}]
            }).encode('utf-8')

            req = urllib.request.Request(
                'https://api.deepseek.com/v1/chat/completions',
                data=req_body,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {api_key}'
                }
            )

            with urllib.request.urlopen(req, timeout=120) as resp:
                result = json.loads(resp.read())
                text = result.get('choices', [{}])[0].get('message', {}).get('content', '')

                self._json_resp(200, {'text': text})

        except urllib.error.HTTPError as e:
            err_body = e.read().decode() if e.fp else ''
            msg = f'API 错误 ({e.code})'
            try:
                err_json = json.loads(err_body)
                msg = err_json.get('error', {}).get('message', msg)
            except:
                pass
            self._json_resp(e.code, {'error': msg})
        except Exception as e:
            self._json_resp(500, {'error': f'请求失败: {str(e)}'})

    def _json_resp(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

print(f"Serving from: {DIR}")
print(f"Open http://localhost:{PORT} in your browser")
print(f"API proxy at http://localhost:{PORT}/api/generate")
print("Press Ctrl+C to stop")

httpd = ThreadingHTTPServer(('', PORT), Handler)
try:
    httpd.serve_forever()
except KeyboardInterrupt:
    print("\nShutting down...")
    httpd.shutdown()
