"""
多线程 Python 静态服务器 — 替代默认单线程 http.server
修复并发的图片请求 404 问题
"""
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
from socketserver import ThreadingMixIn


class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    """每个请求一个线程，支持高并发图片请求"""
    daemon_threads = True
    allow_reuse_address = True


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    host = sys.argv[2] if len(sys.argv) > 2 else '127.0.0.1'
    print(f'[dev-server] starting on {host}:{port} (threading)')
    server = ThreadingHTTPServer((host, port), SimpleHTTPRequestHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('[dev-server] stopped')
        server.shutdown()
