# Dashboard (Vercel + Supabase Ready) 

## Project Structure   

```text 
.
|- api/                # Vercel function entrypoint
|- backend/            # Python backend source
|  `- app/
|     |- presentation/ # HTTP layer (Flask app, routes, auth, upload validation)
|     |- application/  # Use-cases / orchestration
|     |- config/       # Settings and constants
|     |- infrastructure/ # SQLite, Supabase sync, parser, static/bundler adapters
|     `- services/     # Domain-oriented service modules
|- docs/               # Documentation (.md files)
|- frontend/
|  |- public/          # Static assets (index.html, fonts)
|  `- src/
|     |- features/     # Feature-first modules (dashboard, timeline, charts, etc.)
|     |- components/   # Shared UI components
|     |- hooks/        # App-level hooks
|     `- lib/          # Shared utilities/constants
|- scripts/            # Startup scripts and app entry point
|- requirements.txt    # Dependencies
`- vercel.json         # Vercel config
```

## Local Run

1. Install dependencies:
   `pip install -r requirements.txt`
   `npm install`
2. Build frontend:
   `npm run build`
   optional bundle analysis: `npm run analyze`
3. Start server:
   `bash scripts/start.sh` (Linux/macOS)
   or `.\scripts\start.ps1` (Windows)
   
   (Alternatively: `python scripts/app.py --port 8000`)
4. Open:
   `http://localhost:8000/`

## Write Endpoint Authentication (Production)

The backend now supports token guard for write endpoints:
- `POST /api/upload`
- `POST /api/gsheet/connect`
- `POST /api/gsheet/sync`
- `DELETE /api/sources/<id>`
- `DELETE /api/gsheet/<id>`

Set `DASHBOARD_WRITE_TOKEN` in production to enforce authentication on these endpoints.

Send either header format:
- `Authorization: Bearer <token>`
- `X-Write-Token: <token>` (or `X-API-Key`)

If `DASHBOARD_WRITE_TOKEN` is not set, write endpoints remain open for local/dev compatibility.

### Optional Upload Safety Limits

You can tune upload guards with env vars:
- `DASHBOARD_MAX_UPLOAD_REQUEST_BODY_BYTES` (default: `41943040`)
- `DASHBOARD_MAX_UPLOAD_TOTAL_DECODED_BYTES` (default: `26214400`)
- `DASHBOARD_MAX_UPLOAD_FILE_BYTES` (default: `10485760`)
- `DASHBOARD_MAX_UPLOAD_FILES` (default: `10`)

## Supabase Setup 

Set environment variables (see `.env.example`):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (recommended for backend writes)
- optional: `SUPABASE_SCHEMA` (default `public`)

Before first run, create the required tables in Supabase SQL Editor:
- run [`docs/supabase_schema.sql`](docs/supabase_schema.sql)

When Supabase env vars are present:
- App loads persisted data from Supabase into local SQLite cache on startup.
- Data changes are synced back to Supabase after upload/sync/delete actions.

Default SQLite path is `data/local_dashboard.db` (with fallback to legacy `local_dashboard.db`).
Set `LOCAL_DB_PATH` when you want to use another location.

## Deploy on Vercel 

1. Push repository to GitHub.
2. Import project in Vercel.
3. Add env vars from `.env.example` in Vercel Project Settings:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - optional `SUPABASE_SCHEMA`
   - optional `DASHBOARD_WRITE_TOKEN`
4. Deploy.

API endpoints stay under `/api/*`, and frontend is served from `/`.
