"""Unit tests for FeatureEngineer and chronological_split."""

import sys
from pathlib import Path

# Add ml/src to sys.path so rescuebite_ml is resolved directly
_test_dir = Path(__file__).resolve().parent
_src_dir = _test_dir.parent / "src"
if str(_src_dir) not in sys.path:
    sys.path.insert(0, str(_src_dir))

import numpy as np
import pandas as pd
import pytest

try:
    from rescuebite_ml.features import FeatureEngineer, chronological_split
except ImportError:
    from ml.src.rescuebite_ml.features import FeatureEngineer, chronological_split


@pytest.fixture
def sample_ngo_metadata() -> pd.DataFrame:
    """Fixture providing standard NGO metadata for testing."""
    return pd.DataFrame(
        [
            {
                "ngo_id": "NGO-1",
                "ngo_type": "shelter",
                "lat": 12.97,
                "lon": 77.59,
                "base_daily_meals": 100,
                "receiving_capacity_meals": 250,
                "accepts_nonveg": True,
                "open_from_hour": 8,
                "open_until_hour": 22,
            },
            {
                "ngo_id": "NGO-2",
                "ngo_type": "soup_kitchen",
                "lat": 12.92,
                "lon": 77.62,
                "base_daily_meals": 80,
                "receiving_capacity_meals": 160,
                "accepts_nonveg": False,
                "open_from_hour": 9,
                "open_until_hour": 21,
            },
        ]
    )


def test_calendar_and_static_features(sample_ngo_metadata: pd.DataFrame) -> None:
    """Verify extraction of calendar and static profile features."""
    dates = pd.date_range("2026-09-01", "2026-09-07", freq="D")  # Tuesday to Monday
    df_demand = pd.DataFrame(
        {
            "ngo_id": "NGO-1",
            "date": dates,
            "meals_requested": [100, 110, 120, 130, 140, 150, 160],
            "is_holiday": [False, False, False, False, False, True, False],
        }
    )

    fe = FeatureEngineer()
    res = fe.build_features(df_demand, sample_ngo_metadata)

    # Tuesday: weekday = 1, is_weekend = 0
    row_tue = res[res["date"] == pd.Timestamp("2026-09-01")].iloc[0]
    assert row_tue["weekday"] == 1
    assert row_tue["month"] == 9
    assert row_tue["day_of_month"] == 1
    assert row_tue["is_weekend"] == 0
    assert row_tue["is_holiday"] == 0

    # Saturday: weekday = 5, is_weekend = 1
    row_sat = res[res["date"] == pd.Timestamp("2026-09-05")].iloc[0]
    assert row_sat["weekday"] == 5
    assert row_sat["is_weekend"] == 1

    # Static features
    assert row_tue["open_hours_span"] == 14  # 22 - 8
    assert row_tue["accepts_nonveg"] == 1
    assert row_tue["base_daily_meals"] == 100


def test_lag_calculation_accuracy(sample_ngo_metadata: pd.DataFrame) -> None:
    """Verify past-only same-weekday lags are accurately shifted."""
    dates = pd.date_range("2026-08-01", "2026-09-15", freq="D")
    demand_vals = [float(i + 10) for i in range(len(dates))]

    df_demand = pd.DataFrame(
        {
            "ngo_id": "NGO-1",
            "date": dates,
            "meals_requested": demand_vals,
            "is_holiday": False,
        }
    )

    fe = FeatureEngineer()
    res = fe.build_features(df_demand, sample_ngo_metadata)

    # Check date 2026-09-15
    target_date = pd.Timestamp("2026-09-15")
    row = res[res["date"] == target_date].iloc[0]

    val_d7 = df_demand[df_demand["date"] == target_date - pd.Timedelta(days=7)]["meals_requested"].values[0]
    val_d14 = df_demand[df_demand["date"] == target_date - pd.Timedelta(days=14)]["meals_requested"].values[0]
    val_d21 = df_demand[df_demand["date"] == target_date - pd.Timedelta(days=21)]["meals_requested"].values[0]
    val_d28 = df_demand[df_demand["date"] == target_date - pd.Timedelta(days=28)]["meals_requested"].values[0]

    assert row["demand_lag_7"] == val_d7
    assert row["demand_lag_14"] == val_d14
    assert row["demand_lag_21"] == val_d21
    assert row["demand_lag_28"] == val_d28


def test_missing_date_grid_preservation(sample_ngo_metadata: pd.DataFrame) -> None:
    """Verify that unobserved grid dates produce NaN lags rather than shifting consecutive rows."""
    # Day D-7 is deliberately missing from df_demand
    # Target date = 2026-09-10 (D)
    # D-7 = 2026-09-03 is omitted from input
    input_records = [
        {"ngo_id": "NGO-1", "date": "2026-09-01", "meals_requested": 100, "is_holiday": False},
        {"ngo_id": "NGO-1", "date": "2026-09-02", "meals_requested": 110, "is_holiday": False},
        # 2026-09-03 is omitted
        {"ngo_id": "NGO-1", "date": "2026-09-04", "meals_requested": 130, "is_holiday": False},
        {"ngo_id": "NGO-1", "date": "2026-09-10", "meals_requested": 150, "is_holiday": False},
    ]
    df_demand = pd.DataFrame(input_records)

    fe = FeatureEngineer()
    res = fe.build_features(df_demand, sample_ngo_metadata)

    target_row = res[res["date"] == pd.Timestamp("2026-09-10")].iloc[0]
    # D-7 was unobserved, so demand_lag_7 must be NaN (never filled with wrong shifted row)
    assert np.isnan(target_row["demand_lag_7"])


def test_strict_leakage_invariance(sample_ngo_metadata: pd.DataFrame) -> None:
    """Verify changing meals_requested on target date D does NOT change any feature on day D."""
    dates = pd.date_range("2026-08-01", "2026-09-01", freq="D")
    df_base = pd.DataFrame(
        {
            "ngo_id": "NGO-1",
            "date": dates,
            "meals_requested": [100.0] * len(dates),
            "is_holiday": False,
        }
    )

    df_tampered = df_base.copy()
    target_date = pd.Timestamp("2026-09-01")
    # Tamper with actual target-day demand
    df_tampered.loc[df_tampered["date"] == target_date, "meals_requested"] = 99999.0

    fe = FeatureEngineer()
    res_base = fe.build_features(df_base, sample_ngo_metadata)
    res_tampered = fe.build_features(df_tampered, sample_ngo_metadata)

    row_base = res_base[res_base["date"] == target_date].iloc[0]
    row_tampered = res_tampered[res_tampered["date"] == target_date].iloc[0]

    for feature in FeatureEngineer.ALL_FEATURES:
        val_b = row_base[feature]
        val_t = row_tampered[feature]
        assert val_b == val_t, f"Leakage detected on {feature}: {val_b} != {val_t}"


def test_chronological_split() -> None:
    """Verify chronological split guarantees max(train) < min(test)."""
    dates = pd.date_range("2026-01-01", "2026-03-31", freq="D")  # 90 calendar days
    df = pd.DataFrame({"date": dates, "val": range(len(dates))})

    train_df, test_df = chronological_split(df, test_days=30)

    assert len(test_df["date"].unique()) == 30
    assert len(train_df["date"].unique()) == 60
    assert train_df["date"].max() < test_df["date"].min()
