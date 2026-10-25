import ast
import pandas as pd

orders = pd.read_csv("foodgo-orders.csv")
volunteers = pd.read_csv("foodgo-volunteers.csv")
results = pd.read_csv("rescuebite_balanced_assignments.csv")

def to_minutes(value):
    if pd.isna(value):
        return None
    value = int(float(value))
    return (value // 100) * 60 + value % 100

def parse_availability(value):
    try:
        return [
            (to_minutes(start), to_minutes(end))
            for start, end in ast.literal_eval(str(value))
        ]
    except (ValueError, SyntaxError, TypeError):
        return []

unassigned_ids = set(
    results.loc[
        results["VolunteerID"].astype(str) == "Unassigned",
        "RequestID"
    ]
)

unassigned = orders[orders["RequestID"].isin(unassigned_ids)].copy()

for column in ["P-ET", "P-LT", "D-ET", "D-LT"]:
    unassigned[column] = unassigned[column].apply(to_minutes)

volunteers["Intervals"] = volunteers["Availability"].apply(parse_availability)

diagnostics = []

for _, order in unassigned.iterrows():
    capacity_candidates = 0
    pickup_window_candidates = 0
    availability_candidates = 0

    for _, volunteer in volunteers.iterrows():
        if float(volunteer["Capacity"]) < float(order["Quantity"]):
            continue

        capacity_candidates += 1

        pickup_distance = (
            ((float(volunteer["S-Lat"]) - float(order["P-Lat"])) ** 2
             + (float(volunteer["S-Lon"]) - float(order["P-Lon"])) ** 2) ** 0.5
        ) * 111

        estimated_arrival = pickup_distance / 30 * 60

        if estimated_arrival > order["P-LT"]:
            continue

        pickup_window_candidates += 1

        for start, end in volunteer["Intervals"]:
            if start is None or end is None:
                continue

            arrival = max(start + estimated_arrival, order["P-ET"])

            if arrival <= order["P-LT"] and arrival <= end:
                availability_candidates += 1
                break

    if capacity_candidates == 0:
        reason = "No volunteer with enough capacity"
    elif pickup_window_candidates == 0:
        reason = "Pickup deadline likely difficult"
    elif availability_candidates == 0:
        reason = "Availability and pickup timing conflict"
    else:
        reason = "Pickup candidate exists; check delivery feasibility"

    diagnostics.append({
        "RequestID": order["RequestID"],
        "Quantity": order["Quantity"],
        "Perishable": order["Perishable"],
        "CapacityCandidates": capacity_candidates,
        "PickupCandidates": pickup_window_candidates,
        "AvailabilityCandidates": availability_candidates,
        "Diagnostic": reason
    })

diagnostics_df = pd.DataFrame(diagnostics)
diagnostics_df.to_csv("rescuebite_failure_diagnostics.csv", index=False)

print("Unassigned requests analysed:", len(diagnostics_df))
print("\nDiagnostic summary:")
print(diagnostics_df["Diagnostic"].value_counts().to_string())

print("\nSample diagnostic rows:")
print(diagnostics_df.head(15).to_string(index=False))

print("\nSaved: rescuebite_failure_diagnostics.csv")