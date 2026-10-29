"""
Deeper inspection of donor activity patterns, lifespans, and weekday distributions.
"""
from pathlib import Path
import pandas as pd
import json

donations_path = Path("dataset/donations.csv")
donors_path = Path("dataset/donors.csv")

donations_df = pd.read_csv(donations_path)
donors_df = pd.read_csv(donors_path)

donations_df["created_dt"] = pd.to_datetime(donations_df["created_at"])
donations_df["date"] = donations_df["created_dt"].dt.date
donations_df["day_name"] = donations_df["created_dt"].dt.day_name()

# Donor lifespans: first donation date and last donation date
donor_spans = donations_df.groupby("donor_id")["date"].agg(["min", "max", "nunique", "count"])
# pyrefly: ignore[missing-attribute]
donor_spans["span_days"] = (pd.to_datetime(donor_spans["max"]) - pd.to_datetime(donor_spans["min"])).dt.days + 1
donor_spans["active_fraction"] = donor_spans["nunique"] / donor_spans["span_days"]

print("Donor Lifespan Summary:")
print(f"Min first donation date across all donors: {donor_spans['min'].min()}")
print(f"Max first donation date across all donors: {donor_spans['min'].max()}")
print(f"Min last donation date across all donors: {donor_spans['max'].min()}")
print(f"Max last donation date across all donors: {donor_spans['max'].max()}")
print("All 120 donors started around:", donor_spans['min'].value_counts().head(5).to_dict())
print("All 120 donors ended around:", donor_spans['max'].value_counts().head(5).to_dict())

# Check weekday distribution of donations
weekday_counts = donations_df["day_name"].value_counts().to_dict()
print("Weekday donation distribution:", weekday_counts)

# Check by donor_type
merged = donations_df.merge(donors_df, on="donor_id")
print("Donations by donor_type:")
print(merged.groupby("donor_type")["quantity_meals"].agg(["count", "mean", "median", "std"]).to_dict())

# Aggregated daily target: total_surplus_meals per donor per day
daily_surplus = donations_df.groupby(["donor_id", "date"])["quantity_meals"].sum().reset_index()
print("Daily aggregated surplus stats:")
print(daily_surplus["quantity_meals"].describe(percentiles=[0.05, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99]).to_dict())
