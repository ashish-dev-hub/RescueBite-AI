"""
Model C Data Audit Script
Inspects donations.csv, donors.csv, holidays.csv, and allocations.csv.
Analyzes columns, dtypes, missing values, date ranges, donor-day observation windows,
and distribution of quantity_meals.
"""
from pathlib import Path
import json
import pandas as pd
import numpy as np

DATASET_DIR = Path("dataset")

def run_audit():
    results = {}

    # 1. Inspect donors.csv
    donors_path = DATASET_DIR / "donors.csv"
    donors_df = pd.read_csv(donors_path)
    results["donors"] = {
        "rows": len(donors_df),
        "columns": list(donors_df.columns),
        "dtypes": {col: str(donors_df[col].dtype) for col in donors_df.columns},
        "null_counts": donors_df.isnull().sum().to_dict(),
        "unique_donors": donors_df["donor_id"].nunique(),
        "donor_types": donors_df["donor_type"].value_counts().to_dict() if "donor_type" in donors_df else {},
        "typical_surplus_stats": donors_df["typical_surplus"].describe().to_dict() if "typical_surplus" in donors_df else {},
        "reliability_stats": donors_df["reliability_score"].describe().to_dict() if "reliability_score" in donors_df else {},
        "sample": donors_df.head(3).to_dict(orient="records")
    }

    # 2. Inspect donations.csv
    donations_path = DATASET_DIR / "donations.csv"
    donations_df = pd.read_csv(donations_path)
    
    # Parse dates
    date_cols = [c for c in donations_df.columns if "time" in c.lower() or "date" in c.lower() or "at" in c.lower() or "window" in c.lower()]
    for col in date_cols:
        try:
            donations_df[col + "_dt"] = pd.to_datetime(donations_df[col], errors="coerce")
        except Exception:
            pass

    date_col = "created_at" if "created_at" in donations_df else ("donation_date" if "donation_date" in donations_df else date_cols[0])
    donations_df["calendar_date"] = pd.to_datetime(donations_df[date_col]).dt.date

    results["donations"] = {
        "rows": len(donations_df),
        "columns": list(donations_df.columns),
        "dtypes": {col: str(donations_df[col].dtype) for col in donations_df.columns},
        "null_counts": donations_df.isnull().sum().to_dict(),
        "duplicate_donation_ids": int(donations_df["donation_id"].duplicated().sum()) if "donation_id" in donations_df else 0,
        "unique_donors": donations_df["donor_id"].nunique() if "donor_id" in donations_df else 0,
        "date_column_used": date_col,
        "min_date": str(donations_df["calendar_date"].min()),
        "max_date": str(donations_df["calendar_date"].max()),
        "total_days_span": (donations_df["calendar_date"].max() - donations_df["calendar_date"].min()).days + 1,
        "unique_active_dates": int(donations_df["calendar_date"].nunique()),
        "quantity_meals_stats": donations_df["quantity_meals"].describe(percentiles=[0.05, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99]).to_dict() if "quantity_meals" in donations_df else {},
        "food_categories": donations_df["food_category"].value_counts().to_dict() if "food_category" in donations_df else {},
        "storage_types": donations_df["storage_type"].value_counts().to_dict() if "storage_type" in donations_df else {},
        "is_perishable": donations_df["is_perishable"].value_counts().to_dict() if "is_perishable" in donations_df else {},
        "sample": donations_df.head(2).to_dict(orient="records")
    }

    # 3. Donor-Day Aggregations in donations.csv
    donor_day_agg = donations_df.groupby(["donor_id", "calendar_date"]).agg(
        donations_count=("quantity_meals", "count"),
        total_quantity=("quantity_meals", "sum"),
        mean_quantity=("quantity_meals", "mean"),
        min_quantity=("quantity_meals", "min"),
        max_quantity=("quantity_meals", "max")
    ).reset_index()

    donations_per_donor_day = donor_day_agg["donations_count"].value_counts().to_dict()
    donations_per_donor = donations_df.groupby("donor_id").size().describe().to_dict()

    # Check complete grid (All Donors x All Calendar Dates)
    all_donors = donors_df["donor_id"].unique()
    all_dates = pd.date_range(start=donations_df["calendar_date"].min(), end=donations_df["calendar_date"].max(), freq="D").date
    total_possible_donor_days = len(all_donors) * len(all_dates)
    active_donor_days = len(donor_day_agg)

    results["donor_day_panel"] = {
        "all_known_donors_count": len(all_donors),
        "total_dates_in_span": len(all_dates),
        "total_possible_donor_days": total_possible_donor_days,
        "observed_positive_donor_days": active_donor_days,
        "positive_donor_day_ratio": round(active_donor_days / total_possible_donor_days, 4),
        "donations_count_per_active_day_distribution": donations_per_donor_day,
        "donations_per_donor_stats": donations_per_donor,
        "total_quantity_per_active_donor_day_stats": donor_day_agg["total_quantity"].describe(percentiles=[0.05, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99]).to_dict()
    }

    # 4. Inspect holidays.csv
    holidays_path = DATASET_DIR / "holidays.csv"
    holidays_df = pd.read_csv(holidays_path)
    holidays_df["holiday_date"] = pd.to_datetime(holidays_df["date"]).dt.date
    results["holidays"] = {
        "rows": len(holidays_df),
        "columns": list(holidays_df.columns),
        "dtypes": {col: str(holidays_df[col].dtype) for col in holidays_df.columns},
        "null_counts": holidays_df.isnull().sum().to_dict(),
        "min_holiday": str(holidays_df["holiday_date"].min()),
        "max_holiday": str(holidays_df["holiday_date"].max()),
        "holidays_overlap_with_donations": int(holidays_df["holiday_date"].isin(donations_df["calendar_date"]).sum()),
        "sample": holidays_df.head(3).to_dict(orient="records")
    }

    # 5. Inspect allocations.csv (Context only)
    allocations_path = DATASET_DIR / "allocations.csv"
    alloc_df = pd.read_csv(allocations_path)
    results["allocations"] = {
        "rows": len(alloc_df),
        "columns": list(alloc_df.columns),
        "status_distribution": alloc_df["status"].value_counts().to_dict() if "status" in alloc_df else {},
        "unique_donations_in_allocations": alloc_df["donation_id"].nunique() if "donation_id" in alloc_df else 0,
        "unique_ngos_in_allocations": alloc_df["ngo_id"].nunique() if "ngo_id" in alloc_df else 0
    }

    print(json.dumps(results, indent=2, default=str))

if __name__ == "__main__":
    run_audit()
