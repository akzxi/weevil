from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Unset (or left blank) falls back to the SDK's own credential chain (env var, `ant auth login` profile).
    anthropic_api_key: SecretStr | None = None
    database_url: str = "postgresql+asyncpg://weevil:weevil@localhost:5432/weevil"
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:5199"]


settings = Settings()
if settings.anthropic_api_key is not None and not settings.anthropic_api_key.get_secret_value().strip():
    settings.anthropic_api_key = None
