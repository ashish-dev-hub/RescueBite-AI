"""Same-weekday historical baseline heuristic for NGO meal demand forecasting.

Forecast rule: For NGO i on date D, average observed meals_requested at
D-7, D-14, D-21, and D-28. Missing historical records are averaged across
available lags. If no lags exist, fall back to base_daily_meals.
"""

from typing import Dict, List, Optional, Tuple, Union
import numpy as np
import pandas as pd


class SameWeekdayBaseline:
    """Predicts daily meal demand using the average of prior 4 same-weekday observations."""

    def __init__(
        self,
        lag_weeks: Tuple[int, ...] = (1, 2, 3, 4),
        fallback_map: Optional[Dict[str, float]] = None,
    ) -> None:
        """Initialize the baseline forecaster.

        Args:
            lag_weeks: Tuple of week intervals to lag (default: 1, 2, 3, 4 weeks).
            fallback_map: Optional mapping of ngo_id to fallback demand (e.g. base_daily_meals).
        """
        self.lag_days = [w * 7 for w in lag_weeks]
        self.fallback_map = fallback_map or {}
        self.history_: Dict[Tuple[str, pd.Timestamp], float] = {}

    def fit(self, df: pd.DataFrame) -> "SameWeekdayBaseline":
        """Record historical demand observations.

        Args:
            df: DataFrame containing ['ngo_id', 'date', 'meals_requested'].

        Returns:
            self
        """
        required_cols = {"ngo_id", "date", "meals_requested"}
        if not required_cols.issubset(df.columns):
            missing = required_cols - set(df.columns)
            raise ValueError(f"Missing required columns in history DataFrame: {missing}")

        df_copy = df.copy()
        df_copy["date"] = pd.DatetimeIndex(df_copy["date"]).normalize()

        self.history_ = {}
        for _, row in df_copy.iterrows():
            self.history_[(str(row["ngo_id"]), row["date"])] = float(row["meals_requested"])

        return self

    def predict_one(
        self, ngo_id: str, target_date: Union[str, pd.Timestamp]
    ) -> Tuple[float, int, bool]:
        """Predict meals_requested for a single NGO and target date.

        Strict leakage check: Only historical records prior to target_date are accessed.

        Args:
            ngo_id: Identifier of the NGO.
            target_date: Target date to forecast.

        Returns:
            Tuple of (predicted_meals, num_lags_found, is_fallback).
        """
        target_ts = pd.to_datetime(target_date).normalize()
        observed_lags: List[float] = []

        for days in self.lag_days:
            lag_date = target_ts - pd.Timedelta(days=days)
            key = (ngo_id, lag_date)
            if key in self.history_:
                observed_lags.append(self.history_[key])

        if len(observed_lags) > 0:
            return float(np.mean(observed_lags)), len(observed_lags), False

        fallback = self.fallback_map.get(ngo_id, np.nan)
        return fallback, 0, True

    def predict(self, df: pd.DataFrame) -> pd.DataFrame:
        """Generate baseline predictions for all rows in df.

        Args:
            df: DataFrame with ['ngo_id', 'date'].

        Returns:
            DataFrame with ['predicted_meals', 'lags_used', 'is_fallback'].
        """
        predictions = []
        lags_used = []
        fallbacks = []

        for _, row in df.iterrows():
            pred, n_lags, fb = self.predict_one(row["ngo_id"], row["date"])
            predictions.append(pred)
            lags_used.append(n_lags)
            fallbacks.append(fb)

        result = df.copy()
        result["predicted_meals"] = predictions
        result["lags_used"] = lags_used
        result["is_fallback"] = fallbacks
        return result

    def evaluate(self, df_test: pd.DataFrame) -> Dict[str, Union[float, int, str]]:
        """Evaluate predictions against ground-truth meals_requested.

        Args:
            df_test: DataFrame containing ['ngo_id', 'date', 'meals_requested'].

        Returns:
            Dictionary with MAE, RMSE, evaluated rows, coverage, and date ranges.
        """
        pred_df = self.predict(df_test)
        pred_df["date"] = pd.DatetimeIndex(pred_df["date"])

        valid_mask = ~pred_df["predicted_meals"].isna()
        valid_df = pred_df[valid_mask].copy()

        if len(valid_df) == 0:
            raise ValueError("No valid predictions generated to evaluate.")

        actual = np.asarray(valid_df["meals_requested"].to_numpy(), dtype=float)
        predicted = np.asarray(valid_df["predicted_meals"].to_numpy(), dtype=float)

        mae = float(np.mean(np.abs(actual - predicted)))
        rmse = float(np.sqrt(np.mean((actual - predicted) ** 2)))
        coverage = (len(valid_df) / len(df_test)) * 100.0

        min_d = str(pred_df["date"].min().date())
        max_d = str(pred_df["date"].max().date())

        return {
            "mae": round(mae, 2),
            "rmse": round(rmse, 2),
            "evaluated_rows": len(valid_df),
            "total_test_rows": len(df_test),
            "coverage_pct": round(coverage, 2),
            "test_start_date": min_d,
            "test_end_date": max_d,
            "fallbacks_used": int(valid_df["is_fallback"].sum()),
            "full_four_lags_pct": round(float((valid_df["lags_used"] == 4).mean() * 100.0), 2),
        }
