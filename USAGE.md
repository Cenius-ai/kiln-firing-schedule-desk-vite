# Using Kiln Firing Schedule Desk

## Overview

This is **Kiln Firing Schedule Desk** — an HTTP API + web UI. This document covers the surface area you can use, with copy-pasteable examples for each entry point. For setup, see `INSTALL.md`.

## Quickstart

After completing the install steps in `INSTALL.md`:

```bash
# start the dev server (see INSTALL.md step 6)
# in another terminal:
curl http://localhost:8000/
```

## Endpoints

Every endpoint below was extracted from the source by the route scanner (Next.js / FastAPI / Flask / Django / Express).

| Method | Path | Source file |
|--------|------|-------------|
| `DELETE` | `/{firing_id}` | `backend/app/routers/firings.py` |
| `DELETE` | `/{sheet_id}` | `backend/app/routers/load_sheets.py` |
| `DELETE` | `/{tile_id}` | `backend/app/routers/glaze_tiles.py` |
| `GET` | `/` | `backend/app/main.py` |
| `GET` | `/api/health` | `backend/app/main.py` |
| `GET` | `/me` | `backend/app/routers/auth.py` |
| `GET` | `/session` | `backend/app/routers/auth.py` |
| `GET` | `/summary` | `backend/app/routers/dashboard.py` |
| `GET` | `/{firing_id}` | `backend/app/routers/firings.py` |
| `GET` | `/{full_path:path}` | `backend/app/main.py` |
| `GET` | `/{sheet_id}` | `backend/app/routers/load_sheets.py` |
| `GET` | `/{tile_id}` | `backend/app/routers/glaze_tiles.py` |
| `PATCH` | `/me` | `backend/app/routers/members.py` |
| `PATCH` | `/{firing_id}` | `backend/app/routers/firings.py` |
| `PATCH` | `/{sheet_id}` | `backend/app/routers/load_sheets.py` |
| `PATCH` | `/{tile_id}` | `backend/app/routers/glaze_tiles.py` |
| `POST` | `/login` | `backend/app/routers/auth.py` |
| `POST` | `/logout` | `backend/app/routers/auth.py` |
| `GET` | `/calendar` | `frontend/src/App.jsx` |
| `GET` | `/calendar/:firingId/edit` | `frontend/src/App.jsx` |
| `GET` | `/calendar/new` | `frontend/src/App.jsx` |
| `GET` | `/dashboard` | `frontend/src/App.jsx` |
| `GET` | `/glazes` | `frontend/src/App.jsx` |
| `GET` | `/glazes/:tileId` | `frontend/src/App.jsx` |
| `GET` | `/glazes/:tileId/edit` | `frontend/src/App.jsx` |
| `GET` | `/glazes/new` | `frontend/src/App.jsx` |
| `GET` | `/load-sheets` | `frontend/src/App.jsx` |
| `GET` | `/load-sheets/:sheetId` | `frontend/src/App.jsx` |
| `GET` | `/load-sheets/:sheetId/edit` | `frontend/src/App.jsx` |
| `GET` | `/load-sheets/new` | `frontend/src/App.jsx` |
| `GET` | `/login` | `frontend/src/App.jsx` |
| `GET` | `/profile` | `frontend/src/App.jsx` |

### curl examples

#### `DELETE /{firing_id}`

```bash
curl -X DELETE http://localhost:8000/1
```

#### `DELETE /{sheet_id}`

```bash
curl -X DELETE http://localhost:8000/1
```

#### `DELETE /{tile_id}`

```bash
curl -X DELETE http://localhost:8000/1
```

#### `GET /`

```bash
curl http://localhost:8000/
```

#### `GET /api/health`

```bash
curl http://localhost:8000/api/health
```

## Worked example

1. Boot the server (`see INSTALL.md`).
2. Hit a smoke-test endpoint:

```bash
curl -sS http://localhost:8000/
```

3. If you get a JSON / HTML response, the server is healthy. Inspect `.env` if it errors with an auth/config failure.

## Reference

### Entry points

_No explicit entry points declared in this project's manifests._

### Surface index (auto-extracted)

| Kind | Title | Source file |
|------|-------|-------------|
| route | `DELETE /{firing_id}` | `backend/app/routers/firings.py` |
| route | `DELETE /{sheet_id}` | `backend/app/routers/load_sheets.py` |
| route | `DELETE /{tile_id}` | `backend/app/routers/glaze_tiles.py` |
| route | `GET /` | `backend/app/main.py` |
| route | `GET /api/health` | `backend/app/main.py` |
| route | `GET /me` | `backend/app/routers/auth.py` |
| route | `GET /session` | `backend/app/routers/auth.py` |
| route | `GET /summary` | `backend/app/routers/dashboard.py` |
| route | `GET /{firing_id}` | `backend/app/routers/firings.py` |
| route | `GET /{full_path:path}` | `backend/app/main.py` |
| route | `GET /{sheet_id}` | `backend/app/routers/load_sheets.py` |
| route | `GET /{tile_id}` | `backend/app/routers/glaze_tiles.py` |
| route | `PATCH /me` | `backend/app/routers/members.py` |
| route | `PATCH /{firing_id}` | `backend/app/routers/firings.py` |
| route | `PATCH /{sheet_id}` | `backend/app/routers/load_sheets.py` |
| route | `PATCH /{tile_id}` | `backend/app/routers/glaze_tiles.py` |
| route | `POST /login` | `backend/app/routers/auth.py` |
| route | `POST /logout` | `backend/app/routers/auth.py` |
| route | `/` | `frontend/src/App.jsx` |
| route | `/calendar` | `frontend/src/App.jsx` |
| route | `/calendar/:firingId/edit` | `frontend/src/App.jsx` |
| route | `/calendar/new` | `frontend/src/App.jsx` |
| route | `/dashboard` | `frontend/src/App.jsx` |
| route | `/glazes` | `frontend/src/App.jsx` |
| route | `/glazes/:tileId` | `frontend/src/App.jsx` |
| route | `/glazes/:tileId/edit` | `frontend/src/App.jsx` |
| route | `/glazes/new` | `frontend/src/App.jsx` |
| route | `/load-sheets` | `frontend/src/App.jsx` |
| route | `/load-sheets/:sheetId` | `frontend/src/App.jsx` |
| route | `/load-sheets/:sheetId/edit` | `frontend/src/App.jsx` |
| route | `/load-sheets/new` | `frontend/src/App.jsx` |
| route | `/login` | `frontend/src/App.jsx` |
| route | `/profile` | `frontend/src/App.jsx` |

## Next steps

- Read [INSTALL.md](./INSTALL.md) if anything in the Quickstart didn't work.
- Inspect `.env.example` for the full list of environment variables this project understands.
- See [README.md](./README.md) for the architecture diagram + feature list.
