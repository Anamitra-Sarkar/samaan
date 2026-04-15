from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from jose import jwt

from utils.runtime import get_secret_key

ALGORITHM = "HS256"
SECRET_KEY = get_secret_key()


def create_token(payload: Dict[str, Any], expires_delta: timedelta, token_type: str) -> str:
    data = payload.copy()
    data.update({"exp": datetime.now(timezone.utc) + expires_delta, "type": token_type})
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Dict[str, Any]:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
