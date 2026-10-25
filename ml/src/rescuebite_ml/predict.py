"""Inference service and prediction contract implementation for RescueBite AI Model A.

Loads serialized model pipeline and serves demand forecasts with uncertainty bounds
and fallback detection matching the prediction contract specification.
"""

import argparse
import json
from pathlib import Path
import sys
from typing import Any, Dict, List, Optional, Tuple, Union
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline

try:
    from .baseline import SameWeekdayBaseline
    from .features import FeatureEngineer
except ImportError:
    _src_dir = Path(__file__).resolve().parent.parent
    if str(_src_dir) not in sys.path:
        sys.path.insert(0, str(_src_dir))
    from rescuebite_ml.baseline import SameWeekdayBaseline
    from rescuebite_ml.features import FeatureEngineer

UnionPath = Union[str, Path]


def _find_repo_root() -> Path:
    current = Path(__file__).resolve().parent
    for _ in range(5):
        if (current / "dataset").exists() or (current / ".git").exists():
            return current
        current = current.parent
    return Path(__file__).resolve().parent.parent.parent.parent


class DemandPredictor:
    """Production inference engine for NGO meal demand forecasting."""

    MODEL_VERSION: str = "random_forest_v1"
    DISCLAIMER: str = "Synthetic-data experiment for operational redistribution planning only."

    def __init__(
        self,
        model_path: Optional[UnionPath] = None,
        demand_path: Optional[UnionPath] = None,
        ngos_path: Optional[UnionPath] = None,
        holidays_path: Optional[UnionPath] = None,
    ) -> None:
        """Initialize the predictor by loading the trained model and historical context.

        Args:
            model_path: Path to serialized .joblib pipeline.
            demand_path: Path to daily NGO demand CSV.
            ngos_path: Path to NGO metadata directory CSV.
            holidays_path: Path to holiday calendar CSV.
        """
        repo_root = _find_repo_root()

        def _resolve(p: Optional[UnionPath], default_rel: str) -> Path:
            if p is not None:
                p_obj = Path(p)
                return p_obj.resolve() if p_obj.is_absolute() else (repo_root / p_obj).resolve()
            return (repo_root / default_rel).resolve()

        self.path_model = _resolve(model_path, "ml/models/model_a.joblib")
        self.path_demand = _resolve(demand_path, "dataset/ngo_demand_daily.csv")
        self.path_ngos = _resolve(ngos_path, "dataset/ngos.csv")
        self.path_holidays = _resolve(holidays_path, "dataset/holidays.csv")

        if not self.path_model.exists():
            raise FileNotFoundError(f"Model artifact not found at: {self.path_model}")

        self.pipeline: Pipeline = joblib.load(self.path_model)
        self.preprocessor: ColumnTransformer = self.pipeline.named_steps["preprocessor"]
        self.regressor: RandomForestRegressor = self.pipeline.named_steps["regressor"]

        # Load metadata
        self.df_ngos = pd.read_csv(self.path_ngos)
        self.ngo_profile_map: Dict[str, Dict[str, Any]] = {}
        for _, row in self.df_ngos.iterrows():
            ngo_id = str(row["ngo_id"])
            self.ngo_profile_map[ngo_id] = {
                "ngo_type": str(row["ngo_type"]),
                "base_daily_meals": float(row["base_daily_meals"]),
                "receiving_capacity_meals": float(row["receiving_capacity_meals"]),
                "accepts_nonveg": int(row["accepts_nonveg"]),
                "open_hours_span": float(row["open_until_hour"] - row["open_from_hour"]),
            }

        # Load holidays
        self.holiday_dates = set()
        if self.path_holidays.exists():
            df_holidays = pd.read_csv(self.path_holidays)
            self.holiday_dates = set(pd.DatetimeIndex(df_holidays["date"]).normalize())

        # Load historical demand lookup
        self.demand_history: Dict[str, Dict[pd.Timestamp, float]] = {}
        if self.path_demand.exists():
            df_demand = pd.read_csv(self.path_demand)
            df_demand["date"] = pd.DatetimeIndex(df_demand["date"]).normalize()
            for _, row in df_demand.iterrows():
                ngo = str(row["ngo_id"])
                if ngo not in self.demand_history:
                    self.demand_history[ngo] = {}
                self.demand_history[ngo][row["date"]] = float(row["meals_requested"])

    def _extract_inference_features(
        self, ngo_id: str, target_date: pd.Timestamp
    ) -> Tuple[pd.DataFrame, float, bool]:
        """Assemble single-row feature vector observing strict past-only cutoff.

        Args:
            ngo_id: Identifier of target NGO.
            target_date: Target forecasting date.

        Returns:
            Tuple of (feature_dataframe, baseline_prediction, is_fallback).
        """
        # 1. Calendar Features
        weekday = target_date.weekday()
        month = target_date.month
        day_of_month = target_date.day
        is_weekend = int(weekday >= 5)
        is_holiday = int(target_date in self.holiday_dates)

        # 2. Static Profile Features
        is_fallback = False
        profile = self.ngo_profile_map.get(ngo_id)
        if profile is not None:
            ngo_type = profile["ngo_type"]
            base_daily = profile["base_daily_meals"]
            rec_cap = profile["receiving_capacity_meals"]
            accepts_nv = profile["accepts_nonveg"]
            open_span = profile["open_hours_span"]
        else:
            # Cold-start unknown NGO
            ngo_type = "unknown"
            base_daily = np.nan
            rec_cap = np.nan
            accepts_nv = 0
            open_span = np.nan
            is_fallback = True

        # 3. Past-Only Lags and Rolling Windows (strictly date < target_date)
        history = self.demand_history.get(ngo_id, {})
        valid_history = {d: m for d, m in history.items() if d < target_date}

        if len(valid_history) == 0:
            is_fallback = True

        lag_7 = valid_history.get(pd.Timestamp(target_date - pd.Timedelta(days=7)), np.nan)
        lag_14 = valid_history.get(pd.Timestamp(target_date - pd.Timedelta(days=14)), np.nan)
        lag_21 = valid_history.get(pd.Timestamp(target_date - pd.Timedelta(days=21)), np.nan)
        lag_28 = valid_history.get(pd.Timestamp(target_date - pd.Timedelta(days=28)), np.nan)

        def _get_window_stats(days_back: int) -> Tuple[float, float]:
            window_dates = [pd.Timestamp(target_date - pd.Timedelta(days=i)) for i in range(1, days_back + 1)]
            vals = [valid_history[d] for d in window_dates if d in valid_history]
            if len(vals) == 0:
                return np.nan, 0.0
            std_val = float(np.std(vals, ddof=1)) if len(vals) > 1 else 0.0
            return float(np.mean(vals)), std_val

        roll_7_mean, roll_7_std = _get_window_stats(7)
        roll_14_mean, _ = _get_window_stats(14)
        roll_28_mean, _ = _get_window_stats(28)

        # Baseline heuristic calculation
        valid_lags = [l for l in [lag_7, lag_14, lag_21, lag_28] if not np.isnan(l)]
        if len(valid_lags) > 0:
            baseline_pred = float(np.mean(valid_lags))
        else:
            baseline_pred = float(base_daily) if not np.isnan(base_daily) else 0.0

        feature_dict = {
            "weekday": [weekday],
            "month": [month],
            "day_of_month": [day_of_month],
            "is_weekend": [is_weekend],
            "is_holiday": [is_holiday],
            "base_daily_meals": [base_daily],
            "receiving_capacity_meals": [rec_cap],
            "accepts_nonveg": [accepts_nv],
            "open_hours_span": [open_span],
            "demand_lag_7": [lag_7],
            "demand_lag_14": [lag_14],
            "demand_lag_21": [lag_21],
            "demand_lag_28": [lag_28],
            "rolling_mean_7": [roll_7_mean],
            "rolling_mean_14": [roll_14_mean],
            "rolling_mean_28": [roll_28_mean],
            "rolling_std_7": [roll_7_std],
            "ngo_type": [ngo_type],
        }

        return pd.DataFrame(feature_dict), baseline_pred, is_fallback

    def predict_one(
        self, ngo_id: str, forecast_date: Union[str, pd.Timestamp]
    ) -> Dict[str, Any]:
        """Generate demand prediction and uncertainty intervals for an NGO and date.

        Adheres strictly to the output contract specification in prediction_contract.md.

        Args:
            ngo_id: Unique NGO identifier.
            forecast_date: Date string (YYYY-MM-DD) or Timestamp to forecast.

        Returns:
            Dictionary matching the prediction output schema contract.
        """
        target_ts = pd.Timestamp(forecast_date).normalize()
        date_str = str(target_ts.date())

        X_df, baseline_val, is_fallback = self._extract_inference_features(ngo_id, target_ts)

        # Regressor prediction
        pred_val = float(np.maximum(self.pipeline.predict(X_df)[0], 0.0))

        # Empirical tree ensemble confidence intervals (10th and 90th percentiles)
        X_trans = self.preprocessor.transform(X_df)
        tree_predictions = np.array([tree.predict(X_trans)[0] for tree in self.regressor.estimators_])
        lower_bound = float(np.maximum(np.percentile(tree_predictions, 10), 0.0))
        upper_bound = float(np.maximum(np.percentile(tree_predictions, 90), lower_bound))

        return {
            "ngo_id": ngo_id,
            "forecast_date": date_str,
            "predicted_meals": round(pred_val, 1),
            "baseline_prediction": round(baseline_val, 1),
            "model_version": self.MODEL_VERSION,
            "is_fallback": is_fallback,
            "confidence_lower": round(lower_bound, 1),
            "confidence_upper": round(upper_bound, 1),
            "disclaimer": self.DISCLAIMER,
        }

    def predict_batch(self, targets: List[Tuple[str, str]]) -> List[Dict[str, Any]]:
        """Generate predictions for a list of (ngo_id, forecast_date) tuples.

        Args:
            targets: List of (ngo_id, forecast_date_str) tuples.

        Returns:
            List of prediction dictionaries.
        """
        return [self.predict_one(ngo_id, date_str) for ngo_id, date_str in targets]


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="RescueBite AI Model A Inference Service")
    parser.add_argument("--ngo_id", type=str, default="N001", help="Target NGO ID")
    parser.add_argument("--forecast_date", type=str, default="2026-10-25", help="Forecast date (YYYY-MM-DD)")
    args = parser.parse_args()

    predictor = DemandPredictor()
    prediction = predictor.predict_one(args.ngo_id, args.forecast_date)
    print(json.dumps(prediction, indent=2))
