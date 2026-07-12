from fastapi import status


class AppException(Exception):
    """Base class for custom application exceptions.

    Subclasses set error_code/error_status/message as class defaults; `detail`
    carries the specific, request-level context for a given raise site.
    """

    error_code: str = "internal_error"
    error_status: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    message: str = "An unexpected error occurred"

    def __init__(self, detail: str | None = None, headers: dict[str, str] | None = None) -> None:
        self.detail = detail or self.message
        self.headers = headers
        super().__init__(self.detail)


class AuthenticationException(AppException):
    error_code = "authentication_error"
    error_status = status.HTTP_401_UNAUTHORIZED
    message = "Could not validate credentials"

    def __init__(self, detail: str | None = None) -> None:
        super().__init__(detail, headers={"WWW-Authenticate": "Bearer"})


class AuthorizationException(AppException):
    error_code = "authorization_error"
    error_status = status.HTTP_403_FORBIDDEN
    message = "You are not authorized to perform this action"


class NotFoundException(AppException):
    error_code = "not_found"
    error_status = status.HTTP_404_NOT_FOUND
    message = "Resource not found"


class ConflictException(AppException):
    error_code = "conflict"
    error_status = status.HTTP_409_CONFLICT
    message = "Resource conflict"


class ValidationException(AppException):
    error_code = "validation_error"
    error_status = status.HTTP_422_UNPROCESSABLE_CONTENT
    message = "Validation failed"
