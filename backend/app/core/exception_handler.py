from fastapi import FastAPI, Request
from starlette.responses import JSONResponse

from app.core.exceptions import AppException


def register_exception_handlers(app: FastAPI) -> None:
    """Registers all global exception handlers for the FastAPI application.

    Call this once during app startup.
    """

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.error_status,
            content={
                "error_code": exc.error_code,
                "error_status": exc.error_status,
                "detail": exc.detail,
                "message": exc.message,
            },
            headers=exc.headers,
        )
