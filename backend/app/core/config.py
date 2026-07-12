from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/car_management"
    environment: str = "development"
    # Dev-only default: frontend/ isn't scaffolded yet, but React tooling
    # (Vite) defaults to this port.
    allow_origins: list[str] = ["http://localhost:5173"]

    jwt_secret_key: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    api_v1_prefix: str = "/api/v1"


settings = Settings()
