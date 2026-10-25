"""Unit tests for RescueBite AI Model B (Smart Allocation & Matching Engine).

Validates feature engineering, strict leakage prevention, chronological splitting,
hard constraint enforcement, and recommendation schema contract adherence.
"""

from pathlib import Path
import sys
from typing import Any, Dict

import pandas as pd
import pytest

# Ensure ml/src is on sys.path
_test_dir = Path(__file__).resolve().parent
_src_dir = _test_dir.parent / "src"
if str(_src_dir) not in sys.path:
    sys.path.insert(0, str(_src_dir))

from rescuebite_ml.matching_engine import MatchingEngine
from rescuebite_ml.matching_features import (
    AllocationFeatureEngineer,
    calculate_haversine_distance_km,
    chronological_split_allocations,
)


@pytest.fixture(scope="module")
def matching_engine() -> MatchingEngine:
    """Fixture initializing MatchingEngine with trained model and dataset."""
    return MatchingEngine()


@pytest.fixture(scope="module")
def sample_donor() -> Dict[str, Any]:
    """Sample donor fixture."""
    return {
        "donor_id": "D001",
        "donor_type": "restaurant",
        "lat": 28.6139,
        "lon": 77.2090,
        "avg_surplus_meals": 60,
        "reliability": 0.94,
    }


@pytest.fixture(scope="module")
def sample_veg_donation() -> Dict[str, Any]:
    """Sample vegetarian donation fixture."""
    return {
        "donation_id": "DON_TEST_VEG",
        "food_category": "cooked_veg",
        "quantity_meals": 35,
        "created_at": "2026-10-25 13:00:00",
        "prepared_at": "2026-10-25 11:30:00",
        "pickup_deadline": "2026-10-25 16:30:00",
    }


@pytest.fixture(scope="module")
def sample_nonveg_donation() -> Dict[str, Any]:
    """Sample non-vegetarian donation fixture."""
    return {
        "donation_id": "DON_TEST_NONVEG",
        "food_category": "cooked_nonveg",
        "quantity_meals": 40,
        "created_at": "2026-10-25 13:00:00",
        "prepared_at": "2026-10-25 11:30:00",
        "pickup_deadline": "2026-10-25 15:30:00",
    }


def test_haversine_distance() -> None:
    """Verify haversine distance calculates zero for identical coordinates and positive for distant points."""
    dist_zero = calculate_haversine_distance_km(28.6139, 77.2090, 28.6139, 77.2090)
    assert dist_zero == 0.0

    # Delhi to Mumbai ~ 1150 km
    dist_delhi_mumbai = calculate_haversine_distance_km(
        28.6139, 77.2090, 19.0760, 72.8777
    )
    assert 1100.0 < dist_delhi_mumbai < 1250.0


def test_leakage_absence_in_features() -> None:
    """Verify engineered features strictly exclude post-event columns."""
    forbidden_leakage_cols = {
        "remaining_quantity",
        "approved_quantity",
        "failure_reason",
    }
    all_features = set(AllocationFeatureEngineer.ALL_FEATURES)

    assert forbidden_leakage_cols.isdisjoint(all_features)
    assert "status" not in all_features


def test_candidate_pair_features_schema(
    sample_donor: Dict[str, Any], sample_veg_donation: Dict[str, Any]
) -> None:
    """Verify single-pair inference feature extraction produces expected schema and types."""
    fe = AllocationFeatureEngineer()
    ngo = {
        "ngo_id": "N001",
        "ngo_type": "orphanage",
        "lat": 28.6200,
        "lon": 77.2150,
        "receiving_capacity_meals": 100,
        "base_daily_meals": 80,
        "accepts_nonveg": False,
        "open_from_hour": 9,
        "open_until_hour": 22,
    }
    rule = {"food_category": "cooked_veg", "is_perishable": True, "safe_hours": 4, "is_nonveg": False}

    feat_df = fe.build_candidate_pair_features(
        donation=sample_veg_donation,
        donor=sample_donor,
        ngo=ngo,
        food_rule=rule,
        recommended_quantity=35.0,
    )

    assert isinstance(feat_df, pd.DataFrame)
    assert len(feat_df) == 1
    for col in AllocationFeatureEngineer.ALL_FEATURES:
        assert col in feat_df.columns, f"Missing feature column: {col}"


def test_chronological_split_strict_cutoff() -> None:
    """Verify chronological split strictly enforces max(train) < min(test)."""
    dates = pd.date_range("2026-01-01", periods=100, freq="D")
    df = pd.DataFrame(
        {
            "created_at": dates,
            "status": ["delivered"] * 100,
            "is_delivered": [1] * 100,
        }
    )

    train_df, test_df = chronological_split_allocations(df, test_days=20)

    train_max = pd.DatetimeIndex(train_df["created_at"]).max()
    test_min = pd.DatetimeIndex(test_df["created_at"]).min()

    assert train_max < test_min
    assert len(train_df) == 80
    assert len(test_df) == 20


def test_recommendation_contract_schema(
    matching_engine: MatchingEngine,
    sample_donor: Dict[str, Any],
    sample_veg_donation: Dict[str, Any],
) -> None:
    """Verify matching engine output matches the schema in model_b_contract.md."""
    res = matching_engine.recommend_ngos(
        donation=sample_veg_donation, donor=sample_donor, top_k=3
    )

    assert "donation_id" in res
    assert "quantity_meals" in res
    assert "food_category" in res
    assert "total_candidates_evaluated" in res
    assert "eligible_candidates_count" in res
    assert "recommendations" in res
    assert "disclaimer" in res
    assert "Synthetic-data experiment" in res["disclaimer"]

    recs = res["recommendations"]
    assert len(recs) <= 3
    assert len(recs) > 0

    first = recs[0]
    expected_rec_keys = {
        "ngo_id",
        "ngo_type",
        "match_score",
        "success_probability",
        "distance_km",
        "travel_minutes",
        "recommended_quantity",
        "capacity_utilization",
        "receiving_capacity_meals",
        "base_daily_meals",
        "reason_codes",
        "disclaimer",
    }
    assert expected_rec_keys.issubset(set(first.keys()))
    assert isinstance(first["match_score"], float)
    assert 0.0 <= first["success_probability"] <= 1.0
    assert isinstance(first["reason_codes"], list)
    assert len(first["reason_codes"]) > 0


def test_dietary_hard_constraint_enforcement(
    matching_engine: MatchingEngine,
    sample_donor: Dict[str, Any],
    sample_nonveg_donation: Dict[str, Any],
) -> None:
    """Verify that non-veg donations are never assigned to NGOs that reject non-veg."""
    res = matching_engine.recommend_ngos(
        donation=sample_nonveg_donation, donor=sample_donor, top_k=10
    )

    recs = res["recommendations"]
    assert len(recs) > 0

    # Look up each recommended NGO in matching_engine.ngos_df
    ngos_map = matching_engine.ngos_df.set_index("ngo_id")["accepts_nonveg"].to_dict()

    for cand in recs:
        ngo_id = cand["ngo_id"]
        assert ngos_map.get(ngo_id) is True, f"NGO {ngo_id} rejects non-veg but was recommended!"


def test_capacity_hard_constraint_enforcement(
    matching_engine: MatchingEngine,
    sample_donor: Dict[str, Any],
) -> None:
    """Verify that donations exceeding 150% of an NGO's capacity are excluded."""
    huge_donation = {
        "donation_id": "DON_HUGE",
        "food_category": "cooked_veg",
        "quantity_meals": 10000,  # Far exceeds all normal NGO capacities
        "created_at": "2026-10-25 14:00:00",
        "prepared_at": "2026-10-25 12:00:00",
        "pickup_deadline": "2026-10-25 17:00:00",
    }

    res = matching_engine.recommend_ngos(donation=huge_donation, donor=sample_donor)
    assert res["eligible_candidates_count"] == 0
    assert len(res["recommendations"]) == 0
    assert "EXCEEDS_MAX_CAPACITY_LIMIT" in res["ineligible_breakdown"]


def test_ranking_order_descending(
    matching_engine: MatchingEngine,
    sample_donor: Dict[str, Any],
    sample_veg_donation: Dict[str, Any],
) -> None:
    """Verify candidates are strictly returned in descending order of match_score."""
    res = matching_engine.recommend_ngos(
        donation=sample_veg_donation, donor=sample_donor, top_k=5
    )
    scores = [c["match_score"] for c in res["recommendations"]]

    for i in range(len(scores) - 1):
        assert scores[i] >= scores[i + 1], "Candidates must be ordered by match_score descending"


def test_empty_ngo_directory_fallback(
    sample_donor: Dict[str, Any], sample_veg_donation: Dict[str, Any]
) -> None:
    """Verify engine handles empty NGO dataframe gracefully without raising exceptions."""
    empty_engine = MatchingEngine(ngos_df=pd.DataFrame())
    res = empty_engine.recommend_ngos(
        donation=sample_veg_donation, donor=sample_donor, top_k=5
    )

    assert res["total_candidates_evaluated"] == 0
    assert res["eligible_candidates_count"] == 0
    assert res["recommendations"] == []
