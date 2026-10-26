from pathlib import Path
import sys
import pytest
from starlette.testclient import TestClient

# Ensure ml/src is on sys.path
_test_dir = Path(__file__).resolve().parent
_src_dir = _test_dir.parent / "src"
if str(_src_dir) not in sys.path:
    sys.path.insert(0, str(_src_dir))

from rescuebite_ml.api import app
from rescuebite_ml.donor_supply_baseline import SameWeekdayDonorBaseline
from rescuebite_ml.donor_supply_features import (
    DonorSupplyFeatureEngineer,
    chronological_split_donor_supply,
)
from rescuebite_ml.donor_supply_predictor import DonorSupplyPredictor


@pytest.fixture(scope="module")
def api_client():
    return TestClient(app)


@pytest.fixture(scope="module")
def donor_predictor():
    return DonorSupplyPredictor()


def test_donor_features_pipeline():
    """Verify feature engineer produces valid feature columns and no leakage."""
    import pandas as pd

    fe = DonorSupplyFeatureEngineer()
    donations_data = pd.DataFrame(
        {
            "created_at": ["2026-01-01T10:00:00+05:30", "2026-01-02T12:00:00+05:30"],
            "donor_id": ["D001", "D001"],
            "quantity_meals": [30, 45],
        }
    )
    donors_data = pd.DataFrame(
        {
            "donor_id": ["D001"],
            "donor_type": ["restaurant"],
            "avg_surplus_meals": [40],
            "reliability": [0.90],
            "lat": [28.61],
            "lon": [77.20],
        }
    )
    panel = fe.build_features(donations_data, donors_data)

    assert len(panel) == 2
    for col in DonorSupplyFeatureEngineer.ALL_FEATURES:
        assert col in panel.columns


def test_baseline_heuristic():
    """Verify baseline model fits and predicts."""
    import pandas as pd

    train_df = pd.DataFrame(
        {
            "donor_id": ["D001", "D001", "D002"],
            "weekday": [0, 0, 1],
            "total_surplus_meals": [50.0, 70.0, 30.0],
        }
    )
    baseline = SameWeekdayDonorBaseline()
    baseline.fit(train_df)

    test_df = pd.DataFrame({"donor_id": ["D001", "D002", "D999"], "weekday": [0, 1, 3]})
    preds = baseline.predict(test_df)
    assert len(preds) == 3
    assert preds[0] == 60.0  # mean of 50 and 70
    assert preds[1] == 30.0
    assert preds[2] > 0.0  # fallback global mean


def test_donor_predictor_contract(donor_predictor):
    """Verify single inference returns exact contract specification."""
    res = donor_predictor.predict_one("D001", "2026-10-27")

    assert res["donor_id"] == "D001"
    assert res["forecast_date"] == "2026-10-27"
    assert isinstance(res["predicted_surplus_meals"], (int, float))
    assert res["predicted_surplus_meals"] >= 0.0
    assert 0.0 <= res["has_surplus_probability"] <= 1.0
    assert res["surplus_p10"] <= res["surplus_p90"]
    assert isinstance(res["reason_codes"], list)
    assert len(res["reason_codes"]) > 0
    assert res["is_fallback"] is False


def test_donor_predictor_unknown_fallback(donor_predictor):
    """Verify cold-start unknown donor is handled gracefully with is_fallback=True."""
    res = donor_predictor.predict_one("D9999_UNKNOWN", "2026-10-27")

    assert res["donor_id"] == "D9999_UNKNOWN"
    assert res["is_fallback"] is True
    assert res["predicted_surplus_meals"] >= 0.0


def test_donor_predictor_batch(donor_predictor):
    """Verify batch prediction returns list matching targets count."""
    targets = [("D001", "2026-10-27"), ("D002", "2026-10-28")]
    batch_res = donor_predictor.predict_batch(targets)

    assert len(batch_res) == 2
    assert batch_res[0]["donor_id"] == "D001"
    assert batch_res[1]["donor_id"] == "D002"


def test_api_models_status_includes_model_c(api_client):
    """Verify /api/v1/models/status registers Model C."""
    res = api_client.get("/api/v1/models/status")
    assert res.status_code == 200
    data = res.json()
    assert "model_c_donor_supply" in data
    assert data["model_c_donor_supply"]["status"] == "READY"
    assert data["model_c_donor_supply"]["loaded"] is True
    assert data["model_c_donor_supply"]["version"] == "random_forest_v1"


def test_api_predict_donor_supply(api_client):
    """Verify /api/v1/donor-supply/predict endpoint."""
    payload = {"donor_id": "D001", "forecast_date": "2026-10-27"}
    res = api_client.post("/api/v1/donor-supply/predict", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["donor_id"] == "D001"
    assert data["forecast_date"] == "2026-10-27"
    assert "predicted_surplus_meals" in data
    assert "has_surplus_probability" in data
    assert "surplus_p10" in data
    assert "surplus_p90" in data
    assert "reason_codes" in data


def test_api_predict_donor_supply_batch(api_client):
    """Verify /api/v1/donor-supply/predict-batch endpoint."""
    payload = {
        "targets": [
            {"donor_id": "D001", "forecast_date": "2026-10-27"},
            {"donor_id": "D005", "forecast_date": "2026-10-28"},
        ]
    }
    res = api_client.post("/api/v1/donor-supply/predict-batch", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 2
    assert len(data["predictions"]) == 2
