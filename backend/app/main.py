"""Kiln Firing Schedule Desk — FastAPI application entrypoint."""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from sqlmodel import select

from .config import ALLOWED_ORIGINS, FRONTEND_DIST
from .db import init_db
from .deps import SessionDep
from .models import Firing, GlazeTile, Kiln, LoadSheet, Member
from .routers import auth, dashboard, firings, glaze_tiles, kilns, load_sheets, members
from .seed import seed_database

logger = logging.getLogger("kiln")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Create the schema and seed on every boot — a bare clone must render data."""
    init_db()
    from sqlmodel import Session

    from .db import engine

    with Session(engine) as session:
        seed_database(session)
    logger.info("Kiln desk ready: schema created, seed verified")
    yield


app = FastAPI(
    title="Kiln Firing Schedule Desk",
    version="1.0.0",
    description="Studio firing schedule, load sheets and glaze test tiles.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)

# Origin of the Vite studio app, used by the plain-HTML landing page. Overridable so
# the same artifact works locally and behind a real host / split deploy.
FRONTEND_URL = os.getenv("KILN_FRONTEND_URL", "http://localhost:5173").rstrip("/")

CSP = (
    "default-src 'self'; "
    "script-src 'self'; "
    "style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data:; "
    "font-src 'self' data:; "
    "connect-src 'self'; "
    "frame-ancestors 'none'; "
    "base-uri 'self'; "
    "form-action 'self'"
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Content-Security-Policy", CSP)
    return response


app.include_router(auth.router)
app.include_router(members.router)
app.include_router(kilns.router)
app.include_router(firings.router)
app.include_router(load_sheets.router)
app.include_router(glaze_tiles.router)
app.include_router(dashboard.router)


@app.get("/api/health", tags=["health"])
def health(session: SessionDep) -> dict:
    """Liveness plus the seeded record counts the studio cares about."""
    return {
        "status": "ok",
        "counts": {
            "members": len(session.execute(select(Member)).scalars().all()),
            "kilns": len(session.execute(select(Kiln)).scalars().all()),
            "firings": len(session.execute(select(Firing)).scalars().all()),
            "load_sheets": len(session.execute(select(LoadSheet)).scalars().all()),
            "glaze_tiles": len(session.execute(select(GlazeTile)).scalars().all()),
        },
    }


LANDING = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Kiln Firing Schedule Desk — API</title>
<style>
  :root { color-scheme: light; }
  body { margin:0; min-height:100dvh; background:#f8fafe; color:#111318;
         font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
         display:grid; place-items:center; padding:32px; }
  main { max-width: 44rem; }
  .chip { display:inline-block; background:#111318; color:#f8fafe; font-size:11px;
          letter-spacing:.12em; text-transform:uppercase; padding:6px 10px; }
  h1 { font-size: clamp(2rem, 6vw, 3.5rem); line-height:1.05; margin:24px 0 12px; }
  p { color:#60636a; line-height:1.6; }
  a { color:#3d2dd6; }
</style>
</head>
<body>
  <main>
    <span class="chip">Kiln Firing Schedule Desk</span>
    <h1>The API is running.</h1>
    <p>The studio interface is a Vite React app served on port 5173 and proxying
    <code>/api</code> to this service. Interactive API docs live at
    <a href="/docs">/docs</a>; liveness and seed counts at <a href="/api/health">/api/health</a>.</p>
    <p><a href="__FRONTEND_URL__/">Open the studio app →</a></p>
  </main>
</body>
</html>
"""


def landing_html() -> str:
    """Render the fallback landing page with the configured studio-app origin."""
    return LANDING.replace("__FRONTEND_URL__", FRONTEND_URL)


if (FRONTEND_DIST / "index.html").exists():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")


@app.get("/", include_in_schema=False, response_model=None)
def root():
    index = FRONTEND_DIST / "index.html"
    if index.exists():
        return FileResponse(index)
    return HTMLResponse(landing_html())


@app.get("/{full_path:path}", include_in_schema=False, response_model=None)
def spa_fallback(full_path: str):
    if full_path.startswith("api/") or full_path == "api":
        raise HTTPException(status_code=404, detail="Not found.")

    candidate = (FRONTEND_DIST / full_path).resolve()
    if candidate.is_file() and FRONTEND_DIST.resolve() in candidate.parents:
        return FileResponse(candidate)

    index = FRONTEND_DIST / "index.html"
    if index.exists():
        return FileResponse(index)
    return HTMLResponse(landing_html())
