from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_router
from app.core.config import settings
from app.core.exception_handler import register_exception_handlers
from app.core.logging import RequestLoggerMiddleware, setup_logging

setup_logging()

app = FastAPI(title="Car Management API")

# ── Exception handlers ──────────────────────────────────────────────────────
register_exception_handlers(app)

# ── Middleware ──────────────────────────────────────────────────────────────
# Dev-only: allow the frontend dev server to call the API. Auth is a Bearer
# token, not cookies, so allow_credentials isn't required for that flow.
app.add_middleware(
    CORSMiddleware,  # type: ignore[arg-type]
    allow_origins=settings.allow_origins,  # type: ignore[arg-type]
    allow_credentials=True,  # type: ignore[arg-type]
    allow_methods=["*"],  # type: ignore[arg-type]
    allow_headers=["*"],  # type: ignore[arg-type]
)

app.add_middleware(RequestLoggerMiddleware, env_name=settings.environment)  # type: ignore[arg-type]

app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
