"""Standalone launcher for the psych assessment platform.

Starts the FastAPI server (which also serves the built frontend) on a free
local port and opens the default browser. Intended to be frozen into a single
Windows .exe with PyInstaller so end users can double-click to run the app
without installing Python or Node.
"""
import os
import socket
import threading
import time
import webbrowser

import uvicorn

from app.main import app

HOST = "127.0.0.1"


def _free_port() -> int:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind((HOST, 0))
    port = s.getsockname()[1]
    s.close()
    return port


def _open_browser(url: str) -> None:
    # Wait for the server to accept connections, then open the browser.
    for _ in range(60):
        try:
            with socket.create_connection((HOST, _PORT), timeout=0.5):
                break
        except OSError:
            time.sleep(0.5)
    webbrowser.open(url)


_PORT = int(os.getenv("PORT") or _free_port())

if __name__ == "__main__":
    url = f"http://{HOST}:{_PORT}/"
    print(f"心理测评平台启动中… 浏览器将自动打开 {url}")
    print("（关闭此窗口即可停止程序）")
    if os.getenv("NO_BROWSER") != "1":
        threading.Thread(target=_open_browser, args=(url,), daemon=True).start()
    uvicorn.run(app, host=HOST, port=_PORT, log_level="warning")
