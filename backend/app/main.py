from fastapi import FastAPI

from app.api import api_router
from app.core.config import settings

app = FastAPI(title="Car Management API")
app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
