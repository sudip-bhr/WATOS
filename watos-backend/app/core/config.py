from pydantic import field_validator
from pydantic_settings import BaseSettings
from typing import List, Union
import json


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost/watos"
    REDIS_URL: str = "redis://localhost:6379"
    SECRET_KEY: str = "watos-super-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_HOURS: int = 8
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALLOWED_ORIGINS: List[str] = ["http://localhost:5173"]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            if isinstance(v, str):
                return json.loads(v)
            return v
        raise ValueError(v)

    # Mail
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = ""
    MAIL_SERVER: str = ""
    MLFLOW_TRACKING_URI: str = "mlruns"

    # Model Storage (Phase 1.3)
    MODEL_STORE_BACKEND: str = "local"      # "local" or "s3"
    S3_BUCKET: str = "watos-models"

    # Web Push Notifications (Phase 3.1)
    VAPID_PRIVATE_KEY: str = ""
    VAPID_PUBLIC_KEY: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
