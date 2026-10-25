
import ast
import pandas as pd

volunteers = pd.read_csv("foodgo-volunteers.csv")
results = pd.read_csv("rescuebite_edf_assignments.csv")


def to_minutes(value):
    if pd.isna(value):
        return None
    value = int(float(value))
    return (value // 100) * 60 + value % 100


def parse_availability(value):
    try:
        intervals = ast.literal_eval(str(value))
        return [
            (to_minutes(start), to_minutes(end))
            for start, end in intervals
        ]
    except (ValueError, SyntaxError, TypeError):
        return []


volunteers["VolunteerID"] = volunteers["VolunteerID"].astype(str)
results["VolunteerID"] = results["VolunteerID"].astype(str)

volunteers["Intervals"] = volunteers["Availability"].apply(
    parse_availability
)

assigned = results[
    results["VolunteerID"] != "Unassigned"
].copy()

assigned["DeliveryTime"] = pd.to_numeric(
    assigned["DeliveryTime"], errors="coerce"
)

workload = (
    assigned.groupby("VolunteerID")
    .agg(
        AssignedOrders=("RequestID", "count"),
        LastDelivery=("DeliveryTime", "max"),
        TotalRouteKM=("RouteDistanceKM", "sum")
    )
    .reset_index()
)

report = volunteers[
    ["VolunteerID", "Capacity", "Availability", "Intervals"]
].merge(
    workload,
    on="VolunteerID",
    how="left"
)

report["AssignedOrders"] = report["AssignedOrders"].fillna(0).astype(int)
report["TotalRouteKM"] = report["TotalRouteKM"].fillna(0)

report["ShiftEnd"] = report["Intervals"].apply(
    lambda intervals: max(
        (end for start, end in intervals if end is not None),
        default=None
    )
)

report["LastDelivery"] = report["LastDelivery"].fillna(-1)

report["MinutesRemaining"] = report.apply(
    lambda row: (
        row["ShiftEnd"] - row["LastDelivery"]
        if row["LastDelivery"] >= 0 and row["ShiftEnd"] is not None
        else None
    ),
    axis=1
)

print("VOLUNTEER SCHEDULE INSPECTION")
print("-----------------------------")
print("Total volunteers:", len(report))
print("Volunteers with assigned orders:", (report["AssignedOrders"] > 0).sum())
print("Volunteers without assigned orders:", (report["AssignedOrders"] == 0).sum())

print("\nWorkload summary:")
print(report["AssignedOrders"].describe().round(2).to_string())

print("\nVolunteers with the most assigned orders:")
print(
    report.sort_values("AssignedOrders", ascending=False)
    [[
        "VolunteerID",
        "Capacity",
        "Availability",
        "AssignedOrders",
        "LastDelivery",
        "ShiftEnd",
        "MinutesRemaining"
    ]]
    .head(15)
    .to_string(index=False)
)

report.to_csv("rescuebite_schedule_inspection.csv", index=False)

print("\nSaved: rescuebite_schedule_inspection.csv")
