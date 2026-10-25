import ast
import math
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score

orders = pd.read_csv("foodgo-orders.csv")
volunteers = pd.read_csv("foodgo-volunteers.csv")

def to_minutes(value):
    if pd.isna(value):
        return None
    value = int(float(value))
    return (value // 100) * 60 + value % 100

def parse_availability(value):
    if pd.isna(value):
        return []
    try:
        intervals = ast.literal_eval(str(value))
        parsed = []
        for start, end in intervals:
            start_min = to_minutes(start)
            end_min = to_minutes(end)
            if start_min is not None and end_min is not None:
                parsed.append((start_min, end_min))
        return parsed
    except (ValueError, SyntaxError, TypeError):
        return []

def distance_km(lat1, lon1, lat2, lon2):
    radius = 6371
    lat1, lon1, lat2, lon2 = map(
        math.radians, [lat1, lon1, lat2, lon2]
    )
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2)
        * math.sin(dlon / 2) ** 2
    )
    a = min(1.0, max(0.0, a))
    return radius * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

orders["Perishable"] = (
    orders["Perishable"]
    .astype(str)
    .str.strip()
    .str.lower()
    .map({"true": True, "false": False, "1": True, "0": False})
)

if orders["Perishable"].isna().any():
    raise ValueError("Unknown value found in Perishable column.")

time_columns = ["P-ET", "P-LT", "D-ET", "D-LT"]

for column in time_columns:
    orders[column + "-Minutes"] = orders[column].apply(to_minutes)

if orders[[column + "-Minutes" for column in time_columns]].isna().any().any():
    raise ValueError("Some order time windows are missing.")

features = orders[["P-Lat", "P-Lon"]].copy()
scaler = StandardScaler()
X = scaler.fit_transform(features)

scores = {}

for k in range(2, min(9, len(orders))):
    clustering = KMeans(n_clusters=k, random_state=42, n_init=10)
    labels = clustering.fit_predict(X)
    scores[k] = silhouette_score(X, labels)

best_k = max(scores, key=scores.get)
model = KMeans(n_clusters=best_k, random_state=42, n_init=10)
orders["Cluster"] = model.fit_predict(X)

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

results = []
total_distance = 0.0
speed_kmh = 30
pickup_service_minutes = 10

for _, order in orders.iterrows():
    best_candidate = None

    pickup_lat = float(order["P-Lat"])
    pickup_lon = float(order["P-Lon"])
    delivery_lat = float(order["D-Lat"])
    delivery_lon = float(order["D-Lon"])
    quantity = float(order["Quantity"])

    pickup_deadline = order["P-LT-Minutes"]
    pickup_earliest = order["P-ET-Minutes"]
    delivery_earliest = order["D-ET-Minutes"]
    delivery_deadline = order["D-LT-Minutes"]

    delivery_distance = distance_km(
        pickup_lat, pickup_lon, delivery_lat, delivery_lon
    )
    delivery_travel = delivery_distance / speed_kmh * 60

    for volunteer_id, volunteer in volunteer_state.items():
        if volunteer["capacity"] < quantity:
            continue

        pickup_distance = distance_km(
            volunteer["lat"], volunteer["lon"],
            pickup_lat, pickup_lon
        )
        pickup_travel = pickup_distance / speed_kmh * 60

        for interval_start, interval_end in volunteer["availability"]:
            departure_time = max(volunteer["time"], interval_start)

            if departure_time > interval_end:
                continue

            arrival_pickup = departure_time + pickup_travel
            pickup_time = max(arrival_pickup, pickup_earliest)

            if pickup_time > pickup_deadline:
                continue

            delivery_arrival = (
                pickup_time + pickup_service_minutes + delivery_travel
            )
            delivery_time = max(delivery_arrival, delivery_earliest)

            if delivery_time > delivery_deadline:
                continue

            if delivery_time > interval_end:
                continue

            route_distance = pickup_distance + delivery_distance

            candidate = {
                "VolunteerID": volunteer_id,
                "RouteDistanceKM": route_distance,
                "PickupTime": pickup_time,
                "DeliveryTime": delivery_time,
                "IntervalEnd": interval_end
            }

            if (
                best_candidate is None
                or candidate["RouteDistanceKM"]
                < best_candidate["RouteDistanceKM"]
            ):
                best_candidate = candidate

    if best_candidate is None:
        results.append({
            "RequestID": order["RequestID"],
            "Cluster": order["Cluster"],
            "Perishable": order["Perishable"],
            "VolunteerID": "Unassigned",
            "RouteDistanceKM": 0,
            "PickupTime": None,
            "DeliveryTime": None
        })
        continue

    volunteer_id = best_candidate["VolunteerID"]
    volunteer = volunteer_state[volunteer_id]

    volunteer["time"] = best_candidate["DeliveryTime"]
    volunteer["lat"] = delivery_lat
    volunteer["lon"] = delivery_lon

    total_distance += best_candidate["RouteDistanceKM"]

    results.append({
        "RequestID": order["RequestID"],
        "Cluster": order["Cluster"],
        "Perishable": order["Perishable"],
        "VolunteerID": volunteer_id,
        "RouteDistanceKM": round(best_candidate["RouteDistanceKM"], 2),
        "PickupTime": round(best_candidate["PickupTime"], 2),
        "DeliveryTime": round(best_candidate["DeliveryTime"], 2)
    })

results_df = pd.DataFrame(results)
results_df.to_csv("rescuebite_improved_assignments.csv", index=False)

assigned = results_df[results_df["VolunteerID"] != "Unassigned"]
unassigned = results_df[results_df["VolunteerID"] == "Unassigned"]

print("Food requests:", len(orders))
print("Clusters:", best_k)
print("Silhouette score:", round(scores[best_k], 3))
print("Assigned requests:", len(assigned))
print("Unassigned requests:", len(unassigned))
print(
    "Assignment rate:",
    round(len(assigned) / len(orders) * 100, 2), "%"
)
print("Total estimated route distance:", round(total_distance, 2), "km")

print("\nAssignment rates by food type:")
print(
    results_df.groupby("Perishable")["VolunteerID"]
    .apply(lambda x: round((x != "Unassigned").mean() * 100, 2))
)

print("\nSample assignments:")
print(results_df.head(10).to_string(index=False))

print("\nSaved results: rescuebite_improved_assignments.csv")