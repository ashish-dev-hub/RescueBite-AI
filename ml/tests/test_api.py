"""Unit and integration tests for RescueBite AI FastAPI Model Serving Layer."""

from pathlib import Path
import sys
from typing import Any, Dict

import pytest
from starlette.testclient import TestClient

# Ensure ml/src is on sys.path
_test_dir = Path(__file__).resolve().parent
_src_dir = _test_dir.parent / "src"
if str(_src_dir) not in sys.path:
    sys.path.insert(0, str(_src_dir))

from rescuebite_ml.api import app


@pytest.fixture(scope="module")
def client() -> TestClient:
    """Fixture providing TestClient instance."""
    return TestClient(app)


def test_health_endpoint(client: TestClient) -> None:
    """Verify /health returns 200 and expected service status metadata."""
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["service"] == "rescuebite-ml-api"
    assert data["version"] == "1.0.0"
    assert "timestamp_utc" in data


def test_models_status_endpoint(client: TestClient) -> None:
    """Verify /api/v1/models/status returns status for both Model A and Model B."""
    resp = client.get("/api/v1/models/status")
    assert resp.status_code == 200
    data = resp.json()
    assert "model_a_demand_forecaster" in data
    assert "model_b_allocation_matching" in data
    assert data["model_a_demand_forecaster"]["loaded"] is True
    assert data["model_b_allocation_matching"]["loaded"] is True
    assert "Synthetic-data experiment" in data["disclaimer"]


def test_demand_prediction_endpoint(client: TestClient) -> None:
    """Verify /api/v1/demand/predict returns single NGO demand forecast matching contract."""
    payload = {"ngo_id": "N001", "forecast_date": "2026-10-26"}
    resp = client.post("/api/v1/demand/predict", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert data["ngo_id"] == "N001"
    assert data["forecast_date"] == "2026-10-26"
    assert isinstance(data["predicted_meals"], (int, float))
    assert data["predicted_meals"] >= 0.0
    assert data["confidence_lower"] <= data["confidence_upper"]
    assert "Synthetic-data experiment" in data["disclaimer"]


def test_demand_prediction_batch_endpoint(client: TestClient) -> None:
    """Verify /api/v1/demand/predict-batch processes multiple targets."""
    payload = {
        "targets": [
            {"ngo_id": "N001", "forecast_date": "2026-10-26"},
            {"ngo_id": "N002", "forecast_date": "2026-10-26"},
        ]
    }
    resp = client.post("/api/v1/demand/predict-batch", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert data["total"] == 2
    assert len(data["predictions"]) == 2
    assert data["predictions"][0]["ngo_id"] == "N001"
    assert data["predictions"][1]["ngo_id"] == "N002"


def test_allocation_recommend_endpoint(client: TestClient) -> None:
    """Verify /api/v1/allocation/recommend ranks candidate NGOs with scores and reason codes."""
    payload: Dict[str, Any] = {
        "donation": {
            "donation_id": "DON_API_001",
            "food_category": "cooked_veg",
            "quantity_meals": 35.0,
            "created_at": "2026-10-26 12:00:00",
            "prepared_at": "2026-10-26 10:30:00",
            "pickup_deadline": "2026-10-26 15:30:00",
        },
        "donor": {
            "donor_id": "D001",
            "donor_type": "restaurant",
            "lat": 28.6139,
            "lon": 77.2090,
            "avg_surplus_meals": 50.0,
            "reliability": 0.95,
        },
        "top_k": 3,
        "min_score": 0.0,
    }
    resp = client.post("/api/v1/allocation/recommend", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert data["donation_id"] == "DON_API_001"
    assert data["food_category"] == "cooked_veg"
    assert data["total_candidates_evaluated"] > 0
    assert data["eligible_candidates_count"] > 0
    assert len(data["recommendations"]) <= 3
    assert len(data["recommendations"]) > 0

    first = data["recommendations"][0]
    assert "match_score" in first
    assert "success_probability" in first
    assert "reason_codes" in first
    assert len(first["reason_codes"]) > 0


def test_allocation_dietary_filter_via_api(client: TestClient) -> None:
    """Verify non-veg surplus donation triggers dietary filter on veg-only NGOs."""
    payload: Dict[str, Any] = {
        "donation": {
            "donation_id": "DON_NONVEG_API",
            "food_category": "cooked_nonveg",
            "quantity_meals": 30.0,
            "created_at": "2026-10-26 12:00:00",
            "prepared_at": "2026-10-26 10:30:00",
            "pickup_deadline": "2026-10-26 15:30:00",
        },
        "donor": {
            "donor_id": "D001",
            "donor_type": "hotel",
            "lat": 28.6139,
            "lon": 77.2090,
            "avg_surplus_meals": 50.0,
            "reliability": 0.90,
        },
        "top_k": 5,
    }
    resp = client.post("/api/v1/allocation/recommend", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert "DIETARY_INCOMPATIBLE_NONVEG" in data["ineligible_breakdown"]
    assert data["ineligible_breakdown"]["DIETARY_INCOMPATIBLE_NONVEG"] > 0


def test_allocation_capacity_filter_via_api(client: TestClient) -> None:
    """Verify excessive donation quantity filters out all NGOs via max capacity limit."""
    payload: Dict[str, Any] = {
        "donation": {
            "donation_id": "DON_EXCESSIVE",
            "food_category": "cooked_veg",
            "quantity_meals": 20000.0,
            "created_at": "2026-10-26 12:00:00",
            "prepared_at": "2026-10-26 10:30:00",
            "pickup_deadline": "2026-10-26 15:30:00",
        },
        "donor": {
            "donor_id": "D001",
            "donor_type": "event_hall",
            "lat": 28.6139,
            "lon": 77.2090,
            "avg_surplus_meals": 500.0,
            "reliability": 0.85,
        },
        "top_k": 5,
    }
    resp = client.post("/api/v1/allocation/recommend", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert data["eligible_candidates_count"] == 0
    assert len(data["recommendations"]) == 0
    assert "EXCEEDS_MAX_CAPACITY_LIMIT" in data["ineligible_breakdown"]


def test_evaluate_candidate_pair_endpoint(client: TestClient) -> None:
    """Verify /api/v1/allocation/evaluate-pair checks eligibility for a specific NGO."""
    payload: Dict[str, Any] = {
        "donation": {
            "donation_id": "DON_PAIR_001",
            "food_category": "cooked_veg",
            "quantity_meals": 40.0,
            "created_at": "2026-10-26 13:00:00",
            "prepared_at": "2026-10-26 11:00:00",
            "pickup_deadline": "2026-10-26 16:00:00",
        },
        "donor": {
            "donor_id": "D001",
            "donor_type": "restaurant",
            "lat": 28.6139,
            "lon": 77.2090,
            "avg_surplus_meals": 50.0,
            "reliability": 0.95,
        },
        "ngo_id": "N001",
        "recommended_quantity": 40.0,
    }
    resp = client.post("/api/v1/allocation/evaluate-pair", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert data["ngo_id"] == "N001"
    assert isinstance(data["is_eligible"], bool)
    if data["is_eligible"]:
        assert data["evaluation"] is not None
        assert "match_score" in data["evaluation"]


def test_evaluate_candidate_pair_not_found(client: TestClient) -> None:
    """Verify /api/v1/allocation/evaluate-pair returns 404 for non-existent NGO."""
    payload: Dict[str, Any] = {
        "donation": {
            "donation_id": "DON_PAIR_999",
            "food_category": "cooked_veg",
            "quantity_meals": 20.0,
        },
        "donor": {
            "donor_id": "D001",
            "donor_type": "restaurant",
            "lat": 28.6139,
            "lon": 77.2090,
        },
        "ngo_id": "NON_EXISTENT_NGO_ID",
    }
    resp = client.post("/api/v1/allocation/evaluate-pair", json=payload)
    assert resp.status_code == 404
