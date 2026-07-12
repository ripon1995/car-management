# Frontend

Vite + React + TypeScript client for the car fleet management system.

## Setup

```bash
cd frontend
npm install
cp .env.example .env   # defaults to http://localhost:8000/api/v1
```

### `.env`

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | base URL of the backend API (default `http://localhost:8000/api/v1`) |

## Running

```bash
npm run dev       # dev server (http://localhost:5173 by default)
npm run build     # type-check (tsc -b) + production build
npm run preview   # preview the production build locally
npm run lint       # oxlint
```

The backend must be running (see `../backend/README.md`) for the app to do
anything beyond render the login page.

## Architecture

The frontend is **feature-first**, mirroring the backend: each business
entity gets a page (`src/pages/<Feature>Page.tsx`), an API module
(`src/api/<feature>.ts`), and, if it needs more than primitive fields, a
types file (`src/types/<feature>.ts`). `CarOwnersPage.tsx` is the reference
implementation that the other feature pages (`VendorsPage.tsx`,
`DriversPage.tsx`, `CarsPage.tsx`) — and future ones — copy conventions
from: shared page-chrome classes in `App.css` (`.page-header`,
`.btn-primary`, `.data-table`, modal shells, etc.), `NavIcons.tsx` for
icons, and `src/api/client.ts` for the fetch wrapper and auth headers.

See `.claude/CLAUDE.md` at the repo root for the full write-up of these
conventions before building a new feature page.
