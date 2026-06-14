from __future__ import annotations

import argparse

from backend.app.presentation.http.app import app


def main() -> None:
    parser = argparse.ArgumentParser(description="Dashboard API server")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    app.run(host="0.0.0.0", port=args.port)


if __name__ == "__main__":
    main()
