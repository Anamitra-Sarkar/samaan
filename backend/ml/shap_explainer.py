from __future__ import annotations

from typing import Dict, List


def explain_features(features: Dict, composite_score: float, risk_band: str) -> Dict:
    ranked = []
    for name, value in features.items():
        if value is None:
            continue
        weight = float(value) if isinstance(value, (int, float)) else 0.0
        ranked.append({
            "feature": name,
            "direction": "positive" if weight >= 0 else "negative",
            "impact": round(abs(weight) / (abs(weight) + 10.0), 3),
        })

    ranked.sort(key=lambda item: item["impact"], reverse=True)
    return {
        "top_features": ranked[:3],
        "composite_score": composite_score,
        "risk_band": risk_band,
    }

