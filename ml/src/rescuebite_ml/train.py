"""Model training pipeline for RescueBite AI Model A (Random Forest Forecaster).

Trains a leak-free Random Forest regressor with chronological splitting
and serializes the trained pipeline and evaluation metrics.
"""

import json
from pathlib import Path
from typing import Any, Dict, Optional, Tuple, Union
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

import sys

try:
    from .baseline import SameWeekdayBaseline
    from .evaluate import compute_per_ngo_metrics, evaluate_predictions
    from .features import FeatureEngineer, chronological_split
except ImportError:
    _src_dir = Path(__file__).resolve().parent.parent
    if str(_src_dir) not in sys.path:
        sys.path.insert(0, str(_src_dir))
    from rescuebite_ml.baseline import SameWeekdayBaseline
    from rescuebite_ml.evaluate import compute_per_ngo_metrics, evaluate_predictions
    from rescuebite_ml.features import FeatureEngineer, chronological_split

UnionPath = Union[str, Path]


def create_model_pipeline(
    random_state: int = 42,
    n_estimators: int = 150,
    max_depth: int = 12,
    min_samples_split: int = 6,
    min_samples_leaf: int = 3,
    max_features: Any = "sqrt",
) -> Pipeline:
    """Create the scikit-learn preprocessing and regressor pipeline.

    Args:
        random_state: Seed for reproducibility.
        n_estimators: Number of decision trees.
        max_depth: Maximum tree depth.
        min_samples_split: Minimum samples to split an internal node.
        min_samples_leaf: Minimum samples in a leaf.
        max_features: Number of features considered at each split.

    Returns:
        Configured scikit-learn Pipeline instance.
    """
    preprocessor = ColumnTransformer(
        transformers=[
            (
                "num",
                SimpleImputer(strategy="median"),
                FeatureEngineer.NUMERIC_FEATURES,
            ),
            (
                "cat",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                FeatureEngineer.CATEGORICAL_FEATURES,
            ),
        ]
    )

    regressor = RandomForestRegressor(
        n_estimators=n_estimators,
        max_depth=max_depth,
        min_samples_split=min_samples_split,
        min_samples_leaf=min_samples_leaf,
        max_features=max_features,
        random_state=random_state,
        n_jobs=-1,
    )

    return Pipeline([("preprocessor", preprocessor), ("regressor", regressor)])


def _find_repo_root() -> Path:
    current = Path(__file__).resolve().parent
    for _ in range(5):
        if (current / "dataset").exists() or (current / ".git").exists():
            return current
        current = current.parent
    return Path(__file__).resolve().parent.parent.parent.parent


def train_model(
    demand_path: UnionPath = "dataset/ngo_demand_daily.csv",
    ngos_path: UnionPath = "dataset/ngos.csv",
    holidays_path: Optional[UnionPath] = "dataset/holidays.csv",
    model_output_path: UnionPath = "ml/models/model_a.joblib",
    metrics_output_path: UnionPath = "ml/models/metrics.json",
    test_days: int = 60,
    random_state: int = 42,
) -> Dict[str, Any]:
    """Execute end-to-end model training, chronological evaluation, and serialization.

    Args:
        demand_path: Path to daily NGO demand CSV.
        ngos_path: Path to NGO master directory CSV.
        holidays_path: Path to holiday calendar CSV.
        model_output_path: Output path for serialized .joblib model.
        metrics_output_path: Output path for JSON metrics report.
        test_days: Number of final calendar days reserved for holdout evaluation.
        random_state: Random seed for model training.

    Returns:
        Dictionary containing summary metrics and execution metadata.
    """
    repo_root = _find_repo_root()

    def _resolve_path(p: UnionPath) -> Path:
        p_obj = Path(p)
        return p_obj.resolve() if p_obj.is_absolute() else (repo_root / p_obj).resolve()

    path_demand = _resolve_path(demand_path)
    path_ngos = _resolve_path(ngos_path)
    path_holidays = _resolve_path(holidays_path) if holidays_path else None
    path_model = _resolve_path(model_output_path)
    path_metrics = _resolve_path(metrics_output_path)

    if not path_demand.exists():
        raise FileNotFoundError(f"Demand dataset not found: {path_demand}")
    if not path_ngos.exists():
        raise FileNotFoundError(f"NGO dataset not found: {path_ngos}")

    df_demand = pd.read_csv(path_demand)
    df_ngos = pd.read_csv(path_ngos)
    df_holidays = pd.read_csv(path_holidays) if path_holidays and path_holidays.exists() else None

    # 1. Feature Engineering
    fe = FeatureEngineer()
    feat_df = fe.build_features(df_demand, df_ngos, df_holidays)

    # 2. Chronological Train/Test Split
    train_df, test_df = chronological_split(feat_df, test_days=test_days)

    if train_df["date"].max() >= test_df["date"].min():
        raise RuntimeError("Data leakage detected: train and test dates overlap!")

    X_train = train_df[FeatureEngineer.ALL_FEATURES]
    y_train = train_df["meals_requested"]

    X_test = test_df[FeatureEngineer.ALL_FEATURES]
    y_test = test_df["meals_requested"]

    # 3. Fit Pipeline
    pipeline = create_model_pipeline(random_state=random_state)
    pipeline.fit(X_train, y_train)

    # 4. Predictions & Evaluation
    y_pred_train = np.maximum(pipeline.predict(X_train), 0.0)
    y_pred_test = np.maximum(pipeline.predict(X_test), 0.0)

    train_metrics = evaluate_predictions(y_train, y_pred_train)
    test_metrics = evaluate_predictions(y_test, y_pred_test)

    # Baseline Heuristic Benchmark Comparison
    fallback_map: Dict[str, float] = {
        str(row["ngo_id"]): float(row["base_daily_meals"])
        for _, row in df_ngos.iterrows()
    }
    split_date_str = str(test_df["date"].min().date())
    df_train_raw = pd.DataFrame(df_demand[df_demand["date"] < split_date_str].copy())
    df_test_raw = pd.DataFrame(df_demand[df_demand["date"] >= split_date_str].copy())

    baseline_model = SameWeekdayBaseline(fallback_map=fallback_map)
    baseline_model.fit(df_train_raw)
    baseline_eval = baseline_model.evaluate(df_test_raw)

    baseline_mae = float(baseline_eval["mae"])
    baseline_rmse = float(baseline_eval["rmse"])
    mae_improvement_pct = round((baseline_mae - test_metrics["mae"]) / baseline_mae * 100.0, 2)
    rmse_improvement_pct = round((baseline_rmse - test_metrics["rmse"]) / baseline_rmse * 100.0, 2)

    # Per-NGO Breakdown on Holdout
    test_results_df = test_df.copy()
    test_results_df["predicted_meals"] = y_pred_test
    ngo_metrics = compute_per_ngo_metrics(test_results_df)

    # Extract Feature Importances
    preprocessor: ColumnTransformer = pipeline.named_steps["preprocessor"]
    rf_regressor: RandomForestRegressor = pipeline.named_steps["regressor"]

    onehot_encoder: OneHotEncoder = preprocessor.named_transformers_["cat"]
    cat_names = list(onehot_encoder.get_feature_names_out(FeatureEngineer.CATEGORICAL_FEATURES))
    feature_names = FeatureEngineer.NUMERIC_FEATURES + cat_names
    importances = rf_regressor.feature_importances_

    feature_importance_records = [
        {"feature": name, "importance": round(float(imp), 4)}
        for name, imp in sorted(zip(feature_names, importances), key=lambda x: x[1], reverse=True)
    ]

    # 5. Serialization
    path_model.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, path_model)

    results_summary = {
        "model_type": "RandomForestRegressor",
        "hyperparameters": {
            "n_estimators": 150,
            "max_depth": 12,
            "min_samples_split": 6,
            "min_samples_leaf": 3,
            "max_features": "sqrt",
            "random_state": random_state,
        },
        "train_window": {
            "start_date": str(train_df["date"].min().date()),
            "end_date": str(train_df["date"].max().date()),
            "rows": len(train_df),
        },
        "test_window": {
            "start_date": str(test_df["date"].min().date()),
            "end_date": str(test_df["date"].max().date()),
            "rows": len(test_df),
        },
        "metrics": {
            "train": train_metrics,
            "test": test_metrics,
            "baseline": {
                "mae": baseline_mae,
                "rmse": baseline_rmse,
            },
            "improvement_pct": {
                "mae": mae_improvement_pct,
                "rmse": rmse_improvement_pct,
            },
        },
        "feature_importances": feature_importance_records[:10],
        "per_ngo_metrics": ngo_metrics.to_dict(orient="records"),
        "model_artifact": str(path_model),
    }

    path_metrics.parent.mkdir(parents=True, exist_ok=True)
    with open(path_metrics, "w", encoding="utf-8") as f:
        json.dump(results_summary, f, indent=2)

    return results_summary


if __name__ == "__main__":
    print("Executing RescueBite AI Model A Training...")
    summary = train_model()
    print(f"Model saved to: {summary['model_artifact']}")
    print(f"Train MAE: {summary['metrics']['train']['mae']}, Train RMSE: {summary['metrics']['train']['rmse']}")
    print(f"Test MAE: {summary['metrics']['test']['mae']}, Test RMSE: {summary['metrics']['test']['rmse']}")
    print(f"Baseline MAE: {summary['metrics']['baseline']['mae']}")
    print(f"MAE Improvement: {summary['metrics']['improvement_pct']['mae']}%")
