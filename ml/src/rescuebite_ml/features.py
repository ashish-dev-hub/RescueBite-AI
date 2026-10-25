"""Feature engineering pipeline for RescueBite AI Model A.

Generates calendar, static NGO, past-only lag, and past-only rolling features
strictly observing cutoff invariants to prevent data leakage.
"""

from typing import Dict, List, Optional, Tuple, Union
import numpy as np
import pandas as pd


class FeatureEngineer:
    """Extracts leakage-free features for NGO meal demand forecasting."""

    CATEGORICAL_FEATURES: List[str] = ["ngo_type"]

    NUMERIC_FEATURES: List[str] = [
        "weekday",
        "month",
        "day_of_month",
        "is_weekend",
        "is_holiday",
        "base_daily_meals",
        "receiving_capacity_meals",
        "accepts_nonveg",
        "open_hours_span",
        "demand_lag_7",
        "demand_lag_14",
        "demand_lag_21",
        "demand_lag_28",
        "rolling_mean_7",
        "rolling_mean_14",
        "rolling_mean_28",
        "rolling_std_7",
    ]

    ALL_FEATURES: List[str] = CATEGORICAL_FEATURES + NUMERIC_FEATURES

    def __init__(self) -> None:
        pass

    def build_features(
        self,
        df_demand: pd.DataFrame,
        df_ngos: pd.DataFrame,
        df_holidays: Optional[pd.DataFrame] = None,
    ) -> pd.DataFrame:
        """Build full feature matrix from demand records and metadata.

        Args:
            df_demand: Demand records with ['ngo_id', 'date', 'meals_requested'].
            df_ngos: Master directory of NGOs with operational capacities.
            df_holidays: Optional calendar of public holidays.

        Returns:
            DataFrame containing metadata, target variable, and all engineered features.
        """
        required_demand_cols = {"ngo_id", "date"}
        if not required_demand_cols.issubset(df_demand.columns):
            missing = required_demand_cols - set(df_demand.columns)
            raise ValueError(f"Missing required columns in demand DataFrame: {missing}")

        required_ngo_cols = {
            "ngo_id",
            "ngo_type",
            "base_daily_meals",
            "receiving_capacity_meals",
            "accepts_nonveg",
            "open_from_hour",
            "open_until_hour",
        }
        if not required_ngo_cols.issubset(df_ngos.columns):
            missing = required_ngo_cols - set(df_ngos.columns)
            raise ValueError(f"Missing required columns in NGO DataFrame: {missing}")

        df_d = df_demand.copy()
        df_d["date"] = pd.DatetimeIndex(df_d["date"]).normalize()

        # Reindex onto complete (NGO x calendar date) grid so calendar shifts are exact
        all_dates = pd.date_range(df_d["date"].min(), df_d["date"].max(), freq="D")
        all_ngos = df_d["ngo_id"].unique()
        full_grid_index = pd.MultiIndex.from_product(
            [all_ngos, all_dates], names=["ngo_id", "date"]
        )

        grid_df = (
            df_d.set_index(["ngo_id", "date"])
            .reindex(full_grid_index)
            .reset_index()
            .sort_values(["ngo_id", "date"])
        )

        # 1. Past-Only Same-Weekday Lag Features
        grid_grouped = grid_df.groupby("ngo_id")["meals_requested"]
        grid_df["demand_lag_7"] = grid_grouped.shift(7)
        grid_df["demand_lag_14"] = grid_grouped.shift(14)
        grid_df["demand_lag_21"] = grid_grouped.shift(21)
        grid_df["demand_lag_28"] = grid_grouped.shift(28)

        # 2. Past-Only Rolling Window Statistics (strictly shifted by 1 to exclude day D)
        grid_df["rolling_mean_7"] = grid_df.groupby("ngo_id")["meals_requested"].transform(
            lambda s: s.shift(1).rolling(7, min_periods=1).mean()
        )
        grid_df["rolling_mean_14"] = grid_df.groupby("ngo_id")["meals_requested"].transform(
            lambda s: s.shift(1).rolling(14, min_periods=1).mean()
        )
        grid_df["rolling_mean_28"] = grid_df.groupby("ngo_id")["meals_requested"].transform(
            lambda s: s.shift(1).rolling(28, min_periods=1).mean()
        )
        grid_df["rolling_std_7"] = grid_df.groupby("ngo_id")["meals_requested"].transform(
            lambda s: s.shift(1).rolling(7, min_periods=2).std().fillna(0.0)
        )

        # Merge engineered lag/rolling features back to original demand rows
        engineered_cols = [
            "ngo_id",
            "date",
            "demand_lag_7",
            "demand_lag_14",
            "demand_lag_21",
            "demand_lag_28",
            "rolling_mean_7",
            "rolling_mean_14",
            "rolling_mean_28",
            "rolling_std_7",
        ]
        result = pd.merge(df_d, grid_df[engineered_cols], on=["ngo_id", "date"], how="left")

        # 3. Calendar Features
        date_idx = pd.DatetimeIndex(result["date"])
        result["weekday"] = date_idx.weekday
        result["month"] = date_idx.month
        result["day_of_month"] = date_idx.day
        result["is_weekend"] = (result["weekday"] >= 5).astype(int)

        # Holiday indicator
        if "is_holiday" in result.columns:
            result["is_holiday"] = result["is_holiday"].astype(int)
        elif df_holidays is not None and not df_holidays.empty:
            holiday_dates = set(pd.DatetimeIndex(df_holidays["date"]).normalize())
            result["is_holiday"] = result["date"].isin(holiday_dates).astype(int)
        else:
            result["is_holiday"] = 0

        # 4. Static NGO Operational Profiles
        df_n = df_ngos.copy()
        df_n["open_hours_span"] = df_n["open_until_hour"] - df_n["open_from_hour"]
        df_n["accepts_nonveg"] = df_n["accepts_nonveg"].astype(int)

        static_cols = [
            "ngo_id",
            "ngo_type",
            "base_daily_meals",
            "receiving_capacity_meals",
            "accepts_nonveg",
            "open_hours_span",
        ]
        if "lat" in df_n.columns and "lon" in df_n.columns:
            static_cols.extend(["lat", "lon"])

        result = pd.merge(result, df_n[static_cols], on="ngo_id", how="left")

        return result


def chronological_split(
    df: pd.DataFrame, test_days: int = 60
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """Split DataFrame into train and test sets strictly chronologically.

    Args:
        df: DataFrame containing a 'date' column.
        test_days: Number of final calendar days for the holdout test set (default: 60).

    Returns:
        Tuple of (train_df, test_df) where max(train.date) < min(test.date).
    """
    df_work = df.copy()
    df_work["date"] = pd.DatetimeIndex(df_work["date"]).normalize()

    max_date = df_work["date"].max()
    test_start = max_date - pd.Timedelta(days=test_days - 1)

    train_df = pd.DataFrame(df_work[df_work["date"] < test_start].copy())
    test_df = pd.DataFrame(df_work[df_work["date"] >= test_start].copy())

    if len(train_df) == 0 or len(test_df) == 0:
        raise ValueError("Chronological split produced empty train or test partition.")

    return train_df, test_df
