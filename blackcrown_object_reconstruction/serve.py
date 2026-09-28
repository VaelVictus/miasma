from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os
import threading
import webbrowser

root_dir = Path(__file__).resolve().parent
port = 8765


def open_browser():
    webbrowser.open(f"http://127.0.0.1:{port}/")


def main():
    os.chdir(root_dir)
    threading.Timer(0.5, open_browser).start()
    server = ThreadingHTTPServer(("127.0.0.1", port), SimpleHTTPRequestHandler)
    print(f"Black Crown object viewer: http://127.0.0.1:{port}/")
    print("Press Ctrl+C to stop.")
    server.serve_forever()


if __name__ == "__main__":
    main()
