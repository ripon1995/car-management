# Car Management

A car fleet management system: Car Owners lease Cars to Vendors, with a
Driver assigned to each Car. Maintenance, Car Docs, and Payment records are
car-scoped, and Revenue is a dashboard computed from Payments.

- **Backend:** FastAPI + Supabase (Postgres), Python 3.14 via `pyenv` —
  see `backend/README.md`.
- **Frontend:** Vite + React + TypeScript — see `frontend/README.md`.

## Quick start

```bash
# backend
cd backend
python -m venv .car-management-venv
source .car-management-venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET_KEY
alembic upgrade head
uvicorn app.main:app --reload   # http://localhost:8000

# frontend (separate terminal)
cd frontend
npm install
cp .env.example .env
npm run dev                     # http://localhost:5173
```

## Project layout

```
backend/    FastAPI app, feature-first (repository → service → router)
frontend/   React app, feature-first (page + api module + types)
.claude/    Claude Code project instructions and feature specs
```

Both halves follow a **feature-first** structure — each business domain
(Car, Vendor, Driver, Car Owner, Maintenance, Car Docs, Payment) gets its
own package on the backend and its own page/api/types module on the
frontend. See `backend/README.md` and `frontend/README.md` for
per-project setup, and `.claude/CLAUDE.md` for the full architectural
conventions both sides follow.

## Feature specs

Before implementing a feature, read the relevant doc in
`.claude/.rules/features/` — these are the authoritative data model and
API design for the project (`00-overview.md` for the business model and
cross-cutting conventions, then the numbered doc per feature).

## Notes

- No unit test suite in this project by explicit choice — don't add one
  unless asked.
- API base path is `/api/v1/` (versioned deliberately, not flattened).
