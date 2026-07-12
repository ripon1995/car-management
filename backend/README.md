# Backend

FastAPI + Supabase (Postgres) API for the car fleet management system.
Python 3.14, managed with `pyenv` (see `.python-version`).

## Setup

```bash
cd backend
pyenv install 3.14.6   # if you don't already have it
python -m venv .car-management-venv
source .car-management-venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env   # then fill in DATABASE_URL / JWT_SECRET_KEY
```

### `.env`

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://...` connection string (see Supabase notes below) |
| `ENVIRONMENT` | `development` / `production` |
| `ALLOW_ORIGINS` | JSON array of allowed CORS origins, e.g. `["http://localhost:5173"]` |
| `JWT_SECRET_KEY` | secret used to sign auth JWTs |
| `JWT_ALGORITHM` | e.g. `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | token lifetime |

**Supabase gotcha #1:** the direct-connection host
(`db.<project-ref>.supabase.co`) often only resolves via IPv6, which fails
(`socket.gaierror`) on many networks. Use the **pooler** connection string
instead (`...pooler.supabase.com`, port `6543` transaction / `5432`
session), and add `+asyncpg` to the scheme yourself — Supabase's
copy-paste string doesn't include it.

**Supabase gotcha #2:** the pooler's `pgbouncer` runs in transaction mode,
which doesn't support asyncpg's server-side prepared statement cache.
`app/db/session.py` already passes `connect_args={"statement_cache_size":
0}` to `create_async_engine` to work around this — don't remove it.

## Running

```bash
source .car-management-venv/bin/activate
alembic upgrade head          # apply migrations
uvicorn app.main:app --reload # dev server at http://localhost:8000
```

API docs: `http://localhost:8000/docs`. All routes are mounted under
`/api/v1`.

## Common commands

```bash
ruff check app                        # lint
alembic upgrade head                  # apply migrations
alembic revision -m "message"         # create a new migration (written by
                                       # hand — see "Migrations" below)
```

## Migrations

There's no live Supabase DB to autogenerate against in this environment, so
migrations are written by hand: create the revision with `alembic revision
-m "message"`, then add `op.create_table`/etc. yourself. Use
`alembic/versions/0001_create_car_owners.py` as a template for a plain
table, or `0005_create_cars.py` for a table with FKs to other feature
tables (including the `unique=True` index pattern for
`engine_number`/`chassis_number`).

If you add a new feature package, remember to import its `models` module in
`alembic/env.py` so its tables register on `Base.metadata` before running
migrations.

## Architecture

The backend is organized **feature-first**: each business domain gets its
own package under `app/features/<feature>/` with a
repository → service → router layering (`models.py`, `schemas.py`,
`repository.py`, `service.py`, `router.py`). See
`.claude/CLAUDE.md` at the repo root for the full architectural writeup,
and `.claude/.rules/features/` for the per-feature data model/API specs.

**Known environment quirk:** this venv is Python 3.14. `passlib[bcrypt]`
does not work here (`AttributeError: module 'bcrypt' has no attribute
'__about__'`) because passlib is unmaintained and incompatible with modern
`bcrypt`. `app/core/security.py` uses the `bcrypt` package directly
instead — don't reintroduce `passlib`.
