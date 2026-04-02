from __future__ import annotations

from math import radians, sin, cos, sqrt, atan2
from typing import Optional, Tuple


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return r * c


def normalize_latlng(lat: Optional[float], lng: Optional[float]) -> Tuple[Optional[float], Optional[float]]:
    return (float(lat) if lat is not None else None, float(lng) if lng is not None else None)

