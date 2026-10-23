#!/usr/bin/env bash

# Re-exec under bash when invoked as `sh script.sh` (dash lacks pipefail).
if [ -z "${BASH_VERSION:-}" ]; then exec bash "$0" "$@"; fi
# Kiln Firing Schedule Desk — one-shot, non-interactive install.
# Installs project dependencies, builds the studio app and seeds the demo data.
# It never starts a server and exits non-zero on any real failure.
set -euo pipefail
cd "$(dirname "$0")"

echo "== Kiln Firing Schedule Desk — install =="

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required (Python 3.11+). See INSTALL.md." >&2
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required (Node 20+). See INSTALL.md." >&2
  exit 1
fi

echo "→ Backend dependencies (pip)"
python3 -m pip install --quiet --upgrade pip setuptools wheel || echo "   (could not upgrade pip; continuing)"

PIP_EXTRA=""
if python3 - <<'PY'
import pathlib, sysconfig

marker = pathlib.Path(sysconfig.get_path("stdlib")) / "EXTERNALLY-MANAGED"
raise SystemExit(0 if marker.exists() else 1)
PY
then
  PIP_EXTRA="--break-system-packages"
fi

# shellcheck disable=SC2086
python3 -m pip install $PIP_EXTRA -r backend/requirements.txt

echo "→ Frontend dependencies (npm)"
cd frontend
npm install --no-audit --no-fund
echo "→ Production build of the studio app"
npm run build
cd ..

echo "→ Database schema and demo seed (idempotent)"
cd backend
python3 -m seed
cd ..

echo "→ Import self-check"
cd backend
python3 -c "import main"
cd ..

echo
echo "Install complete. Start the app with:  sh start.sh"
echo "  studio app  http://localhost:5173   (sign in: cenius@cenius.ai / cenius)"
echo "  API         http://localhost:8000/api/health"
