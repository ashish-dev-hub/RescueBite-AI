"""Unit tests for DemandPredictor inference service and contract adherence."""

from pathlib import Path
import sys
import pytest

# Add ml/src to sys.path so rescuebite_ml is resolved directly
_test_dir = Path(__file__).resolve().parent
_src_dir = _test_dir.parent / "src"
if str(_src_dir) not in sys.path:
    sys.path.insert(0, str(_src_dir))

try:
    from rescuebite_ml.predict import DemandPredictor
except ImportError:
    from ml.src.rescuebite_ml.predict import DemandPredictor


@pytest.fixture(scope="module")
def predictor() -> DemandPredictor:
    """Fixture initializing predictor once across module tests."""
    return DemandPredictor()


def test_predict_one_contract_schema(predictor: DemandPredictor) -> None:
    """Verify single prediction strictly adheres to prediction_contract.md schema."""
    res = predictor.predict_one("N001", "2026-10-25")

    expected_keys = {
        "ngo_id",
        "forecast_date",
        "predicted_meals",
        "baseline_prediction",
        "model_version",
        "is_fallback",
        "confidence_lower",
        "confidence_upper",
        "disclaimer",
    }
    assert set(res.keys()) == expected_keys

    assert res["ngo_id"] == "N001"
    assert res["forecast_date"] == "2026-10-25"
    assert isinstance(res["predicted_meals"], float)
    assert isinstance(res["baseline_prediction"], float)
    assert res["model_version"] == "random_forest_v1"
    assert isinstance(res["is_fallback"], bool)
    assert res["is_fallback"] is False  # N001 has active historical demand
    assert isinstance(res["confidence_lower"], float)
    assert isinstance(res["confidence_upper"], float)
    assert "Synthetic-data experiment" in res["disclaimer"]


def test_confidence_intervals_validity(predictor: DemandPredictor) -> None:
    """Verify uncertainty intervals are properly ordered and non-negative."""
    res = predictor.predict_one("N002", "2026-10-25")

    assert res["predicted_meals"] >= 0.0
    assert res["confidence_lower"] >= 0.0
    assert res["confidence_lower"] <= res["confidence_upper"]


def test_cold_start_unknown_ngo_fallback(predictor: DemandPredictor) -> None:
    """Verify unknown NGO is handled gracefully via fallback policy without error."""
    res = predictor.predict_one("NON_EXISTENT_NGO_999", "2026-10-25")

    assert res["ngo_id"] == "NON_EXISTENT_NGO_999"
    assert res["is_fallback"] is True
    assert res["predicted_meals"] >= 0.0
    assert res["confidence_lower"] >= 0.0
    assert res["confidence_lower"] <= res["confidence_upper"]


def test_predict_batch(predictor: DemandPredictor) -> None:
    """Verify batch prediction returns matching length and valid outputs."""
    targets = [
        ("N001", "2026-10-25"),
        ("N002", "2026-10-25"),
        ("N003", "2026-10-26"),
    ]
    results = predictor.predict_batch(targets)

    assert len(results) == 3
    assert results[0]["ngo_id"] == "N001"
    assert results[1]["ngo_id"] == "N002"
    assert results[2]["ngo_id"] == "N003"
    assert results[2]["forecast_date"] == "2026-10-26"
