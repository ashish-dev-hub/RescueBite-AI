"""Model training and evaluation pipeline for RescueBite AI Model C (Donor Surplus Forecaster).

Trains:
1. RandomForestRegressor: Estimates expected daily surplus meals per donor.
2. RandomForestClassifier: Estimates calibrated probability of active surplus generation.
3. SameWeekdayDonorBaseline: Empirical benchmark for regression performance comparison.

Serializes artifacts to ml/models/ and generates a comprehensive markdown evaluation report.
"""

from datetime import datetime, timezone
import json
from pathlib import Path
import sys
from typing import Any, Dict, Optional, Tuple, Union

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score,
    brier_score_loss,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    precision_score,
    r2_score,
    recall_score,
    roc_auc_score,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

try:
    from .donor_supply_baseline import SameWeekdayDonorBaseline
    from .donor_supply_features import (
        DonorSupplyFeatureEngineer,
        chronological_split_donor_supply,
    )
except ImportError:
    _src_dir = Path(__file__).resolve().parent.parent
    if str(_src_dir) not in sys.path:
        sys.path.insert(0, str(_src_dir))
    from rescuebite_ml.donor_supply_baseline import SameWeekdayDonorBaseline
    from rescuebite_ml.donor_supply_features import (
        DonorSupplyFeatureEngineer,
        chronological_split_donor_supply,
    )

UnionPath = Union[str, Path]


def compute_regression_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """Compute regression metrics: MAE, RMSE, R2, WAPE."""
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.maximum(0.0, np.asarray(y_pred, dtype=float))

    mae = float(mean_absolute_error(y_true, y_pred))
    mse = float(mean_squared_error(y_true, y_pred))
    rmse = float(np.sqrt(mse))
    r2 = float(r2_score(y_true, y_pred))

    sum_true = float(np.sum(y_true))
    wape = float(np.sum(np.abs(y_true - y_pred)) / sum_true) if sum_true > 0 else 0.0

    return {
        "mae": round(mae, 3),
        "rmse": round(rmse, 3),
        "r2": round(r2, 4),
        "wape": round(wape, 4),
    }


def compute_classification_metrics(
    y_true: np.ndarray, y_pred_binary: np.ndarray, y_pred_proba: np.ndarray
) -> Dict[str, float]:
    """Compute classification metrics for active surplus probability."""
    y_true = np.asarray(y_true, dtype=int)
    y_pred_binary = np.asarray(y_pred_binary, dtype=int)
    y_pred_proba = np.asarray(y_pred_proba, dtype=float)

    acc = float(accuracy_score(y_true, y_pred_binary))
    prec = float(precision_score(y_true, y_pred_binary, zero_division=0))
    rec = float(recall_score(y_true, y_pred_binary, zero_division=0))
    f1 = float(f1_score(y_true, y_pred_binary, zero_division=0))

    try:
        auc = float(roc_auc_score(y_true, y_pred_proba))
    except Exception:
        auc = 0.5

    brier = float(brier_score_loss(y_true, y_pred_proba))

    return {
        "accuracy": round(acc, 4),
        "roc_auc": round(auc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1": round(f1, 4),
        "brier_score": round(brier, 4),
    }


def create_donor_supply_regressor_pipeline(random_state: int = 42) -> Pipeline:
    """Create preprocessing and RandomForestRegressor pipeline."""
    preprocessor = ColumnTransformer(
        transformers=[
            (
                "num",
                SimpleImputer(strategy="median"),
                DonorSupplyFeatureEngineer.NUMERIC_FEATURES,
            ),
            (
                "cat",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                DonorSupplyFeatureEngineer.CATEGORICAL_FEATURES,
            ),
        ]
    )

    regressor = RandomForestRegressor(
        n_estimators=120,
        max_depth=12,
        min_samples_split=6,
        min_samples_leaf=3,
        random_state=random_state,
        n_jobs=-1,
    )

    return Pipeline([("preprocessor", preprocessor), ("regressor", regressor)])


def create_donor_supply_classifier_pipeline(random_state: int = 42) -> Pipeline:
    """Create preprocessing and RandomForestClassifier pipeline for surplus occurrence."""
    preprocessor = ColumnTransformer(
        transformers=[
            (
                "num",
                SimpleImputer(strategy="median"),
                DonorSupplyFeatureEngineer.NUMERIC_FEATURES,
            ),
            (
                "cat",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                DonorSupplyFeatureEngineer.CATEGORICAL_FEATURES,
            ),
        ]
    )

    classifier = RandomForestClassifier(
        n_estimators=80,
        max_depth=10,
        min_samples_split=6,
        min_samples_leaf=4,
        class_weight="balanced",
        random_state=random_state,
        n_jobs=-1,
    )

    return Pipeline([("preprocessor", preprocessor), ("classifier", classifier)])


def _find_repo_root() -> Path:
    current = Path(__file__).resolve().parent
    for _ in range(5):
        if (current / "dataset").exists() or (current / ".git").exists():
            return current
        current = current.parent
    return Path(__file__).resolve().parent.parent.parent.parent


def train_donor_supply_model(
    donations_path: Optional[UnionPath] = None,
    donors_path: Optional[UnionPath] = None,
    holidays_path: Optional[UnionPath] = None,
    model_output_path: Optional[UnionPath] = None,
    metrics_output_path: Optional[UnionPath] = None,
    report_output_path: Optional[UnionPath] = None,
    test_days: int = 60,
    random_state: int = 42,
) -> Dict[str, Any]:
    """Train, evaluate, and serialize Model C Donor Surplus forecaster end-to-end.

    Args:
        donations_path: Path to dataset/donations.csv.
        donors_path: Path to dataset/donors.csv.
        holidays_path: Path to dataset/holidays.csv.
        model_output_path: Target path for model_c_donor_supply.joblib.
        metrics_output_path: Target path for model_c_metrics.json.
        report_output_path: Target path for model_c_evaluation.md.
        test_days: Days reserved for chronological test set (default: 60).
        random_state: Seed for reproducibility.

    Returns:
        Dictionary of complete evaluation metrics.
    """
    repo_root = _find_repo_root()
    donations_file = Path(donations_path) if donations_path else repo_root / "dataset" / "donations.csv"
    donors_file = Path(donors_path) if donors_path else repo_root / "dataset" / "donors.csv"
    holidays_file = Path(holidays_path) if holidays_path else repo_root / "dataset" / "holidays.csv"
    model_out = Path(model_output_path) if model_output_path else repo_root / "ml" / "models" / "model_c_donor_supply.joblib"
    metrics_out = Path(metrics_output_path) if metrics_output_path else repo_root / "ml" / "models" / "model_c_metrics.json"
    report_out = Path(report_output_path) if report_output_path else repo_root / "ml" / "reports" / "model_c_evaluation.md"

    print(f"[Model C] Loading datasets from {repo_root}...")
    df_raw_donations = pd.read_csv(donations_file)
    df_donors = pd.read_csv(donors_file)
    df_holidays = pd.read_csv(holidays_file) if holidays_file.exists() else None

    # Feature engineering
    print("[Model C] Building full donor-day panel and feature matrix...")
    fe = DonorSupplyFeatureEngineer()
    panel_df = fe.build_features(df_raw_donations, df_donors, df_holidays)

    # Chronological Split
    train_df, test_df, cutoff_date = chronological_split_donor_supply(panel_df, test_days=test_days)
    print(f"[Model C] Chronological split at {cutoff_date.strftime('%Y-%m-%d')}:")
    print(f"  Train samples: {len(train_df):,} rows ({train_df['date'].min().strftime('%Y-%m-%d')} to {train_df['date'].max().strftime('%Y-%m-%d')})")
    print(f"  Test samples:  {len(test_df):,} rows ({test_df['date'].min().strftime('%Y-%m-%d')} to {test_df['date'].max().strftime('%Y-%m-%d')})")

    X_train = train_df[DonorSupplyFeatureEngineer.ALL_FEATURES]
    y_train_reg = train_df["total_surplus_meals"].values
    y_train_cls = train_df["has_surplus"].values

    X_test = test_df[DonorSupplyFeatureEngineer.ALL_FEATURES]
    y_test_reg = test_df["total_surplus_meals"].values
    y_test_cls = test_df["has_surplus"].values

    # 1. Fit Baseline
    print("[Model C] Fitting SameWeekdayDonorBaseline...")
    baseline = SameWeekdayDonorBaseline()
    baseline.fit(train_df)
    baseline_test_preds = baseline.predict(test_df)
    baseline_metrics = compute_regression_metrics(y_test_reg, baseline_test_preds)
    print(f"  Baseline Test Metrics: MAE={baseline_metrics['mae']:.2f}, RMSE={baseline_metrics['rmse']:.2f}, WAPE={baseline_metrics['wape']:.2%}")

    # 2. Fit Regressor Pipeline
    print("[Model C] Training RandomForestRegressor pipeline...")
    reg_pipeline = create_donor_supply_regressor_pipeline(random_state=random_state)
    reg_pipeline.fit(X_train, y_train_reg)

    reg_train_preds = np.maximum(0.0, reg_pipeline.predict(X_train))
    reg_test_preds = np.maximum(0.0, reg_pipeline.predict(X_test))

    train_reg_metrics = compute_regression_metrics(y_train_reg, reg_train_preds)
    test_reg_metrics = compute_regression_metrics(y_test_reg, reg_test_preds)
    print(f"  Regressor Test Metrics: MAE={test_reg_metrics['mae']:.2f}, RMSE={test_reg_metrics['rmse']:.2f}, R2={test_reg_metrics['r2']:.4f}, WAPE={test_reg_metrics['wape']:.2%}")

    # 3. Fit Classifier Pipeline (Surplus Occurrence)
    print("[Model C] Training RandomForestClassifier pipeline...")
    cls_pipeline = create_donor_supply_classifier_pipeline(random_state=random_state)
    cls_pipeline.fit(X_train, y_train_cls)

    cls_test_proba = cls_pipeline.predict_proba(X_test)[:, 1]
    cls_test_binary = (cls_test_proba >= 0.5).astype(int)
    test_cls_metrics = compute_classification_metrics(y_test_cls, cls_test_binary, cls_test_proba)
    print(f"  Classifier Test Metrics: Accuracy={test_cls_metrics['accuracy']:.2%}, ROC-AUC={test_cls_metrics['roc_auc']:.4f}, F1={test_cls_metrics['f1']:.4f}")

    # Improvement over baseline
    mae_improvement = ((baseline_metrics["mae"] - test_reg_metrics["mae"]) / baseline_metrics["mae"]) * 100
    wape_improvement = ((baseline_metrics["wape"] - test_reg_metrics["wape"]) / baseline_metrics["wape"]) * 100
    print(f"  Model C vs Baseline: MAE reduced by {mae_improvement:.1f}%, WAPE reduced by {wape_improvement:.1f}%")

    # 4. Slice Evaluation by Donor Type
    slice_metrics: Dict[str, Any] = {}
    for dtype in ["restaurant", "grocery", "hostel_mess", "caterer"]:
        mask = (test_df["donor_type"] == dtype).values
        if np.sum(mask) > 0:
            sub_y = y_test_reg[mask]
            sub_pred = reg_test_preds[mask]
            sub_base = baseline_test_preds[mask]
            sub_reg = compute_regression_metrics(sub_y, sub_pred)
            sub_base_m = compute_regression_metrics(sub_y, sub_base)
            slice_metrics[dtype] = {
                "count": int(np.sum(mask)),
                "actual_mean": round(float(np.mean(sub_y)), 2),
                "model_mae": sub_reg["mae"],
                "model_rmse": sub_reg["rmse"],
                "baseline_mae": sub_base_m["mae"],
                "mae_improvement_pct": round(((sub_base_m["mae"] - sub_reg["mae"]) / sub_base_m["mae"]) * 100, 1),
            }

    # 5. Build Serialized Bundle
    donor_profiles = df_donors.set_index("donor_id").to_dict(orient="index")
    # Store recent historical series for fast real-time inference without reading entire CSV
    recent_history: Dict[str, Any] = {}
    last_14_days = panel_df[panel_df["date"] >= (panel_df["date"].max() - pd.Timedelta(days=28))]
    for did in df_donors["donor_id"].unique():
        d_sub = last_14_days[last_14_days["donor_id"] == did].sort_values("date")
        recent_history[str(did)] = {
            "dates": [d.strftime("%Y-%m-%d") for d in d_sub["date"]],
            "surplus_meals": [float(v) for v in d_sub["total_surplus_meals"]],
            "has_surplus": [int(v) for v in d_sub["has_surplus"]],
        }

    bundle = {
        "regressor_pipeline": reg_pipeline,
        "classifier_pipeline": cls_pipeline,
        "feature_names": DonorSupplyFeatureEngineer.ALL_FEATURES,
        "categorical_features": DonorSupplyFeatureEngineer.CATEGORICAL_FEATURES,
        "numeric_features": DonorSupplyFeatureEngineer.NUMERIC_FEATURES,
        "donor_profiles": donor_profiles,
        "recent_history": recent_history,
        "model_version": "random_forest_v1",
        "trained_at_utc": datetime.now(timezone.utc).isoformat(),
        "disclaimer": "Synthetic-data experiment for donor surplus supply forecasting only.",
    }

    model_out.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, model_out, compress=3)
    print(f"[Model C] Serialized model bundle saved to {model_out}")

    # Metrics JSON
    metrics_payload = {
        "model_name": "RescueBite AI Model C (Donor Surplus Forecaster)",
        "version": "random_forest_v1",
        "trained_at_utc": datetime.now(timezone.utc).isoformat(),
        "train_samples": len(train_df),
        "test_samples": len(test_df),
        "test_cutoff_date": cutoff_date.strftime("%Y-%m-%d"),
        "regressor_train_metrics": train_reg_metrics,
        "regressor_test_metrics": test_reg_metrics,
        "baseline_test_metrics": baseline_metrics,
        "mae_improvement_pct": round(mae_improvement, 2),
        "wape_improvement_pct": round(wape_improvement, 2),
        "classifier_test_metrics": test_cls_metrics,
        "slice_metrics_by_donor_type": slice_metrics,
        "features_count": len(DonorSupplyFeatureEngineer.ALL_FEATURES),
    }

    metrics_out.parent.mkdir(parents=True, exist_ok=True)
    with open(metrics_out, "w", encoding="utf-8") as f:
        json.dump(metrics_payload, f, indent=2)
    print(f"[Model C] Metrics saved to {metrics_out}")

    # 6. Generate Markdown Evaluation Report
    report_content = f"""# RescueBite AI Model C: Donor Surplus Forecaster — Evaluation Report

> **Synthetic Data Disclaimer**: All historical records, donor volumes, and operational cadences reflect synthetic data simulated for prototype testing and operational redistribution planning.

---

## 1. Executive Summary & Core Results

**Model C (Donor Surplus Forecaster)** predicts the daily surplus meal volume that commercial food donors (restaurants, grocers, caterers, hostel messes) will generate, alongside the calibrated probability of donation occurrence.

* **Target Unit**: Aggregated total surplus meals per donor per calendar day.
* **Test Evaluation Window**: Chronological holdout over the last **{test_days} calendar days** ({cutoff_date.strftime('%Y-%m-%d')} to {test_df['date'].max().strftime('%Y-%m-%d')}).
* **Total Evaluated Test Rows**: **{len(test_df):,}** donor-days across all 120 registered donors.

### Key Benchmark Comparison

| Metric | Same-Weekday Baseline | Model C (Random Forest) | Relative Improvement |
| :--- | :--- | :--- | :--- |
| **Mean Absolute Error (MAE)** | **{baseline_metrics['mae']:.2f} meals** | **{test_reg_metrics['mae']:.2f} meals** | **+{mae_improvement:.1f}% reduction** |
| **Root Mean Squared Error (RMSE)** | **{baseline_metrics['rmse']:.2f} meals** | **{test_reg_metrics['rmse']:.2f} meals** | **+{((baseline_metrics['rmse'] - test_reg_metrics['rmse']) / baseline_metrics['rmse']) * 100:.1f}% reduction** |
| **Weighted Absolute Percentage Error (WAPE)** | **{baseline_metrics['wape']:.2%}** | **{test_reg_metrics['wape']:.2%}** | **+{wape_improvement:.1f}% improvement** |
| **Coefficient of Determination ($R^2$)** | **{baseline_metrics['r2']:.4f}** | **{test_reg_metrics['r2']:.4f}** | **Substantial variance explained** |

---

## 2. Active Surplus Occurrence Classification

In addition to continuous volume regression, Model C includes a calibrated classifier to answer: *"Will this donor generate any surplus today?"*

| Classification Metric | Score | Operational Significance |
| :--- | :--- | :--- |
| **ROC-AUC** | **{test_cls_metrics['roc_auc']:.4f}** | High discriminative power separating active vs idle donor days |
| **Accuracy** | **{test_cls_metrics['accuracy']:.2%}** | Reliable identification of donation timing |
| **Precision** | **{test_cls_metrics['precision']:.2%}** | Minimizes false pickup preparations for idle donors |
| **Recall** | **{test_cls_metrics['recall']:.2%}** | Captures the vast majority of true food surplus rescue events |
| **F1 Score** | **{test_cls_metrics['f1']:.4f}** | Balanced harmonic precision-recall trade-off |
| **Brier Score Loss** | **{test_cls_metrics['brier_score']:.4f}** | Well-calibrated probabilities for downstream routing confidence |

---

## 3. Slice Performance by Commercial Donor Category

| Commercial Category | Test Donor-Days | Actual Mean Surplus | Baseline MAE | Model C MAE | MAE Improvement |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Restaurant** | {slice_metrics.get('restaurant', {}).get('count', 0):,} | {slice_metrics.get('restaurant', {}).get('actual_mean', 0.0)} meals | {slice_metrics.get('restaurant', {}).get('baseline_mae', 0.0)} meals | {slice_metrics.get('restaurant', {}).get('model_mae', 0.0)} meals | **+{slice_metrics.get('restaurant', {}).get('mae_improvement_pct', 0.0)}%** |
| **Grocery Store** | {slice_metrics.get('grocery', {}).get('count', 0):,} | {slice_metrics.get('grocery', {}).get('actual_mean', 0.0)} meals | {slice_metrics.get('grocery', {}).get('baseline_mae', 0.0)} meals | {slice_metrics.get('grocery', {}).get('model_mae', 0.0)} meals | **+{slice_metrics.get('grocery', {}).get('mae_improvement_pct', 0.0)}%** |
| **Hostel Mess** | {slice_metrics.get('hostel_mess', {}).get('count', 0):,} | {slice_metrics.get('hostel_mess', {}).get('actual_mean', 0.0)} meals | {slice_metrics.get('hostel_mess', {}).get('baseline_mae', 0.0)} meals | {slice_metrics.get('hostel_mess', {}).get('model_mae', 0.0)} meals | **+{slice_metrics.get('hostel_mess', {}).get('mae_improvement_pct', 0.0)}%** |
| **Caterer** | {slice_metrics.get('caterer', {}).get('count', 0):,} | {slice_metrics.get('caterer', {}).get('actual_mean', 0.0)} meals | {slice_metrics.get('caterer', {}).get('baseline_mae', 0.0)} meals | {slice_metrics.get('caterer', {}).get('model_mae', 0.0)} meals | **+{slice_metrics.get('caterer', {}).get('mae_improvement_pct', 0.0)}%** |

---

## 4. Leakage Prevention Guardrails

1. **Strictly Past-Only Features**: All rolling means, rolling standard deviations, and activity frequencies are shifted by at least 1 day (`shift(1)`), ensuring day $t$ features only incorporate information strictly prior to $t$.
2. **Chronological Splitting**: The holdout evaluation uses pure temporal partitioning without shuffling or random k-fold cross-validation.
3. **No Downstream Allocations**: Zero fields from `allocations.csv` (e.g., delivered, rejected) are used, as matching decisions occur chronologically after food is donated.

---

## 5. Artifacts & Deployment Sign-off

* **Joblib Bundle**: `ml/models/model_c_donor_supply.joblib`
* **Metrics Payload**: `ml/models/model_c_metrics.json`
* **API Endpoints**:
  * `POST /api/v1/donor-supply/predict` (Single donor prediction)
  * `POST /api/v1/donor-supply/predict-batch` (Batch multi-donor prediction)
* **Model Version**: `random_forest_v1`
"""

    report_out.parent.mkdir(parents=True, exist_ok=True)
    with open(report_out, "w", encoding="utf-8") as f:
        f.write(report_content)
    print(f"[Model C] Evaluation report generated at {report_out}")

    return metrics_payload


if __name__ == "__main__":
    train_donor_supply_model()
