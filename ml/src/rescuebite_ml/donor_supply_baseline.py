"""Baseline heuristic forecaster for Model C (Donor Surplus Supply).

Serves as an empirical operational benchmark:
For any (donor_id, weekday) query, predicts the historical average surplus
produced by that donor on that specific day of the week.
"""

from typing import Any, Dict, Optional, Tuple, Union
import numpy as np
import pandas as pd


class SameWeekdayDonorBaseline:
    """Predicts historical donor-weekday surplus mean."""

    def __init__(self) -> None:
        self.lookup_table: Dict[Tuple[str, int], float] = {}
        self.donor_fallback: Dict[str, float] = {}
        self.global_mean: float = 0.0

    def fit(self, train_df: pd.DataFrame) -> "SameWeekdayDonorBaseline":
        """Compute average surplus per (donor_id, weekday) on training panel.

        Args:
            train_df: Training DataFrame containing ['donor_id', 'weekday', 'total_surplus_meals'].

        Returns:
            Fitted baseline instance.
        """
        # Overall global mean
        self.global_mean = float(train_df["total_surplus_meals"].mean())

        # Donor fallback mean
        donor_means = train_df.groupby("donor_id")["total_surplus_meals"].mean().to_dict()
        self.donor_fallback = {str(k): float(v) for k, v in donor_means.items()}

        # Donor x Weekday lookup table
        grouped = (
            train_df.groupby(["donor_id", "weekday"])["total_surplus_meals"]
            .mean()
            .reset_index()
        )
        for _, row in grouped.iterrows():
            key = (str(row["donor_id"]), int(row["weekday"]))
            self.lookup_table[key] = float(row["total_surplus_meals"])

        return self

    def predict(self, df: pd.DataFrame) -> np.ndarray:
        """Generate baseline predictions for panel rows.

        Args:
            df: DataFrame containing ['donor_id', 'weekday'].

        Returns:
            1D array of predicted surplus meal quantities.
        """
        preds = []
        for _, row in df.iterrows():
            donor_id = str(row["donor_id"])
            weekday = int(row["weekday"])
            key = (donor_id, weekday)

            if key in self.lookup_table:
                val = self.lookup_table[key]
            elif donor_id in self.donor_fallback:
                val = self.donor_fallback[donor_id]
            else:
                val = self.global_mean

            preds.append(max(0.0, val))

        return np.array(preds, dtype=float)
