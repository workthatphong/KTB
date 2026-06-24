from __future__ import annotations

import argparse
import uvicorn

def main() -> None:
    parser = argparse.ArgumentParser(description="Dashboard API server")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    uvicorn.run("backend.app.presentation.http.app:app", host="0.0.0.0", port=args.port, reload=True)


if __name__ == "__main__":
    main()
