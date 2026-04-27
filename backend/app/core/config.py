from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import json


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    database_url: str = "postgresql+asyncpg://itil_user:itil_password@localhost:5432/itil_db"
    secret_key: str = "change-this-to-a-random-secret-key-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    cors_origins: str = '["http://localhost:5173","http://localhost:3000"]'
    environment: str = "development"
    log_level: str = "INFO"

    @property
    def cors_origin_list(self) -> List[str]:
        return json.loads(self.cors_origins)


settings = Settings()
