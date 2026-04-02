from __future__ import annotations

from typing import List

import numpy as np
import pandas as pd
import shap
from sklearn.pipeline import Pipeline


def compute_shap_explanation(pipeline: Pipeline, feature_row: dict, feature_columns: list) -> list:
    """
    Returns top-3 SHAP feature contributions as a list of dicts.
    """
    xgb_model = pipeline.named_steps["model"]
    explainer = shap.TreeExplainer(xgb_model)

    preprocessor = Pipeline(steps=pipeline.steps[:-1])
    row_df = pd.DataFrame([feature_row], columns=feature_columns)
    transformed = preprocessor.transform(row_df)

    shap_values = explainer.shap_values(transformed)
    if isinstance(shap_values, list):
        probabilities = xgb_model.predict_proba(transformed)
        class_index = int(np.argmax(probabilities[0]))
        row_values = np.asarray(shap_values[class_index])[0]
    else:
        row_values = np.asarray(shap_values)[0]

    top_indices = np.argsort(np.abs(row_values))[::-1][:3]
    result = []
    for idx in top_indices:
        value = float(row_values[idx])
        result.append({
            "feature": feature_columns[idx],
            "shap_value": round(value, 4),
            "direction": "positive" if value >= 0 else "negative",
        })
    return result
