"""Feature engineering pipeline for RescueBite AI Model C (Donor Surplus Forecaster).

Aggregates individual donation transactions into a comprehensive daily panel
(120 donors x 540 calendar days) and computes leakage-free calendar, static donor,
past-only lag, and rolling statistics.
"""

from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union
import numpy as np
import pandas as pd

UnionPath = Union[str, Path]


class DonorSupplyFeatureEngineer:
    """Extracts leakage-free features for donor surplus supply forecasting."""

    CATEGORICAL_FEATURES: List[str] = ["donor_type"]

    NUMERIC_FEATURES: List[str] = [
        "weekday",
        "month",
        "day_of_month",
        "is_weekend",
        "is_holiday",
        "avg_surplus_meals",
        "reliability",
        "lat",
        "lon",
        "surplus_lag_1",
        "surplus_lag_7",
        "surplus_lag_14",
        "rolling_mean_7",
        "rolling_mean_14",
        "rolling_std_7",
        "active_days_count_14",
        "donation_frequency_14",
    ]

    ALL_FEATURES: List[str] = CATEGORICAL_FEATURES + NUMERIC_FEATURES

    @staticmethod
    def load_and_aggregate_donations(
        donations_path: UnionPath,
    ) -> pd.DataFrame:
        """Load donations CSV and aggregate to (donor_id, date) daily totals.

        Args:
            donations_path: Path to dataset/donations.csv.

        Returns:
            DataFrame with columns ['donor_id', 'date', 'total_surplus_meals', 'donation_events_count'].
        """
        df = pd.read_csv(donations_path)
        # Extract calendar date YYYY-MM-DD from created_at
        df["date"] = pd.to_datetime(df["created_at"].astype(str).str.slice(0, 10))

        daily = (
            df.groupby(["donor_id", "date"])
            .agg(
                total_surplus_meals=("quantity_meals", "sum"),
                donation_events_count=("quantity_meals", "count"),
            )
            .reset_index()
        )
        return daily

    def build_features(
        self,
        df_donations: pd.DataFrame,
        df_donors: pd.DataFrame,
        df_holidays: Optional[pd.DataFrame] = None,
    ) -> pd.DataFrame:
        """Build full feature matrix for the entire donor-day panel.

        Args:
            df_donations: Aggregated daily donations or raw donations.
            df_donors: Master directory of donors with static profile attributes.
            df_holidays: Optional calendar of public holidays.

        Returns:
            Complete panel DataFrame with targets and engineered features.
        """
        # Ensure daily aggregation
        if "total_surplus_meals" in df_donations.columns:
            daily_df = df_donations.copy()
            daily_df["date"] = pd.to_datetime(daily_df["date"])
        else:
            daily_df = self.load_and_aggregate_donations_from_raw(df_donations)

        # 1. Build Cartesian Product (all donors x all calendar dates)
        min_date = daily_df["date"].min()
        max_date = daily_df["date"].max()
        all_dates = pd.date_range(min_date, max_date, freq="D")
        all_donors = df_donors["donor_id"].unique()

        grid_index = pd.MultiIndex.from_product(
            [all_donors, all_dates], names=["donor_id", "date"]
        )

        grid_df = (
            daily_df.set_index(["donor_id", "date"])
            .reindex(grid_index)
            .reset_index()
            .sort_values(["donor_id", "date"])
        )

        # Fill unobserved days with 0 surplus
        grid_df["total_surplus_meals"] = grid_df["total_surplus_meals"].fillna(0.0)
        grid_df["donation_events_count"] = grid_df["donation_events_count"].fillna(0).astype(int)
        grid_df["has_surplus"] = (grid_df["total_surplus_meals"] > 0).astype(int)

        # 2. Past-Only Lags (strictly shifted)
        donor_grouped = grid_df.groupby("donor_id")["total_surplus_meals"]
        grid_df["surplus_lag_1"] = donor_grouped.shift(1).fillna(0.0)
        grid_df["surplus_lag_7"] = donor_grouped.shift(7).fillna(0.0)
        grid_df["surplus_lag_14"] = donor_grouped.shift(14).fillna(0.0)

        # 3. Past-Only Rolling Statistics (strictly shift(1) to exclude target day)
        shifted = donor_grouped.shift(1)
        grid_df["rolling_mean_7"] = (
            shifted.groupby(grid_df["donor_id"])
            .transform(lambda s: s.rolling(7, min_periods=1).mean())
            .fillna(0.0)
        )
        grid_df["rolling_mean_14"] = (
            shifted.groupby(grid_df["donor_id"])
            .transform(lambda s: s.rolling(14, min_periods=1).mean())
            .fillna(0.0)
        )
        grid_df["rolling_std_7"] = (
            shifted.groupby(grid_df["donor_id"])
            .transform(lambda s: s.rolling(7, min_periods=2).std())
            .fillna(0.0)
        )

        # 4. Past-Only Activity Frequency (over past 14 days)
        shifted_has = grid_df.groupby("donor_id")["has_surplus"].shift(1)
        grid_df["active_days_count_14"] = (
            shifted_has.groupby(grid_df["donor_id"])
            .transform(lambda s: s.rolling(14, min_periods=1).sum())
            .fillna(0.0)
        )
        grid_df["donation_frequency_14"] = (
            grid_df["active_days_count_14"] / 14.0
        )

        # 5. Calendar Features
        grid_df["weekday"] = grid_df["date"].dt.weekday
        grid_df["month"] = grid_df["date"].dt.month
        grid_df["day_of_month"] = grid_df["date"].dt.day
        grid_df["is_weekend"] = (grid_df["weekday"] >= 5).astype(int)

        # 6. Holiday Features
        if df_holidays is not None and not df_holidays.empty:
            holiday_dates = set(pd.to_datetime(df_holidays["date"]).dt.date)
            grid_df["is_holiday"] = (
                grid_df["date"].dt.date.isin(holiday_dates).astype(int)
            )
        else:
            grid_df["is_holiday"] = 0

        # 7. Merge Static Donor Profile Attributes
        donor_cols = ["donor_id", "donor_type", "avg_surplus_meals", "reliability", "lat", "lon"]
        grid_df = grid_df.merge(df_donors[donor_cols], on="donor_id", how="left")

        return grid_df

    @staticmethod
    def load_and_aggregate_donations_from_raw(raw_donations: pd.DataFrame) -> pd.DataFrame:
        """Helper to aggregate raw donations DataFrame."""
        df = raw_donations.copy()
        df["date"] = pd.to_datetime(df["created_at"].astype(str).str.slice(0, 10))
        return (
            df.groupby(["donor_id", "date"])
            .agg(
                total_surplus_meals=("quantity_meals", "sum"),
                donation_events_count=("quantity_meals", "count"),
            )
            .reset_index()
        )


def chronological_split_donor_supply(
    df: pd.DataFrame, test_days: int = 60
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.Timestamp]:
    """Chronologically split donor supply panel into train and test sets.

    Args:
        df: Feature matrix with 'date' column.
        test_days: Number of recent days reserved for test evaluation.

    Returns:
        (train_df, test_df, cutoff_date)
    """
    max_date = df["date"].max()
    cutoff_date = max_date - pd.Timedelta(days=test_days - 1)

    train_df = df[df["date"] < cutoff_date].copy().reset_index(drop=True)
    test_df = df[df["date"] >= cutoff_date].copy().reset_index(drop=True)

    return train_df, test_df, cutoff_date
