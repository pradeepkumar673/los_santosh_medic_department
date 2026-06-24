"""
train_model.py
---------------
Generates a realistic synthetic dataset for appointment no-show prediction
and trains a RandomForest (default) or XGBoost classifier inside an
sklearn Pipeline (preprocessing + model bundled together, so the FastAPI
service never has to re-implement encoding logic).

Run:
    python train_model.py --model rf        # RandomForest (default)
    python train_model.py --model xgb        # XGBoost
"""

import argparse
import json
from datetime import datetime

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
import joblib

RANDOM_SEED = 42
N_SAMPLES = 8000

DEPARTMENTS = [
    "Cardiology", "Orthopedics", "Pediatrics", "General Medicine",
    "Dermatology", "ENT", "Gynecology", "Neurology",
]
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
TIME_SLOTS = ["Morning", "Afternoon", "Evening"]
APPOINTMENT_TYPES = ["scheduled", "follow_up", "walk_in", "emergency"]

# Numeric + categorical feature columns the model is trained on.
# NOTE: Sensitive attributes like gender are deliberately excluded from
# the feature set as a fairness/ethics consideration — they would not
# add meaningful predictive value here and risk encoding bias.
NUMERIC_FEATURES = ["age", "past_no_shows", "total_past_appointments",
                     "distance_km", "lead_time_days"]
CATEGORICAL_FEATURES = ["day_of_week", "time_slot", "department", "appointment_type"]
ALL_FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES


def generate_synthetic_data(n=N_SAMPLES, seed=RANDOM_SEED) -> pd.DataFrame:
    """
    Builds a synthetic dataset with a hidden 'reliability_score' per patient
    that drives both their historical no-show count AND the label, so the
    relationships in the data are coherent (not pure random noise).
    """
    rng = np.random.default_rng(seed)

    age = rng.normal(38, 16, n).clip(1, 95).round().astype(int)
    reliability = rng.beta(5, 2, n)  # closer to 1 = more reliable patient

    total_past_appointments = rng.poisson(6, n).clip(0, 40)
    # Less reliable patients accumulate more historical no-shows
    no_show_rate_hidden = (1 - reliability) * 0.6
    past_no_shows = rng.binomial(total_past_appointments, no_show_rate_hidden)

    distance_km = rng.exponential(8, n).clip(0.5, 120).round(1)
    lead_time_days = rng.exponential(5, n).clip(0, 60).round().astype(int)

    day_of_week = rng.choice(DAYS, n, p=[0.16, 0.16, 0.16, 0.16, 0.16, 0.10, 0.10])
    time_slot = rng.choice(TIME_SLOTS, n, p=[0.45, 0.4, 0.15])
    department = rng.choice(DEPARTMENTS, n)
    appointment_type = rng.choice(APPOINTMENT_TYPES, n, p=[0.55, 0.25, 0.15, 0.05])

    df = pd.DataFrame({
        "age": age,
        "past_no_shows": past_no_shows,
        "total_past_appointments": total_past_appointments,
        "distance_km": distance_km,
        "lead_time_days": lead_time_days,
        "day_of_week": day_of_week,
        "time_slot": time_slot,
        "department": department,
        "appointment_type": appointment_type,
    })

    # ---- Construct the label from a logistic combination of features ----
    logit = (
        -1.6
        + 1.8 * (1 - reliability)                                  # unreliable patients
        + 0.025 * distance_km                                      # farther -> more no-shows
        + 0.04 * lead_time_days                                    # booked far ahead -> forget
        + 0.35 * (df["day_of_week"].isin(["Monday", "Saturday"]))  # weekday effect
        + 0.3 * (df["time_slot"] == "Morning")                     # early slots missed more
        - 0.9 * (df["appointment_type"] == "emergency")            # emergencies rarely no-show
        - 0.4 * (df["appointment_type"] == "walk_in")
        + rng.normal(0, 0.5, n)                                    # noise
    )
    prob_no_show = 1 / (1 + np.exp(-logit))
    df["no_show"] = rng.binomial(1, prob_no_show)

    return df


def build_pipeline(model_type: str) -> Pipeline:
    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL_FEATURES),
            ("num", "passthrough", NUMERIC_FEATURES),
        ]
    )

    if model_type == "xgb":
        from xgboost import XGBClassifier
        clf = XGBClassifier(
            n_estimators=200, max_depth=5, learning_rate=0.08,
            subsample=0.9, colsample_bytree=0.9,
            eval_metric="logloss", random_state=RANDOM_SEED,
        )
    else:
        clf = RandomForestClassifier(
            n_estimators=300, max_depth=10, min_samples_leaf=5,
            class_weight="balanced", random_state=RANDOM_SEED, n_jobs=-1,
        )

    return Pipeline(steps=[("preprocessor", preprocessor), ("classifier", clf)])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", choices=["rf", "xgb"], default="rf")
    args = parser.parse_args()

    df = generate_synthetic_data()
    X = df[ALL_FEATURES]
    y = df["no_show"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=RANDOM_SEED
    )

    pipeline = build_pipeline(args.model)
    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    y_proba = pipeline.predict_proba(X_test)[:, 1]

    print(classification_report(y_test, y_pred, target_names=["show", "no_show"]))
    print(f"ROC-AUC: {roc_auc_score(y_test, y_proba):.4f}")

    import os
    os.makedirs("models", exist_ok=True)
    joblib.dump(pipeline, "models/no_show_model.pkl")

    metadata = {
        "model_type": args.model,
        "feature_columns": ALL_FEATURES,
        "trained_at": datetime.utcnow().isoformat(),
        "n_train_samples": len(X_train),
        "roc_auc": round(roc_auc_score(y_test, y_proba), 4),
    }
    with open("models/model_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    print("\nSaved model -> models/no_show_model.pkl")
    print("Saved metadata -> models/model_metadata.json")


if __name__ == "__main__":
    main()
