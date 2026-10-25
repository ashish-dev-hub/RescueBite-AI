
import ast
import math
import pandas as pd

orders = pd.read_csv("foodgo-orders.csv")
volunteers = pd.read_csv("foodgo-volunteers.csv")


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


def distance_km(lat1, lon1, lat2, lon2):
    radius = 6371

    lat1, lon1, lat2, lon2 = map(
        math.radians,
        [lat1, lon1, lat2, lon2]
    )

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2)
        * math.sin(dlon / 2) ** 2
    )

    a = min(1.0, max(0.0, a))

    return radius * 2 * math.atan2(
        math.sqrt(a), math.sqrt(1 - a)
    )


orders["Perishable"] = (
    orders["Perishable"]
    .astype(str)
    .str.strip()
    .str.lower()
    .map({
        "true": True,
        "false": False,
        "1": True,
        "0": False
    })
)

for column in ["P-ET", "P-LT", "D-ET", "D-LT"]:
    orders[column + "-Minutes"] = orders[column].apply(to_minutes)

volunteer_state = {}

for _, row in volunteers.iterrows():
    volunteer_id = str(row["VolunteerID"])

    volunteer_state[volunteer_id] = {
        "capacity": float(row["Capacity"]),
        "lat": float(row["S-Lat"]),
        "lon": float(row["S-Lon"]),
        "time": 0,
        "availability": parse_availability(row["Availability"])
    }

orders = orders.sort_values(
    ["P-LT-Minutes", "Perishable", "P-ET-Minutes"],
    ascending=[True, False, True]
)

diagnostics = []
speed_kmh = 30
pickup_service_minutes = 10

for _, order in orders.iterrows():
    pickup_lat = float(order["P-Lat"])
    pickup_lon = float(order["P-Lon"])
    delivery_lat = float(order["D-Lat"])
    delivery_lon = float(order["D-Lon"])
    quantity = float(order["Quantity"])

    pickup_earliest = order["P-ET-Minutes"]
    pickup_deadline = order["P-LT-Minutes"]
    delivery_earliest = order["D-ET-Minutes"]
    delivery_deadline = order["D-LT-Minutes"]

    capacity_candidates = 0
    pickup_candidates = 0
    delivery_candidates = 0
    availability_candidates = 0

    best_candidate = None

    delivery_distance = distance_km(
        pickup_lat, pickup_lon,
        delivery_lat, delivery_lon
    )

    delivery_travel = delivery_distance / speed_kmh * 60

    for volunteer_id, volunteer in volunteer_state.items():
        if volunteer["capacity"] < quantity:
            continue

        capacity_candidates += 1

        pickup_distance = distance_km(
            volunteer["lat"], volunteer["lon"],
            pickup_lat, pickup_lon
        )

        pickup_travel = pickup_distance / speed_kmh * 60

        for interval_start, interval_end in volunteer["availability"]:
            departure_time = max(
                volunteer["time"], interval_start
            )

            if departure_time > interval_end:
                continue

            arrival_pickup = departure_time + pickup_travel
            pickup_time = max(arrival_pickup, pickup_earliest)

            if pickup_time > pickup_deadline:
                continue

            pickup_candidates += 1

            delivery_arrival = (
                pickup_time
                + pickup_service_minutes
                + delivery_travel
            )

            delivery_time = max(
                delivery_arrival, delivery_earliest
            )

            if delivery_time > delivery_deadline:
                continue

            delivery_candidates += 1

            if delivery_time > interval_end:
                continue

            availability_candidates += 1

            route_distance = pickup_distance + delivery_distance

            candidate = {
                "VolunteerID": volunteer_id,
                "RouteDistanceKM": route_distance,
                "PickupTime": pickup_time,
                "DeliveryTime": delivery_time
            }

            if (
                best_candidate is None
                or route_distance < best_candidate["RouteDistanceKM"]
            ):
                best_candidate = candidate

    if best_candidate is None:
        if capacity_candidates == 0:
            reason = "Capacity constraint"
        elif pickup_candidates == 0:
            reason = "Pickup deadline constraint"
        elif delivery_candidates == 0:
            reason = "Delivery deadline constraint"
        elif availability_candidates == 0:
            reason = "Volunteer availability constraint"
        else:
            reason = "Other constraint"

        diagnostics.append({
            "RequestID": order["RequestID"],
            "Perishable": order["Perishable"],
            "Quantity": quantity,
            "CapacityCandidates": capacity_candidates,
            "PickupCandidates": pickup_candidates,
            "DeliveryCandidates": delivery_candidates,
            "AvailabilityCandidates": availability_candidates,
            "Diagnostic": reason
        })

        continue

    volunteer_id = best_candidate["VolunteerID"]
    volunteer = volunteer_state[volunteer_id]

    volunteer["time"] = best_candidate["DeliveryTime"]
    volunteer["lat"] = delivery_lat
    volunteer["lon"] = delivery_lon

diagnostics_df = pd.DataFrame(diagnostics)

diagnostics_df.to_csv(
    "rescuebite_constraint_diagnostics.csv",
    index=False
)

print("CONSTRAINT DIAGNOSTICS")
print("----------------------")
print("Unassigned requests:", len(diagnostics_df))

if len(diagnostics_df) > 0:
    print("\nFirst failed constraint:")
    print(
        diagnostics_df["Diagnostic"]
        .value_counts()
        .to_string()
    )

    print("\nCandidate counts across unassigned requests:")
    print(
        diagnostics_df[
            [
                "CapacityCandidates",
                "PickupCandidates",
                "DeliveryCandidates",
                "AvailabilityCandidates"
            ]
        ].describe().round(2).to_string()
    )

    print("\nSample unassigned requests:")
    print(diagnostics_df.head(15).to_string(index=False))
else:
    print("No unassigned requests found.")

print("\nSaved: rescuebite_constraint_diagnostics.csv")
