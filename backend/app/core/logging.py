import logging
import time
from collections.abc import Awaitable, Callable
from datetime import datetime

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

request_logger = logging.getLogger("request")


def setup_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )


class RequestLoggerMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp, env_name: str) -> None:
        super().__init__(app)
        self.env_name = env_name.upper()

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        request_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        request_logger.info(
            "START | %s | %s | %s | ", request_time, self.env_name, request.method
        )

        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start) * 1000

        request_logger.info(
            "FINISHED | %s | %s | Status: %s | Duration: %.2fms",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
        )
        return response
