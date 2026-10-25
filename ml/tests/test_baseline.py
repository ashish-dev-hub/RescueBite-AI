import sys
from pathlib import Path
import numpy as np
import pandas as pd
import pytest

src_path = str(Path(__file__).resolve().parent.parent / "src")
if src_path not in sys.path:
    sys.path.insert(0, src_path)

from rescuebite_ml.baseline import SameWeekdayBaseline


def test_exact_lag_lookup():
    """Verify exact calculation when all 4 same-weekday lags are present."""
    history_data = [
        {"ngo_id": "NGO-1", "date": "2026-09-01", "meals_requested": 100},
        {"ngo_id": "NGO-1", "date": "2026-09-08", "meals_requested": 120},
        {"ngo_id": "NGO-1", "date": "2026-09-15", "meals_requested": 140},
        {"ngo_id": "NGO-1", "date": "2026-09-22", "meals_requested": 160},
    ]
    df_hist = pd.DataFrame(history_data)

    model = SameWeekdayBaseline()
    model.fit(df_hist)

    # Target date: 2026-09-29 (exactly 7 days after 09-22)
    # Lags are: 09-22 (160), 09-15 (140), 09-08 (120), 09-01 (100)
    pred, n_lags, is_fb = model.predict_one("NGO-1", "2026-09-29")

    assert n_lags == 4
    assert is_fb is False
    assert pred == pytest.approx(130.0)  # (100+120+140+160) / 4 = 130


def test_missing_historical_dates():
    """Verify that if some lags are missing (e.g. unobserved date), remaining lags are averaged."""
    history_data = [
        {"ngo_id": "NGO-1", "date": "2026-09-01", "meals_requested": 100},
        # 2026-09-08 is missing
        {"ngo_id": "NGO-1", "date": "2026-09-15", "meals_requested": 140},
        {"ngo_id": "NGO-1", "date": "2026-09-22", "meals_requested": 160},
    ]
    df_hist = pd.DataFrame(history_data)

    model = SameWeekdayBaseline()
    model.fit(df_hist)

    pred, n_lags, is_fb = model.predict_one("NGO-1", "2026-09-29")

    assert n_lags == 3
    assert is_fb is False
    assert pred == pytest.approx((100 + 140 + 160) / 3)


def test_insufficient_history_fallback():
    """Verify that when no same-weekday history exists, fallback mapping is used."""
    history_data = [
        {"ngo_id": "NGO-1", "date": "2026-09-02", "meals_requested": 100},  # Wednesday, not Tuesday
    ]
    df_hist = pd.DataFrame(history_data)

    fallback_map = {"NGO-1": 150.0}
    model = SameWeekdayBaseline(fallback_map=fallback_map)
    model.fit(df_hist)

    pred, n_lags, is_fb = model.predict_one("NGO-1", "2026-09-29")  # Tuesday

    assert n_lags == 0
    assert is_fb is True
    assert pred == pytest.approx(150.0)


def test_multiple_ngos_isolation():
    """Verify that NGO A's history never pollutes NGO B's predictions."""
    history_data = [
        {"ngo_id": "NGO-A", "date": "2026-09-01", "meals_requested": 500},
        {"ngo_id": "NGO-B", "date": "2026-09-01", "meals_requested": 50},
    ]
    df_hist = pd.DataFrame(history_data)

    model = SameWeekdayBaseline()
    model.fit(df_hist)

    pred_a, _, _ = model.predict_one("NGO-A", "2026-09-08")
    pred_b, _, _ = model.predict_one("NGO-B", "2026-09-08")

    assert pred_a == pytest.approx(500.0)
    assert pred_b == pytest.approx(50.0)


def test_leakage_safety():
    """Verify that records on or after the target date cannot alter the prediction."""
    history_base = [
        {"ngo_id": "NGO-1", "date": "2026-09-01", "meals_requested": 100},
        {"ngo_id": "NGO-1", "date": "2026-09-08", "meals_requested": 120},
    ]
    model_base = SameWeekdayBaseline()
    model_base.fit(pd.DataFrame(history_base))
    pred_before, _, _ = model_base.predict_one("NGO-1", "2026-09-15")

    # Add same-day actual and future dates
    history_leaked = history_base + [
        {"ngo_id": "NGO-1", "date": "2026-09-15", "meals_requested": 9999},  # same-day actual
        {"ngo_id": "NGO-1", "date": "2026-09-22", "meals_requested": 8888},  # future actual
    ]
    model_leaked = SameWeekdayBaseline()
    model_leaked.fit(pd.DataFrame(history_leaked))
    pred_after, _, _ = model_leaked.predict_one("NGO-1", "2026-09-15")

    assert pred_before == pred_after
    assert pred_after == pytest.approx(110.0)  # (100 + 120) / 2
