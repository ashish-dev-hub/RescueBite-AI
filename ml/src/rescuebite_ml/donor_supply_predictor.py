"""Inference predictor implementation for RescueBite AI Model C (Donor Surplus Forecaster).

Loads serialized model bundle (regressor, classifier, donor profiles, recent history)
and provides single and batch inference with uncertainty bounds, surplus occurrence probability,
and explainable reason codes.
"""

from datetime import datetime
from pathlib import Path
import sys
from typing import Any, Dict, List, Optional, Tuple, Union

import joblib
import numpy as np
import pandas as pd

try:
    from .donor_supply_features import DonorSupplyFeatureEngineer
except ImportError:
    _src_dir = Path(__file__).resolve().parent.parent
    if str(_src_dir) not in sys.path:
        sys.path.insert(0, str(_src_dir))
    from rescuebite_ml.donor_supply_features import DonorSupplyFeatureEngineer

UnionPath = Union[str, Path]


def _find_repo_root() -> Path:
    current = Path(__file__).resolve().parent
    for _ in range(5):
        if (current / "dataset").exists() or (current / ".git").exists():
            return current
        current = current.parent
    return Path(__file__).resolve().parent.parent.parent.parent


class DonorSupplyPredictor:
    """Production inference engine for donor surplus forecasting (Model C)."""

    MODEL_VERSION: str = "random_forest_v1"
    DISCLAIMER: str = "Synthetic-data experiment for donor surplus supply forecasting only."

    def __init__(
        self,
        model_path: Optional[UnionPath] = None,
        donors_path: Optional[UnionPath] = None,
        holidays_path: Optional[UnionPath] = None,
    ) -> None:
        """Initialize the predictor by loading the trained model bundle and metadata.

        Args:
            model_path: Path to serialized model_c_donor_supply.joblib bundle.
            donors_path: Path to dataset/donors.csv.
            holidays_path: Path to dataset/holidays.csv.
        """
        repo_root = _find_repo_root()

        def _resolve(p: Optional[UnionPath], default_rel: str) -> Path:
            if p is not None:
                p_obj = Path(p)
                return p_obj.resolve() if p_obj.is_absolute() else (repo_root / p_obj).resolve()
            return (repo_root / default_rel).resolve()

        self.path_model = _resolve(model_path, "ml/models/model_c_donor_supply.joblib")
        self.path_donors = _resolve(donors_path, "dataset/donors.csv")
        self.path_holidays = _resolve(holidays_path, "dataset/holidays.csv")

        if not self.path_model.exists():
            raise FileNotFoundError(f"Model C artifact not found at: {self.path_model}")

        bundle = joblib.load(self.path_model)
        self.regressor_pipeline = bundle["regressor_pipeline"]
        self.classifier_pipeline = bundle["classifier_pipeline"]
        self.feature_names: List[str] = bundle.get("feature_names", DonorSupplyFeatureEngineer.ALL_FEATURES)
        self.donor_profiles: Dict[str, Dict[str, Any]] = bundle.get("donor_profiles", {})
        self.recent_history: Dict[str, Any] = bundle.get("recent_history", {})
        self.model_version: str = bundle.get("model_version", self.MODEL_VERSION)

        # Preprocessor & estimators for tree interval extraction
        self.preprocessor = self.regressor_pipeline.named_steps["preprocessor"]
        self.regressor = self.regressor_pipeline.named_steps["regressor"]

        # Holidays lookup
        self.holiday_dates = set()
        if self.path_holidays.exists():
            df_h = pd.read_csv(self.path_holidays)
            self.holiday_dates = set(pd.to_datetime(df_h["date"]).dt.date)

    def _extract_inference_features(
        self, donor_id: str, target_ts: pd.Timestamp
    ) -> Tuple[pd.DataFrame, bool, Dict[str, Any]]:
        """Extract all model features for a single donor-date inference query."""
        target_date = target_ts.date()
        weekday = int(target_ts.weekday())
        month = int(target_ts.month)
        day_of_month = int(target_ts.day)
        is_weekend = int(weekday >= 5)
        is_holiday = int(target_date in self.holiday_dates)

        # 1. Profile attributes
        profile = self.donor_profiles.get(str(donor_id))
        is_fallback = False
        if profile is not None:
            donor_type = str(profile.get("donor_type", "restaurant"))
            avg_surplus = float(profile.get("avg_surplus_meals", 50.0))
            reliability = float(profile.get("reliability", 0.90))
            lat = float(profile.get("lat", 28.6139))
            lon = float(profile.get("lon", 77.2090))
        else:
            donor_type = "restaurant"
            avg_surplus = 50.0
            reliability = 0.88
            lat = 28.6139
            lon = 77.2090
            is_fallback = True

        # 2. Extract past-only historical series for this donor
        hist = self.recent_history.get(str(donor_id), {})
        dates = hist.get("dates", [])
        surplus_vals = hist.get("surplus_meals", [])
        has_surplus_vals = hist.get("has_surplus", [])

        # Filter strictly to dates prior to target_date
        past_surplus: Dict[str, float] = {}
        past_has: Dict[str, int] = {}
        for d_str, s_val, h_val in zip(dates, surplus_vals, has_surplus_vals):
            try:
                d_obj = datetime.strptime(d_str, "%Y-%m-%d").date()
                if d_obj < target_date:
                    past_surplus[d_str] = float(s_val)
                    past_has[d_str] = int(h_val)
            except ValueError:
                continue

        # Compute Lags
        def _get_lag(days_ago: int) -> float:
            lag_d = target_date - pd.Timedelta(days=days_ago)
            d_str = lag_d.strftime("%Y-%m-%d")
            return past_surplus.get(d_str, 0.0)

        surplus_lag_1 = _get_lag(1)
        surplus_lag_7 = _get_lag(7)
        surplus_lag_14 = _get_lag(14)

        # Compute Rolling Statistics
        def _get_rolling_stats(window_days: int) -> Tuple[float, float, float]:
            vals = []
            has_vals = []
            for i in range(1, window_days + 1):
                d_obj = target_date - pd.Timedelta(days=i)
                d_str = d_obj.strftime("%Y-%m-%d")
                if d_str in past_surplus:
                    vals.append(past_surplus[d_str])
                    has_vals.append(past_has.get(d_str, 0))
            if len(vals) == 0:
                # Fallback to donor average proportion
                return (avg_surplus * 0.4), 0.0, 0.4
            mean_v = float(np.mean(vals))
            std_v = float(np.std(vals)) if len(vals) > 1 else 0.0
            freq_v = float(np.mean(has_vals))
            return mean_v, std_v, freq_v

        roll_7_mean, roll_7_std, _ = _get_rolling_stats(7)
        roll_14_mean, _, freq_14 = _get_rolling_stats(14)
        active_days_14 = float(freq_14 * 14.0)

        feature_dict = {
            "weekday": [weekday],
            "month": [month],
            "day_of_month": [day_of_month],
            "is_weekend": [is_weekend],
            "is_holiday": [is_holiday],
            "donor_type": [donor_type],
            "avg_surplus_meals": [avg_surplus],
            "reliability": [reliability],
            "lat": [lat],
            "lon": [lon],
            "surplus_lag_1": [surplus_lag_1],
            "surplus_lag_7": [surplus_lag_7],
            "surplus_lag_14": [surplus_lag_14],
            "rolling_mean_7": [roll_7_mean],
            "rolling_mean_14": [roll_14_mean],
            "rolling_std_7": [roll_7_std],
            "active_days_count_14": [active_days_14],
            "donation_frequency_14": [freq_14],
        }

        meta = {
            "donor_type": donor_type,
            "avg_surplus": avg_surplus,
            "reliability": reliability,
            "is_weekend": is_weekend,
            "donation_frequency_14": freq_14,
        }

        return pd.DataFrame(feature_dict), is_fallback, meta

    def predict_one(
        self, donor_id: str, forecast_date: Union[str, pd.Timestamp]
    ) -> Dict[str, Any]:
        """Generate supply forecast, bounds, probability, and reason codes for one donor.

        Args:
            donor_id: Registered donor identifier (e.g. 'D001').
            forecast_date: Date string (YYYY-MM-DD) or Timestamp to forecast.

        Returns:
            Structured prediction dictionary matching the Model C API contract.
        """
        target_ts = pd.Timestamp(forecast_date).normalize()
        date_str = str(target_ts.date())

        X_df, is_fallback, meta = self._extract_inference_features(donor_id, target_ts)

        # Regressor prediction
        pred_raw = float(self.regressor_pipeline.predict(X_df)[0])
        pred_val = float(max(0.0, pred_raw))

        # Classifier prediction (probability of surplus generation)
        proba = float(self.classifier_pipeline.predict_proba(X_df)[0][1])

        # Tree quantiles for uncertainty interval
        X_trans = self.preprocessor.transform(X_df)
        tree_preds = np.array([tree.predict(X_trans)[0] for tree in self.regressor.estimators_])
        p10 = float(max(0.0, np.percentile(tree_preds, 10)))
        p90 = float(max(p10, np.percentile(tree_preds, 90)))

        # Reason codes / explainability heuristics
        reasons: List[str] = []
        if proba >= 0.70:
            reasons.append(f"High surplus likelihood ({proba:.0%}) based on historical cadence")
        elif proba <= 0.30:
            reasons.append(f"Low donation likelihood ({proba:.0%}) for this calendar day")

        if meta["is_weekend"]:
            reasons.append(f"Weekend profile impact applied for {meta['donor_type']}")

        if meta["reliability"] >= 0.92:
            reasons.append(f"High historical dispatch fulfillment reliability ({meta['reliability']:.0%})")

        if meta["donation_frequency_14"] >= 0.50:
            reasons.append("High recent donation frequency (active >= 7 days in past fortnight)")

        if not reasons:
            reasons.append(f"Expected surplus volume aligned with {meta['donor_type']} operational baseline")

        confidence = round(float(meta["reliability"] * (0.85 if not is_fallback else 0.60)), 2)

        return {
            "donor_id": donor_id,
            "forecast_date": date_str,
            "predicted_surplus_meals": round(pred_val, 1),
            "has_surplus_probability": round(proba, 3),
            "surplus_p10": round(p10, 1),
            "surplus_p90": round(p90, 1),
            "confidence_score": confidence,
            "donor_type": meta["donor_type"],
            "is_fallback": is_fallback,
            "reason_codes": reasons,
            "model_version": self.model_version,
            "disclaimer": self.DISCLAIMER,
        }

    def predict_batch(self, targets: List[Tuple[str, str]]) -> List[Dict[str, Any]]:
        """Generate predictions for multiple (donor_id, forecast_date) tuples."""
        return [self.predict_one(d_id, f_date) for d_id, f_date in targets]


if __name__ == "__main__":
    predictor = DonorSupplyPredictor()
    sample = predictor.predict_one("D001", "2026-10-27")
    import json
    print(json.dumps(sample, indent=2))
