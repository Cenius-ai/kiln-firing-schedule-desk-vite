# Install and run the Kiln Firing Schedule Desk

Everything here is non-interactive. Nothing requires `sudo`, no system packages are installed and no
database server is needed.

## Prerequisites (install these yourself)

- **Python 3.11+** with `pip` (`python3 --version`)
- **Node.js 20.19+ or 22.12+** with `npm` (`node --version`), required by Vite 8

Nothing else. Fonts, icons and all assets are installed from the package registries into the project.

## Step 1 — install dependencies and build the studio app

```bash
sh install.sh
```

This runs, in order:

1. `pip install -r backend/requirements.txt` (FastAPI, Uvicorn, SQLModel, PyJWT, bcrypt, pytest, httpx)
2. `npm install` in `frontend/` (React, React Router, Vite, self-hosted Archivo fonts)
3. `npm run build` in `frontend/` — produces `frontend/dist`, which the backend can also serve
4. `python3 -m seed` from `backend/` — creates `backend/kiln.db` and the demo studio data
5. an import self-check (`python3 -c "import main"`)

The script then **exits**. It never starts a server.

## Step 2 — seed the demo data (already done by step 1, safe to repeat)

```bash
cd backend && python3 -m seed
```

Idempotent: it creates the demo members, two kilns, four firings (relative to today), three load sheets
and six glaze tiles only when they are missing. Running it again changes nothing.

## Step 3 — run the app

```bash
sh start.sh
```

- FastAPI: <http://localhost:8000> (`/api/health`, `/docs`)
- Studio app: <http://localhost:5173>

Sign in with **cenius@cenius.ai / cenius** (printed on the sign-in card).

To run the halves in separate terminals:

```bash
cd backend  && python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000
cd frontend && npm run dev
```

The Vite dev server proxies `/api` to `http://127.0.0.1:8000`, so keep the backend on port 8000.

## Step 4 — run the tests

```bash
python3 -m pytest          # repository root, 28 tests
```

## Resetting the demo database

```bash
rm -f backend/kiln.db backend/kiln.db-wal backend/kiln.db-shm
cd backend && python3 -m seed
```

## Troubleshooting

| Symptom                                                  | Fix                                                                     |
| -------------------------------------------------------- | ----------------------------------------------------------------------- |
| `ModuleNotFoundError: No module named 'fastapi'`          | Run `sh install.sh` (or `python3 -m pip install -r backend/requirements.txt`) |
| `EADDRINUSE` on 8000 / 5173                               | Stop the other process, or run `PORT=8010 sh start.sh` with the proxy target updated in `frontend/vite.config.js` |
| `npm run dev` says Vite needs a newer Node               | Upgrade Node to 20.19+ or 22.12+                                        |
| Pipeline / externally-managed Python environment error    | `install.sh` already retries with `--break-system-packages` when the interpreter is marked externally managed; otherwise use a virtualenv |
| Sign-in says “Email or password is incorrect.”            | Use the seeded demo account exactly: `cenius@cenius.ai` / `cenius`       |
| Want a different signing secret                          | Set `KILN_JWT_SECRET`, or delete `backend/.jwt_secret` to regenerate it |
