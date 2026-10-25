"""Evaluation utilities for RescueBite AI forecasting models."""

from typing import Any, Dict, List, Union
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


def evaluate_predictions(
    y_true: Union[np.ndarray, pd.Series],
    y_pred: Union[np.ndarray, pd.Series],
) -> Dict[str, float]:
    """Calculate standard regression metrics between ground-truth and predictions.

    Args:
        y_true: Ground truth actual values.
        y_pred: Model predicted values.

    Returns:
        Dictionary containing MAE, RMSE, and R2 scores.
    """
    arr_true = np.asarray(y_true, dtype=float)
    arr_pred = np.asarray(y_pred, dtype=float)

    if len(arr_true) != len(arr_pred):
        raise ValueError(f"Shape mismatch: y_true ({len(arr_true)}) vs y_pred ({len(arr_pred)})")

    if len(arr_true) == 0:
        raise ValueError("Cannot evaluate empty prediction arrays.")

    mae = mean_absolute_error(arr_true, arr_pred)
    rmse = float(np.sqrt(mean_squared_error(arr_true, arr_pred)))
    r2 = r2_score(arr_true, arr_pred)

    return {
        "mae": round(mae, 2),
        "rmse": round(rmse, 2),
        "r2": round(r2, 4),
    }


def compute_per_ngo_metrics(
    df: pd.DataFrame,
    ngo_col: str = "ngo_id",
    actual_col: str = "meals_requested",
    pred_col: str = "predicted_meals",
) -> pd.DataFrame:
    """Calculate per-NGO evaluation metrics.

    Args:
        df: DataFrame containing NGO IDs, actuals, and predictions.
        ngo_col: Name of NGO ID column.
        actual_col: Name of actual target column.
        pred_col: Name of prediction column.

    Returns:
        DataFrame with per-NGO MAE, RMSE, and row counts sorted by MAE.
    """
    records: List[Dict[str, Any]] = []

    for ngo_id, group in df.groupby(ngo_col):
        arr_true = np.asarray(group[actual_col], dtype=float)
        arr_pred = np.asarray(group[pred_col], dtype=float)

        mae = mean_absolute_error(arr_true, arr_pred)
        rmse = float(np.sqrt(mean_squared_error(arr_true, arr_pred)))

        records.append(
            {
                "ngo_id": str(ngo_id),
                "mae": round(mae, 2),
                "rmse": round(rmse, 2),
                "evaluated_rows": len(group),
            }
        )

    return pd.DataFrame(records).sort_values("mae").reset_index(drop=True)
