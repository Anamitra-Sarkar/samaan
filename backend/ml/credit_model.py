from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Tuple

import joblib
import numpy as np
import pandas as pd
from xgboost import XGBClassifier
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from models.credit import RiskBand
from ml.shap_explainer import compute_shap_explanation

MODEL_PATH = Path(os.getenv("SAMAAN_CREDIT_MODEL_PATH", "/data/credit_model.pkl"))
FALLBACK_MODEL_PATH = Path("/tmp/samaan-credit-model.pkl")
MODEL_VERSION = "1.0.0"

FEATURE_COLUMNS = [
    "repayment_rate",
    "default_rate",
    "avg_loan_amount",
    "electricity_units_monthly",
    "mobile_recharge_monthly_avg",
    "utility_bill_avg",
    "govt_survey_income_band",
]

RISK_ORDER = [
    RiskBand.LOW_RISK_HIGH_NEED,
    RiskBand.LOW_RISK_LOW_NEED,
    RiskBand.HIGH_RISK_HIGH_NEED,
    RiskBand.HIGH_RISK_LOW_NEED,
]


def _encode_income_band(value):
    mapping = {"A": 0, "B": 1, "C": 2, "D": 3}
    if value is None:
        return -1
    return mapping.get(str(value).upper(), -1)


def _decode_risk(label: int) -> RiskBand:
    return RISK_ORDER[int(label)]


def _synthetic_training_frame(rows: int = 500) -> tuple[pd.DataFrame, np.ndarray]:
    rng = np.random.default_rng(42)
    repayment_rate = rng.uniform(0, 1, rows)
    default_rate = rng.uniform(0, 0.7, rows)
    avg_loan_amount = rng.uniform(10000, 250000, rows)
    electricity = rng.uniform(10, 220, rows)
    recharge = rng.uniform(50, 1200, rows)
    bill = rng.uniform(0, 3000, rows)
    income = rng.integers(-1, 4, rows)

    risk = []
    for rep, default, amt, elec, rech, util, inc in zip(repayment_rate, default_rate, avg_loan_amount, electricity, recharge, bill, income):
        score = rep * 0.45 + (1 - default) * 0.2 + (1 - min(amt / 250000, 1)) * 0.1 + (1 - min(elec / 250, 1)) * 0.1 + (1 - min(rech / 1500, 1)) * 0.05 + (1 - min(util / 4000, 1)) * 0.05 + (0.1 if inc in {0, 1} else 0.0)
        if score >= 0.72:
            risk.append(0)
        elif score >= 0.55:
            risk.append(1)
        elif score >= 0.38:
            risk.append(2)
        else:
            risk.append(3)

    frame = pd.DataFrame({
        "repayment_rate": repayment_rate,
        "default_rate": default_rate,
        "avg_loan_amount": avg_loan_amount,
        "electricity_units_monthly": electricity,
        "mobile_recharge_monthly_avg": recharge,
        "utility_bill_avg": bill,
        "govt_survey_income_band": income,
    })
    return frame, np.array(risk)


def _build_pipeline() -> Pipeline:
    return Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
            ("model", XGBClassifier(
                n_estimators=75,
                max_depth=4,
                learning_rate=0.08,
                subsample=0.9,
                colsample_bytree=0.9,
                objective="multi:softprob",
                num_class=4,
                eval_metric="mlogloss",
                random_state=42,
                n_jobs=1,
            )),
        ]
    )


@dataclass
class CreditModelService:
    pipeline: Pipeline

    @classmethod
    def load_or_train(cls) -> "CreditModelService":
        path = MODEL_PATH
        if not path.parent.exists():
            path = FALLBACK_MODEL_PATH
        if path.exists():
            return cls(joblib.load(path))

        X, y = _synthetic_training_frame()
        pipeline = _build_pipeline()
        pipeline.fit(X, y)
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
        except PermissionError:
            path = FALLBACK_MODEL_PATH
            path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(pipeline, path)
        return cls(pipeline)

    def predict_proba(self, features: Dict) -> np.ndarray:
        row = pd.DataFrame([features], columns=FEATURE_COLUMNS)
        return self.pipeline.predict_proba(row)[0]

    def predict_label(self, features: Dict) -> RiskBand:
        row = pd.DataFrame([features], columns=FEATURE_COLUMNS)
        label = int(self.pipeline.predict(row)[0])
        return _decode_risk(label)


_service: CreditModelService | None = None


def get_credit_model() -> CreditModelService:
    global _service
    if _service is None:
        _service = CreditModelService.load_or_train()
    return _service


def build_feature_vector(repayment_summary, consumption_data) -> Dict:
    total_loans = max(getattr(repayment_summary, "total_loans", 0) or 0, 1)
    repayment_rate = (getattr(repayment_summary, "on_time_payments", 0) or 0) / total_loans
    default_rate = (getattr(repayment_summary, "defaults", 0) or 0) / total_loans
    return {
        "repayment_rate": repayment_rate,
        "default_rate": default_rate,
        "avg_loan_amount": float(getattr(repayment_summary, "avg_loan_amount", 0) or 0),
        "electricity_units_monthly": getattr(consumption_data, "electricity_units_monthly", None),
        "mobile_recharge_monthly_avg": getattr(consumption_data, "mobile_recharge_monthly_avg", None),
        "utility_bill_avg": getattr(consumption_data, "utility_bill_avg", None),
        "govt_survey_income_band": _encode_income_band(getattr(consumption_data, "govt_survey_income_band", None)),
    }


def compute_composite_score(repayment_summary, consumption_data) -> tuple[float, RiskBand, Dict]:
    model = get_credit_model()
    features = build_feature_vector(repayment_summary, consumption_data)
    label = model.predict_label(features)

    repayment_score = max(0.0, min(100.0, (
        features["repayment_rate"] * 100 * 0.8
        + (1 - min(features["default_rate"], 1)) * 100 * 0.2
    )))
    income_signal = 100.0
    if features["govt_survey_income_band"] >= 0:
        income_signal -= features["govt_survey_income_band"] * 15
    if features["electricity_units_monthly"] is not None:
        income_signal -= min(features["electricity_units_monthly"] / 3, 35)
    if features["utility_bill_avg"] is not None:
        income_signal -= min(features["utility_bill_avg"] / 50, 25)
    income_score = max(0.0, min(100.0, income_signal))
    composite = round((repayment_score * 0.6) + (income_score * 0.4), 2)

    shap_top_features = compute_shap_explanation(model.pipeline, features, FEATURE_COLUMNS)
    explanation = {
        "top_features": shap_top_features,
        "repayment_score": round(repayment_score, 2),
        "income_score": round(income_score, 2),
        "risk_band": label.value,
        "model_version": MODEL_VERSION,
    }
    return composite, label, explanation
