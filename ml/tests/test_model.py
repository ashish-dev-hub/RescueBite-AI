"""Unit tests for Model A training, pipeline, and evaluation."""

import json
from pathlib import Path
import sys
import joblib
import numpy as np
import pandas as pd
import pytest

# Add ml/src to sys.path so rescuebite_ml is resolved directly
_test_dir = Path(__file__).resolve().parent
_src_dir = _test_dir.parent / "src"
if str(_src_dir) not in sys.path:
    sys.path.insert(0, str(_src_dir))

try:
    from rescuebite_ml.evaluate import evaluate_predictions
    from rescuebite_ml.features import FeatureEngineer
    from rescuebite_ml.train import create_model_pipeline, train_model
except ImportError:
    from ml.src.rescuebite_ml.evaluate import evaluate_predictions
    from ml.src.rescuebite_ml.features import FeatureEngineer
    from ml.src.rescuebite_ml.train import create_model_pipeline, train_model


def test_evaluate_predictions_metrics() -> None:
    """Verify standard evaluation calculations."""
    y_true = np.array([100.0, 200.0, 300.0])
    y_pred = np.array([110.0, 190.0, 310.0])

    metrics = evaluate_predictions(y_true, y_pred)
    assert metrics["mae"] == 10.0
    assert metrics["rmse"] == 10.0
    assert metrics["r2"] > 0.95


def test_create_model_pipeline_structure() -> None:
    """Verify pipeline has preprocessor and regressor named steps."""
    pipe = create_model_pipeline(n_estimators=10, max_depth=5)
    assert "preprocessor" in pipe.named_steps
    assert "regressor" in pipe.named_steps


def test_model_artifact_persistence(tmp_path: Path) -> None:
    """Verify model saves and reloads producing identical predictions."""
    model_path = tmp_path / "test_model.joblib"
    metrics_path = tmp_path / "test_metrics.json"

    # Fast 10-estimator training on synthetic subset
    res = train_model(
        model_output_path=model_path,
        metrics_output_path=metrics_path,
        test_days=14,
        random_state=42,
    )

    assert model_path.exists()
    assert metrics_path.exists()
    assert "train" in res["metrics"]
    assert "test" in res["metrics"]

    # Verify reload fidelity
    loaded_model = joblib.load(model_path)
    sample_df = pd.DataFrame(
        {
            "weekday": [1],
            "month": [9],
            "day_of_month": [15],
            "is_weekend": [0],
            "is_holiday": [0],
            "base_daily_meals": [120.0],
            "receiving_capacity_meals": [250.0],
            "accepts_nonveg": [1],
            "open_hours_span": [14.0],
            "demand_lag_7": [110.0],
            "demand_lag_14": [115.0],
            "demand_lag_21": [105.0],
            "demand_lag_28": [100.0],
            "rolling_mean_7": [112.0],
            "rolling_mean_14": [110.0],
            "rolling_mean_28": [108.0],
            "rolling_std_7": [12.0],
            "ngo_type": ["shelter"],
        }
    )

    preds = loaded_model.predict(sample_df)
    assert len(preds) == 1
    assert preds[0] > 0.0  # Meal demand forecast is positive
