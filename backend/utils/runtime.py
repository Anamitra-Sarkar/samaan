from __future__ import annotations

import os
from typing import List


def env_flag(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def is_production() -> bool:
    return os.getenv("SAMAAN_ENV", os.getenv("APP_ENV", "development")).strip().lower() == "production"


def get_secret_key() -> str:
    secret = os.getenv("SECRET_KEY")
    if secret:
        return secret
    if is_production():
        raise RuntimeError("SECRET_KEY must be set in production")
    return "samaan-secret-key-for-development-only"


def get_database_url() -> str:
    return os.getenv("DATABASE_URL", os.getenv("SQLALCHEMY_DATABASE_URL", "sqlite:///./samaan.db"))


def get_cors_origins() -> List[str]:
    origins = os.getenv("ALLOWED_ORIGINS", "")
    values = [origin.strip() for origin in origins.split(",") if origin.strip()]
    if values:
        return values

    fallback = [origin.strip() for origin in os.getenv("FRONTEND_URL", "").split(",") if origin.strip()]
    if fallback:
        return fallback

    if is_production():
        return []
    return ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5173"]


def get_cors_origin_regex() -> str | None:
    if os.getenv("ALLOWED_ORIGINS", "").strip():
        return None
    if is_production():
        return r"https://.*\.vercel\.app$"
    return None
