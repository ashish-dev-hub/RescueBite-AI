"""Multi-candidate matching and recommendation engine for RescueBite AI Model B.

Filters candidate NGOs against hard operational and safety constraints, predicts delivery
feasibility with the pre-allocation Random Forest classifier, and ranks eligible recipients
using a composite score with explainable reason codes.
"""

from pathlib import Path
import sys
from typing import Any, Dict, List, Optional, Tuple, Union

import joblib
import numpy as np
import pandas as pd
from sklearn.pipeline import Pipeline

try:
    from .matching_features import (
        AllocationFeatureEngineer,
        calculate_haversine_distance_km,
    )
except ImportError:
    _src_dir = Path(__file__).resolve().parent.parent
    if str(_src_dir) not in sys.path:
        sys.path.insert(0, str(_src_dir))
    from rescuebite_ml.matching_features import (
        AllocationFeatureEngineer,
        calculate_haversine_distance_km,
    )

UnionPath = Union[str, Path]


def _find_repo_root() -> Path:
    current = Path(__file__).resolve().parent
    for _ in range(5):
        if (current / "dataset").exists() or (current / ".git").exists():
            return current
        current = current.parent
    return Path(__file__).resolve().parent.parent.parent.parent


class MatchingEngine:
    """Smart redistribution engine pairing active food donations with recipient NGOs."""

    SYNTHETIC_DATA_DISCLAIMER: str = (
        "Synthetic-data experiment for operational redistribution planning only."
    )

    def __init__(
        self,
        model: Optional[Pipeline] = None,
        model_path: Optional[UnionPath] = None,
        ngos_df: Optional[pd.DataFrame] = None,
        ngos_path: Optional[UnionPath] = None,
        food_rules_df: Optional[pd.DataFrame] = None,
        food_rules_path: Optional[UnionPath] = None,
    ) -> None:
        """Initialize MatchingEngine with trained model, NGO directory, and food rules.

        Args:
            model: Optional pre-loaded scikit-learn Pipeline.
            model_path: Path to serialized model .joblib.
            ngos_df: Optional pre-loaded NGO DataFrame.
            ngos_path: Path to ngos.csv.
            food_rules_df: Optional pre-loaded food rules DataFrame.
            food_rules_path: Path to food_rules.csv.
        """
        repo_root = _find_repo_root()
        self.feature_engineer = AllocationFeatureEngineer()

        # 1. Load Trained Model Pipeline
        if model is not None:
            self.model: Optional[Pipeline] = model
        else:
            p_model = (
                Path(model_path).resolve()
                if model_path
                else repo_root / "ml" / "models" / "model_b_matching.joblib"
            )
            if p_model.exists():
                self.model = joblib.load(p_model)
            else:
                self.model = None

        # 2. Load NGOs Directory
        if ngos_df is not None:
            self.ngos_df = ngos_df.copy()
        else:
            p_ngos = (
                Path(ngos_path).resolve()
                if ngos_path
                else repo_root / "dataset" / "ngos.csv"
            )
            if p_ngos.exists():
                self.ngos_df = pd.read_csv(p_ngos)
            else:
                self.ngos_df = pd.DataFrame()

        # 3. Load Food Safety Rules
        if food_rules_df is not None:
            self.food_rules_df = food_rules_df.copy()
        else:
            p_rules = (
                Path(food_rules_path).resolve()
                if food_rules_path
                else repo_root / "dataset" / "food_rules.csv"
            )
            if p_rules.exists():
                self.food_rules_df = pd.read_csv(p_rules)
            else:
                self.food_rules_df = pd.DataFrame()

        # Cache food rules as lookup dict
        self._food_rules_map: Dict[str, Dict[str, Any]] = {}
        if not self.food_rules_df.empty:
            for _, r in self.food_rules_df.iterrows():
                self._food_rules_map[str(r["food_category"])] = {
                    "is_perishable": bool(r.get("is_perishable", True)),
                    "safe_hours": float(r.get("safe_hours", 4.0)),
                    "is_nonveg": bool(r.get("is_nonveg", False)),
                }

    def get_food_rule(self, food_category: str) -> Dict[str, Any]:
        """Retrieve food safety rule parameters for a category with safe fallbacks."""
        if food_category in self._food_rules_map:
            return self._food_rules_map[food_category]
        # Heuristic fallback for unknown category
        is_nv = "nonveg" in food_category.lower() or "meat" in food_category.lower()
        return {
            "is_perishable": True,
            "safe_hours": 3.0 if is_nv else 4.0,
            "is_nonveg": is_nv,
        }

    def check_eligibility(
        self,
        donation: Dict[str, Any],
        donor: Dict[str, Any],
        ngo: Dict[str, Any],
    ) -> Tuple[bool, List[str]]:
        """Evaluate hard operational constraints for a candidate (donation, NGO) pair.

        Constraints Evaluated:
        1. Dietary Compliance: If food is non-veg, NGO must accept non-veg.
        2. Receiving Capacity: Donation quantity must not exceed 150% of capacity.
        3. Food Safety & Travel Time: Travel time must not exceed safe hours.
        4. Operating Hours: NGO must be operational around the donation timeframe.

        Args:
            donation: Active donation payload.
            donor: Donor profile details.
            ngo: Candidate recipient NGO profile.

        Returns:
            Tuple of (is_eligible, list_of_ineligibility_reasons).
        """
        ineligibility_reasons: List[str] = []
        food_category = str(donation.get("food_category", "cooked_veg"))
        food_rule = self.get_food_rule(food_category)

        # 1. Dietary Compliance Check
        is_food_nonveg = bool(food_rule.get("is_nonveg", False))
        ngo_accepts_nonveg = bool(ngo.get("accepts_nonveg", True))
        if is_food_nonveg and not ngo_accepts_nonveg:
            ineligibility_reasons.append("DIETARY_INCOMPATIBLE_NONVEG")

        # 2. Receiving Capacity Check
        qty_meals = float(donation.get("quantity_meals", 0.0))
        rec_capacity = float(ngo.get("receiving_capacity_meals", 0.0))
        if rec_capacity <= 0.0:
            ineligibility_reasons.append("ZERO_RECEIVING_CAPACITY")
        elif qty_meals > rec_capacity * 1.5:
            ineligibility_reasons.append("EXCEEDS_MAX_CAPACITY_LIMIT")

        # 3. Distance & Safe Hours Check
        lat_d = float(donor.get("lat", 0.0))
        lon_d = float(donor.get("lon", 0.0))
        lat_n = float(ngo.get("lat", 0.0))
        lon_n = float(ngo.get("lon", 0.0))
        distance_km = calculate_haversine_distance_km(lat_d, lon_d, lat_n, lon_n)
        travel_hours = (distance_km * 2.5) / 60.0  # approximate 24 km/h urban speed

        safe_hours = float(food_rule.get("safe_hours", 4.0))
        if travel_hours > safe_hours:
            ineligibility_reasons.append("EXCEEDS_FOOD_SAFE_HOURS")

        # 4. Operating Hours Check
        created_str = str(donation.get("created_at", ""))
        if created_str:
            try:
                created_ts = pd.to_datetime(created_str)
                c_hour = created_ts.hour
                open_from = int(ngo.get("open_from_hour", 8))
                open_until = int(ngo.get("open_until_hour", 22))
                # NGO is completely closed for the night
                if c_hour < open_from - 3 or c_hour > open_until + 1:
                    ineligibility_reasons.append("OUTSIDE_OPERATING_HOURS")
            except Exception:
                pass

        is_eligible = len(ineligibility_reasons) == 0
        return is_eligible, ineligibility_reasons

    def score_candidate(
        self,
        donation: Dict[str, Any],
        donor: Dict[str, Any],
        ngo: Dict[str, Any],
        recommended_quantity: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Score an eligible candidate NGO using the trained model and logistics heuristics.

        Args:
            donation: Active donation payload.
            donor: Donor profile details.
            ngo: Recipient NGO details.
            recommended_quantity: Suggested meals to allocate (defaults to min(qty, cap)).

        Returns:
            Dictionary containing match score, delivery probability, distance, and reason codes.
        """
        food_category = str(donation.get("food_category", "cooked_veg"))
        food_rule = self.get_food_rule(food_category)

        qty_meals = float(donation.get("quantity_meals", 0.0))
        rec_cap = float(ngo.get("receiving_capacity_meals", 100.0))
        base_daily = float(ngo.get("base_daily_meals", 80.0))

        if recommended_quantity is not None:
            rec_qty = recommended_quantity
        else:
            rec_qty = min(qty_meals, rec_cap)

        # Build feature vector
        X_cand = self.feature_engineer.build_candidate_pair_features(
            donation=donation,
            donor=donor,
            ngo=ngo,
            food_rule=food_rule,
            recommended_quantity=rec_qty,
        )

        distance_km = float(X_cand["distance_km"].iloc[0])
        travel_minutes = float(X_cand["travel_minutes"].iloc[0])
        urgency_ratio = float(X_cand["urgency_ratio"].iloc[0])
        cap_util = float(X_cand["capacity_utilization"].iloc[0])

        # 1. Delivery Success Probability from Model
        if self.model is not None:
            try:
                prob_delivered = float(
                    self.model.predict_proba(X_cand[AllocationFeatureEngineer.ALL_FEATURES])[
                        0, 1
                    ]
                )
            except Exception:
                prob_delivered = 0.76  # Fallback to historical prior
        else:
            # Distance and urgency heuristic when model unpickled/unavailable
            prob_delivered = max(0.50, min(0.92, 0.88 - (distance_km * 0.02) - (urgency_ratio * 0.15)))

        # 2. Multi-factor Composite Match Score (Scale: 0 to 100)
        # Component A: Model Delivery Success Probability (Weight: 40%)
        prob_comp = prob_delivered * 40.0

        # Component B: Proximity / Transit Efficiency (Weight: 25%)
        # Full points at 0 km, tapering to 0 points at >= 25 km
        prox_comp = max(0.0, 1.0 - (distance_km / 25.0)) * 25.0

        # Component C: Capacity Fit (Weight: 20%)
        # Ideal fit when rec_qty matches 30%-80% of NGO capacity
        if cap_util <= 1.0:
            cap_fit_norm = 1.0 - abs(cap_util - 0.5) * 0.8
        else:
            cap_fit_norm = max(0.0, 1.5 - cap_util)
        cap_comp = max(0.0, min(1.0, cap_fit_norm)) * 20.0

        # Component D: Urgency & Safety Buffer (Weight: 15%)
        urg_buffer_norm = max(0.0, 1.0 - min(1.0, urgency_ratio))
        urg_comp = urg_buffer_norm * 15.0

        composite_score = round(prob_comp + prox_comp + cap_comp + urg_comp, 1)
        composite_score = max(5.0, min(99.0, composite_score))

        # 3. Explainable Reason Codes
        reason_codes: List[str] = []
        if prob_delivered >= 0.70:
            reason_codes.append("HIGH_DELIVERY_SUCCESS")
        if distance_km <= 5.0:
            reason_codes.append("NEARBY_LOCATION")
        elif distance_km >= 12.0:
            reason_codes.append("EXTENDED_TRANSIT_DISTANCE")

        if bool(food_rule.get("is_nonveg", False)):
            reason_codes.append("DIETARY_VERIFIED_NONVEG")
        else:
            reason_codes.append("DIETARY_COMPATIBLE_VEG")

        if cap_util <= 0.85:
            reason_codes.append("ADEQUATE_RECEIVING_CAPACITY")
        elif cap_util > 1.0:
            reason_codes.append("HIGH_CAPACITY_UTILIZATION_WARNING")

        if urgency_ratio <= 0.25:
            reason_codes.append("COMFORTABLE_PICKUP_WINDOW")
        elif urgency_ratio >= 0.60:
            reason_codes.append("URGENT_PICKUP_REQUIRED")

        ngo_type = str(ngo.get("ngo_type", ""))
        if ngo_type:
            reason_codes.append(f"BENEFICIARY_FACILITY_{ngo_type.upper()}")

        return {
            "ngo_id": str(ngo.get("ngo_id", "UNKNOWN")),
            "ngo_type": ngo_type,
            "match_score": composite_score,
            "success_probability": round(prob_delivered, 4),
            "distance_km": round(distance_km, 2),
            "travel_minutes": round(travel_minutes, 1),
            "recommended_quantity": round(rec_qty, 1),
            "capacity_utilization": round(cap_util, 3),
            "receiving_capacity_meals": rec_cap,
            "base_daily_meals": base_daily,
            "reason_codes": reason_codes,
            "disclaimer": self.SYNTHETIC_DATA_DISCLAIMER,
        }

    def recommend_ngos(
        self,
        donation: Dict[str, Any],
        donor: Dict[str, Any],
        top_k: int = 5,
        min_score: float = 0.0,
    ) -> Dict[str, Any]:
        """Rank all eligible NGOs for an active donation and produce structured recommendations.

        Complies strictly with the Model B Output Contract schema.

        Args:
            donation: Active donation payload (must include 'donation_id', 'quantity_meals', 'food_category').
            donor: Donor profile dictionary (must include 'lat', 'lon', 'donor_type').
            top_k: Maximum number of ranked recommendations to return (default: 5).
            min_score: Minimum match score threshold for inclusion.

        Returns:
            Structured recommendation dictionary.
        """
        donation_id = str(donation.get("donation_id", "UNKNOWN"))
        qty_meals = float(donation.get("quantity_meals", 0.0))
        food_category = str(donation.get("food_category", "cooked_veg"))

        if self.ngos_df.empty:
            return {
                "donation_id": donation_id,
                "quantity_meals": qty_meals,
                "food_category": food_category,
                "total_candidates_evaluated": 0,
                "eligible_candidates_count": 0,
                "recommendations": [],
                "disclaimer": self.SYNTHETIC_DATA_DISCLAIMER,
            }

        candidates: List[Dict[str, Any]] = []
        ineligible_counts: Dict[str, int] = {}
        total_evaluated = 0

        for _, ngo_row in self.ngos_df.iterrows():
            total_evaluated += 1
            ngo_dict = ngo_row.to_dict()

            is_eligible, reasons = self.check_eligibility(donation, donor, ngo_dict)
            if not is_eligible:
                for r in reasons:
                    ineligible_counts[r] = ineligible_counts.get(r, 0) + 1
                continue

            scored_cand = self.score_candidate(donation, donor, ngo_dict)
            if scored_cand["match_score"] >= min_score:
                candidates.append(scored_cand)

        # Sort candidate NGOs by composite match_score descending
        candidates.sort(key=lambda c: c["match_score"], reverse=True)
        top_recommendations = candidates[:top_k]

        return {
            "donation_id": donation_id,
            "quantity_meals": qty_meals,
            "food_category": food_category,
            "total_candidates_evaluated": total_evaluated,
            "eligible_candidates_count": len(candidates),
            "ineligible_breakdown": ineligible_counts,
            "recommendations": top_recommendations,
            "disclaimer": self.SYNTHETIC_DATA_DISCLAIMER,
        }
