"""Feature engineering pipeline for RescueBite AI Model B (Allocation & Matching).

Extracts leak-free pre-allocation features combining donor profiles, NGO capacities,
food safety rules, and logistics distance metrics.
"""

from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np
import pandas as pd


def calculate_haversine_distance_km(
    lat1: float, lon1: float, lat2: float, lon2: float
) -> float:
    """Calculate great-circle distance between two GPS points using Haversine formula.

    Args:
        lat1: Latitude of point 1.
        lon1: Longitude of point 1.
        lat2: Latitude of point 2.
        lon2: Longitude of point 2.

    Returns:
        Distance in kilometers rounded to 2 decimal places.
    """
    R = 6371.0  # Earth's radius in kilometers
    dlat = np.radians(lat2 - lat1)
    dlon = np.radians(lon2 - lon1)
    a = (
        np.sin(dlat / 2.0) ** 2
        + np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dlon / 2.0) ** 2
    )
    c = 2.0 * np.arctan2(np.sqrt(a), np.sqrt(1.0 - a))
    return round(float(R * c), 2)


class AllocationFeatureEngineer:
    """Extracts features for food allocation feasibility and delivery success prediction."""

    CATEGORICAL_FEATURES: List[str] = ["donor_type", "ngo_type", "food_category"]

    NUMERIC_FEATURES: List[str] = [
        "distance_km",
        "travel_minutes",
        "quantity_meals",
        "recommended_quantity",
        "receiving_capacity_meals",
        "base_daily_meals",
        "capacity_utilization",
        "demand_coverage_ratio",
        "hours_until_deadline",
        "hours_since_prepared",
        "urgency_ratio",
        "safe_hours",
        "open_hours_span",
        "donor_reliability",
        "donor_avg_surplus",
        "is_dietary_compatible",
        "is_perishable",
        "is_nonveg",
        "accepts_nonveg",
        "created_hour",
        "created_weekday",
        "is_weekend",
    ]

    ALL_FEATURES: List[str] = CATEGORICAL_FEATURES + NUMERIC_FEATURES

    def __init__(self) -> None:
        pass

    def build_training_features(
        self,
        df_allocations: pd.DataFrame,
        df_donations: pd.DataFrame,
        df_donors: pd.DataFrame,
        df_ngos: pd.DataFrame,
        df_food_rules: pd.DataFrame,
    ) -> pd.DataFrame:
        """Merge historical allocation datasets and extract leak-free feature matrix.

        Strict Leakage Exclusion:
        Excludes post-event columns ('remaining_quantity', 'approved_quantity', 'failure_reason').

        Args:
            df_allocations: Historical allocation records.
            df_donations: Donation master records.
            df_donors: Donor directory records.
            df_ngos: Recipient NGO directory records.
            df_food_rules: Food category safety constraints.

        Returns:
            Engineered DataFrame with features and target 'is_delivered'.
        """
        # Strict pre-allocation column selection
        safe_alloc_cols = [
            "allocation_id",
            "donation_id",
            "ngo_id",
            "recommended_quantity",
            "distance_km",
            "travel_minutes",
            "status",
        ]
        df_a = pd.DataFrame(df_allocations[safe_alloc_cols].copy())

        safe_don_cols = [
            "donation_id",
            "donor_id",
            "created_at",
            "prepared_at",
            "pickup_deadline",
            "food_category",
            "quantity_meals",
        ]
        df_d = pd.DataFrame(df_donations[safe_don_cols].copy())

        # Join datasets
        merged = df_a.merge(df_d, on="donation_id", how="left")
        donor_subset = pd.DataFrame(
            df_donors[["donor_id", "donor_type", "avg_surplus_meals", "reliability"]]
        ).rename(
            columns={
                "avg_surplus_meals": "donor_avg_surplus",
                "reliability": "donor_reliability",
            }
        )
        merged = merged.merge(donor_subset, on="donor_id", how="left")
        merged = merged.merge(
            df_ngos[
                [
                    "ngo_id",
                    "ngo_type",
                    "base_daily_meals",
                    "receiving_capacity_meals",
                    "accepts_nonveg",
                    "open_from_hour",
                    "open_until_hour",
                ]
            ],
            on="ngo_id",
            how="left",
        )
        merged = merged.merge(
            df_food_rules[["food_category", "is_perishable", "safe_hours", "is_nonveg"]],
            on="food_category",
            how="left",
        )

        # Datetime calculations using DatetimeIndex
        created_idx = pd.DatetimeIndex(merged["created_at"])
        prepared_idx = pd.DatetimeIndex(merged["prepared_at"])
        deadline_idx = pd.DatetimeIndex(merged["pickup_deadline"])

        merged["hours_until_deadline"] = (
            (deadline_idx - created_idx).total_seconds() / 3600.0
        )
        merged["hours_since_prepared"] = (
            (created_idx - prepared_idx).total_seconds() / 3600.0
        )
        merged["urgency_ratio"] = merged["travel_minutes"] / (
            merged["hours_until_deadline"] * 60.0
        ).clip(lower=1.0)

        # Capacities and ratios
        merged["capacity_utilization"] = (
            merged["recommended_quantity"]
            / merged["receiving_capacity_meals"].clip(lower=1.0)
        )
        merged["demand_coverage_ratio"] = (
            merged["recommended_quantity"] / merged["base_daily_meals"].clip(lower=1.0)
        )
        merged["open_hours_span"] = (
            merged["open_until_hour"] - merged["open_from_hour"]
        )

        # Dietary and type indicators
        merged["is_dietary_compatible"] = (
            merged["accepts_nonveg"].astype(int) >= merged["is_nonveg"].astype(int)
        ).astype(int)
        merged["is_perishable"] = merged["is_perishable"].astype(int)
        merged["is_nonveg"] = merged["is_nonveg"].astype(int)
        merged["accepts_nonveg"] = merged["accepts_nonveg"].astype(int)

        # Calendar features
        merged["created_hour"] = created_idx.hour
        merged["created_weekday"] = created_idx.weekday
        merged["is_weekend"] = (merged["created_weekday"] >= 5).astype(int)

        # Target label
        merged["is_delivered"] = (merged["status"] == "delivered").astype(int)

        return merged

    def build_candidate_pair_features(
        self,
        donation: Dict[str, Any],
        donor: Dict[str, Any],
        ngo: Dict[str, Any],
        food_rule: Dict[str, Any],
        recommended_quantity: Optional[float] = None,
    ) -> pd.DataFrame:
        """Extract a single-row feature vector for an ad-hoc (donation, NGO) candidate pair.

        Used at inference time by the matching engine.

        Args:
            donation: Donation details dictionary.
            donor: Donor profile dictionary.
            ngo: NGO profile dictionary.
            food_rule: Food category safety constraints.
            recommended_quantity: Proposed meal quantity to allocate.

        Returns:
            Single-row DataFrame with all engineered Model B features.
        """
        created_ts = pd.to_datetime(donation["created_at"])
        prepared_ts = pd.to_datetime(donation["prepared_at"])
        deadline_ts = pd.to_datetime(donation["pickup_deadline"])

        hours_until_deadline = max(
            0.1, (deadline_ts - created_ts).total_seconds() / 3600.0
        )
        hours_since_prepared = max(
            0.0, (created_ts - prepared_ts).total_seconds() / 3600.0
        )

        # Calculate logistics distance
        lat_d = float(donor.get("lat", 0.0))
        lon_d = float(donor.get("lon", 0.0))
        lat_n = float(ngo.get("lat", 0.0))
        lon_n = float(ngo.get("lon", 0.0))
        distance_km = calculate_haversine_distance_km(lat_d, lon_d, lat_n, lon_n)
        travel_minutes = max(1.0, distance_km * 2.5)  # urban speed estimate ~24 km/h

        # Quantities
        qty_meals = float(donation.get("quantity_meals", 0.0))
        rec_cap = float(ngo.get("receiving_capacity_meals", 100.0))
        base_daily = float(ngo.get("base_daily_meals", 80.0))

        if recommended_quantity is not None:
            rec_qty = recommended_quantity
        else:
            rec_qty = min(qty_meals, rec_cap)

        cap_util = rec_qty / max(1.0, rec_cap)
        cov_ratio = rec_qty / max(1.0, base_daily)
        urg_ratio = travel_minutes / max(1.0, hours_until_deadline * 60.0)

        open_span = float(ngo.get("open_until_hour", 22) - ngo.get("open_from_hour", 8))
        is_nonveg = int(food_rule.get("is_nonveg", False))
        accepts_nonveg = int(ngo.get("accepts_nonveg", True))
        is_dietary_compatible = int(accepts_nonveg >= is_nonveg)

        feature_row = {
            "donor_type": [str(donor.get("donor_type", "restaurant"))],
            "ngo_type": [str(ngo.get("ngo_type", "shelter"))],
            "food_category": [str(donation.get("food_category", "cooked_veg"))],
            "distance_km": [distance_km],
            "travel_minutes": [travel_minutes],
            "quantity_meals": [qty_meals],
            "recommended_quantity": [rec_qty],
            "receiving_capacity_meals": [rec_cap],
            "base_daily_meals": [base_daily],
            "capacity_utilization": [cap_util],
            "demand_coverage_ratio": [cov_ratio],
            "hours_until_deadline": [hours_until_deadline],
            "hours_since_prepared": [hours_since_prepared],
            "urgency_ratio": [urg_ratio],
            "safe_hours": [float(food_rule.get("safe_hours", 4))],
            "open_hours_span": [open_span],
            "donor_reliability": [float(donor.get("reliability", 0.9))],
            "donor_avg_surplus": [float(donor.get("avg_surplus_meals", 50))],
            "is_dietary_compatible": [is_dietary_compatible],
            "is_perishable": [int(food_rule.get("is_perishable", True))],
            "is_nonveg": [is_nonveg],
            "accepts_nonveg": [accepts_nonveg],
            "created_hour": [created_ts.hour],
            "created_weekday": [created_ts.weekday()],
            "is_weekend": [int(created_ts.weekday() >= 5)],
        }

        return pd.DataFrame(feature_row)


def chronological_split_allocations(
    df: pd.DataFrame, test_days: int = 60
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """Split allocation DataFrame chronologically on donation creation timestamp.

    Args:
        df: Merged allocation DataFrame with 'created_at' column.
        test_days: Number of final calendar days for holdout test set (default: 60).

    Returns:
        Tuple of (train_df, test_df) where max(train.created_at) < min(test.created_at).
    """
    df_work = df.copy()
    dates = pd.DatetimeIndex(df_work["created_at"]).normalize()
    max_date = dates.max()
    test_start = max_date - pd.Timedelta(days=test_days - 1)

    train_df = pd.DataFrame(df_work[dates < test_start].copy())
    test_df = pd.DataFrame(df_work[dates >= test_start].copy())

    if len(train_df) == 0 or len(test_df) == 0:
        raise ValueError("Chronological split produced empty train or test partition.")

    return train_df, test_df
