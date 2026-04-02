"""
Run this script once to train the credit scoring model on realistic synthetic data
and push it to HuggingFace Hub.

Usage:
    HF_TOKEN=<your_token> python ml/train_and_push.py --repo <your-hf-username>/samaan-credit-model

The resulting model file (credit_model.pkl) will be uploaded to the Hub repo.
The backend downloads it at startup via hf_hub_download().
"""
from __future__ import annotations

import argparse
import collections
import os
import tempfile
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from huggingface_hub import HfApi, login
from sklearn.impute import SimpleImputer
from sklearn.model_selection import cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

FEATURE_COLUMNS = [
    "repayment_rate",
    "default_rate",
    "avg_loan_amount",
    "electricity_units_monthly",
    "mobile_recharge_monthly_avg",
    "utility_bill_avg",
    "govt_survey_income_band",
]

RISK_LABELS = {
    0: "LOW_RISK_HIGH_NEED",
    1: "LOW_RISK_LOW_NEED",
    2: "HIGH_RISK_HIGH_NEED",
    3: "HIGH_RISK_LOW_NEED",
}


def generate_realistic_synthetic_data(rows: int = 2000) -> tuple[pd.DataFrame, np.ndarray]:
    rng = np.random.default_rng(42)
    income_band_raw = rng.choice([0, 1, 2, 3], size=rows, p=[0.20, 0.25, 0.30, 0.25])

    base_elec = np.where(income_band_raw <= 1, rng.uniform(20, 120, rows), rng.uniform(60, 350, rows))
    electricity = np.where(rng.random(rows) < 0.15, np.nan, base_elec)

    base_recharge = np.where(income_band_raw <= 1, rng.uniform(49, 199, rows), rng.uniform(149, 999, rows))
    mobile_recharge = np.where(rng.random(rows) < 0.20, np.nan, base_recharge)

    base_util = np.where(income_band_raw <= 1, rng.uniform(0, 800, rows), rng.uniform(200, 3500, rows))
    utility_bill = np.where(rng.random(rows) < 0.25, np.nan, base_util)

    avg_loan = rng.uniform(10000, 500000, rows)
    base_repayment = 0.55 + (income_band_raw * 0.05) - (avg_loan / 1500000) + rng.normal(0, 0.15, rows)
    repayment_rate = np.clip(base_repayment, 0.0, 1.0)
    base_default = 0.40 - (repayment_rate * 0.35) + rng.normal(0, 0.08, rows)
    default_rate = np.clip(base_default, 0.0, 0.7)
    govt_band = np.where(rng.random(rows) < 0.30, -1.0, income_band_raw.astype(float))

    labels: list[int] = []
    for i in range(rows):
        rep = repayment_rate[i]
        def_ = default_rate[i]
        inc = income_band_raw[i]
        elec_val = electricity[i] if not np.isnan(electricity[i]) else 100
        util_val = utility_bill[i] if not np.isnan(utility_bill[i]) else 500

        repayment_score = rep * 0.6 + (1 - def_) * 0.4
        high_need = inc <= 1
        _income_proxy = 1.0 - min(elec_val / 350, 1.0) * 0.5 - min(util_val / 3500, 1.0) * 0.5
        _ = _income_proxy

        if repayment_score >= 0.68 and high_need:
            labels.append(0)
        elif repayment_score >= 0.68 and not high_need:
            labels.append(1)
        elif repayment_score < 0.45 and high_need:
            labels.append(2)
        else:
            labels.append(3)

    frame = pd.DataFrame(
        {
            "repayment_rate": repayment_rate,
            "default_rate": default_rate,
            "avg_loan_amount": avg_loan,
            "electricity_units_monthly": electricity,
            "mobile_recharge_monthly_avg": mobile_recharge,
            "utility_bill_avg": utility_bill,
            "govt_survey_income_band": govt_band,
        }
    )

    dist = collections.Counter(labels)
    print(f"Label distribution: {dict(sorted(dist.items()))}")
    for label, name in RISK_LABELS.items():
        print(f"  {name}: {dist[label]} ({dist[label] / rows * 100:.1f}%)")

    return frame, np.array(labels)


def build_pipeline() -> Pipeline:
    return Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
            (
                "model",
                XGBClassifier(
                    n_estimators=150,
                    max_depth=5,
                    learning_rate=0.07,
                    subsample=0.85,
                    colsample_bytree=0.85,
                    objective="multi:softprob",
                    num_class=4,
                    eval_metric="mlogloss",
                    random_state=42,
                    n_jobs=2,
                ),
            ),
        ]
    )


def train_and_evaluate(X: pd.DataFrame, y: np.ndarray) -> Pipeline:
    pipeline = build_pipeline()
    scores = cross_val_score(pipeline, X, y, cv=5, scoring="accuracy")
    print(f"5-fold CV accuracy: {scores.mean():.3f} ± {scores.std():.3f}")
    pipeline.fit(X, y)
    return pipeline


def push_to_hub(pipeline: Pipeline, repo_id: str, token: str) -> None:
    api = HfApi()
    login(token=token)
    api.create_repo(repo_id=repo_id, token=token, exist_ok=True, repo_type="model")
    with tempfile.TemporaryDirectory() as tmpdir:
        model_path = Path(tmpdir) / "credit_model.pkl"
        joblib.dump(pipeline, model_path)
        api.upload_file(
            path_or_fileobj=str(model_path),
            path_in_repo="credit_model.pkl",
            repo_id=repo_id,
            token=token,
            commit_message="Train XGBoost credit scoring model on 2000-row synthetic Indian NBCFDC data",
        )
        card_path = Path(tmpdir) / "README.md"
        card_path.write_text(
            "---\n"
            "license: mit\n"
            "tags:\n"
            "  - xgboost\n"
            "  - credit-scoring\n"
            "  - india\n"
            "  - nbcfdc\n"
            "  - samaan\n"
            "---\n\n"
            "# SAMAAN Credit Scoring Model\n\n"
            "XGBoost classifier for beneficiary credit scoring under NBCFDC concessional lending.\n\n"
            "## Features\n"
            + "\n".join(f"- `{col}`" for col in FEATURE_COLUMNS)
            + "\n\n## Risk Bands\n"
            + "\n".join(f"- {v} (label {k})" for k, v in RISK_LABELS.items())
            + "\n\n## Training Data\n"
            "2000-row synthetic dataset based on realistic Indian BPL household distributions.\n"
            "Missing values handled via median imputation in the pipeline.\n"
        )
        api.upload_file(
            path_or_fileobj=str(card_path),
            path_in_repo="README.md",
            repo_id=repo_id,
            token=token,
        )
    print(f"Model pushed to https://huggingface.co/{repo_id}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", required=True, help="HuggingFace repo id, e.g. username/samaan-credit-model")
    args = parser.parse_args()

    token = os.environ.get("HF_TOKEN")
    if not token:
        raise ValueError("Set HF_TOKEN environment variable")

    print("Generating synthetic training data...")
    X, y = generate_realistic_synthetic_data(2000)

    print("Training XGBoost pipeline...")
    pipeline = train_and_evaluate(X, y)

    print(f"Pushing to HuggingFace Hub: {args.repo}")
    push_to_hub(pipeline, args.repo, token)
    print("Done.")
