
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
    try:
        intervals = ast.literal_eval(str(value))
        result = []

        for start, end in intervals:
            start_min = to_minutes(start)
            end_min = to_minutes(end)

            if start_min is not None and end_min is not None:
                result.append((start_min, end_min))

        return result

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

    return radius * 2 * math.atan2(
        math.sqrt(a), math.sqrt(1 - a)
    )


# Clean Perishable values
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

if orders["Perishable"].isna().any():
    raise ValueError("Unknown Perishable value found.")

# Convert time columns into minutes after midnight
time_columns = ["P-ET", "P-LT", "D-ET", "D-LT"]

for column in time_columns:
    orders[column + "-Minutes"] = orders[column].apply(to_minutes)

minute_columns = [column + "-Minutes" for column in time_columns]

if orders[minute_columns].isna().any().any():
    raise ValueError("Missing order time window found.")

# ==========================================
# KMEANS CLUSTERING
# ==========================================

features = orders[["P-Lat", "P-Lon"]].copy()
X = StandardScaler().fit_transform(features)

scores = {}

for k in range(2, min(9, len(orders))):
    model = KMeans(
        n_clusters=k,
        random_state=42,
        n_init=10
    )

    labels = model.fit_predict(X)
    scores[k] = silhouette_score(X, labels)

best_k = max(scores, key=scores.get)

cluster_model = KMeans(
    n_clusters=best_k,
    random_state=42,
    n_init=10
)

orders["Cluster"] = cluster_model.fit_predict(X)

# ==========================================
# ORDERING STRATEGIES
# ==========================================

def prepare_orders(strategy):
    data = orders.copy()

    if strategy == "A - Deadline first":
        data = data.sort_values(
            ["P-LT-Minutes", "P-ET-Minutes"],
            ascending=[True, True]
        )

    elif strategy == "B - Perishable first":
        data = data.sort_values(
            ["Perishable", "P-LT-Minutes", "P-ET-Minutes"],
            ascending=[False, True, True]
        )

    elif strategy == "C - Narrowest window first":
        data["PickupWindow"] = (
            data["P-LT-Minutes"] - data["P-ET-Minutes"]
        )

        data = data.sort_values(
            ["PickupWindow", "Perishable", "P-LT-Minutes"],
            ascending=[True, False, True]
        )

    return data


# ==========================================
# RUN ONE STRATEGY
# ==========================================

def run_strategy(strategy):

    # Each experiment starts with fresh volunteer states.
    volunteer_state = {}

    for _, row in volunteers.iterrows():
        volunteer_id = str(row["VolunteerID"])

        volunteer_state[volunteer_id] = {
            "capacity": float(row["Capacity"]),
            "lat": float(row["S-Lat"]),
            "lon": float(row["S-Lon"]),
            "time": 0,
            "availability": parse_availability(
                row["Availability"]
            )
        }

    data = prepare_orders(strategy)

    output = []
    total_distance = 0.0

    speed_kmh = 30
    pickup_service_minutes = 10

    for _, order in data.iterrows():

        pickup_lat = float(order["P-Lat"])
        pickup_lon = float(order["P-Lon"])
        delivery_lat = float(order["D-Lat"])
        delivery_lon = float(order["D-Lon"])
        quantity = float(order["Quantity"])

        pickup_earliest = order["P-ET-Minutes"]
        pickup_deadline = order["P-LT-Minutes"]
        delivery_earliest = order["D-ET-Minutes"]
        delivery_deadline = order["D-LT-Minutes"]

        delivery_distance = distance_km(
            pickup_lat, pickup_lon,
            delivery_lat, delivery_lon
        )

        delivery_travel = (
            delivery_distance / speed_kmh * 60
        )

        best_candidate = None

        # Track how many volunteers pass each stage.
        capacity_pass = 0
        pickup_pass = 0
        delivery_pass = 0
        availability_pass = 0

        for volunteer_id, volunteer in volunteer_state.items():

            # Stage 1: capacity
            if volunteer["capacity"] < quantity:
                continue

            capacity_pass += 1

            pickup_distance = distance_km(
                volunteer["lat"], volunteer["lon"],
                pickup_lat, pickup_lon
            )

            pickup_travel = (
                pickup_distance / speed_kmh * 60
            )

            for interval_start, interval_end in volunteer["availability"]:

                departure = max(
                    volunteer["time"],
                    interval_start
                )

                # Stage 2: volunteer must be available to start
                if departure > interval_end:
                    continue

                arrival_pickup = departure + pickup_travel

                pickup_time = max(
                    arrival_pickup,
                    pickup_earliest
                )

                # Correctly distinguish pickup deadline from shift end.
                if pickup_time > pickup_deadline:
                    continue

                if pickup_time > interval_end:
                    continue

                pickup_pass += 1

                # Stage 3: delivery timing
                delivery_arrival = (
                    pickup_time
                    + pickup_service_minutes
                    + delivery_travel
                )

                delivery_time = max(
                    delivery_arrival,
                    delivery_earliest
                )

                if delivery_time > delivery_deadline:
                    continue

                delivery_pass += 1

                # Stage 4: full delivery must finish during availability
                if delivery_time > interval_end:
                    continue

                availability_pass += 1

                route_distance = (
                    pickup_distance + delivery_distance
                )

                candidate = {
                    "VolunteerID": volunteer_id,
                    "RouteDistanceKM": route_distance,
                    "PickupTime": pickup_time,
                    "DeliveryTime": delivery_time
                }

                # Choose the feasible candidate with shortest distance.
                if (
                    best_candidate is None
                    or route_distance
                    < best_candidate["RouteDistanceKM"]
                ):
                    best_candidate = candidate

        # ==========================================
        # FAILURE DIAGNOSIS
        # ==========================================

        if best_candidate is None:

            if capacity_pass == 0:
                reason = "Capacity constraint"

            elif pickup_pass == 0:
                reason = "Pickup timing constraint"

            elif delivery_pass == 0:
                reason = "Delivery deadline constraint"

            elif availability_pass == 0:
                reason = "Volunteer availability constraint"

            else:
                reason = "Other scheduling issue"

            output.append({
                "Strategy": strategy,
                "RequestID": order["RequestID"],
                "Cluster": order["Cluster"],
                "Perishable": order["Perishable"],
                "VolunteerID": "Unassigned",
                "RouteDistanceKM": 0,
                "PickupTime": None,
                "DeliveryTime": None,
                "FailureReason": reason,
                "CapacityCandidates": capacity_pass,
                "PickupCandidates": pickup_pass,
                "DeliveryCandidates": delivery_pass,
                "AvailabilityCandidates": availability_pass
            })

            continue

        # ==========================================
        # UPDATE VOLUNTEER AFTER ASSIGNMENT
        # ==========================================

        volunteer_id = best_candidate["VolunteerID"]
        volunteer = volunteer_state[volunteer_id]

        volunteer["time"] = best_candidate["DeliveryTime"]
        volunteer["lat"] = delivery_lat
        volunteer["lon"] = delivery_lon

        total_distance += best_candidate["RouteDistanceKM"]

        output.append({
            "Strategy": strategy,
            "RequestID": order["RequestID"],
            "Cluster": order["Cluster"],
            "Perishable": order["Perishable"],
            "VolunteerID": volunteer_id,
            "RouteDistanceKM": round(
                best_candidate["RouteDistanceKM"], 2
            ),
            "PickupTime": round(
                best_candidate["PickupTime"], 2
            ),
            "DeliveryTime": round(
                best_candidate["DeliveryTime"], 2
            ),
            "FailureReason": "Assigned",
            "CapacityCandidates": capacity_pass,
            "PickupCandidates": pickup_pass,
            "DeliveryCandidates": delivery_pass,
            "AvailabilityCandidates": availability_pass
        })

    result_df = pd.DataFrame(output)

    assigned = result_df[
        result_df["VolunteerID"] != "Unassigned"
    ]

    unassigned = result_df[
        result_df["VolunteerID"] == "Unassigned"
    ]

    perishable = result_df[result_df["Perishable"] == True]
    nonperishable = result_df[result_df["Perishable"] == False]

    def assignment_rate(frame):
        if len(frame) == 0:
            return 0.0

        return round(
            (frame["VolunteerID"] != "Unassigned").mean() * 100,
            2
        )

    summary = {
        "Strategy": strategy,
        "Assigned": len(assigned),
        "Unassigned": len(unassigned),
        "AssignmentRatePct": round(
            len(assigned) / len(result_df) * 100, 2
        ),
        "PerishableRatePct": assignment_rate(perishable),
        "NonPerishableRatePct": assignment_rate(nonperishable),
        "TotalRouteKM": round(total_distance, 2)
    }

    return result_df, summary


# ==========================================
# RUN AND COMPARE ALL STRATEGIES
# ==========================================

strategies = [
    "A - Deadline first",
    "B - Perishable first",
    "C - Narrowest window first"
]

all_results = []
summaries = []

for strategy in strategies:
    result, summary = run_strategy(strategy)

    all_results.append(result)
    summaries.append(summary)

    prefix = strategy.split(" - ")[0].lower()

    result.to_csv(
        f"rescuebite_{prefix}_assignments.csv",
        index=False
    )

summary_df = pd.DataFrame(summaries)

summary_df.to_csv(
    "rescuebite_strategy_comparison.csv",
    index=False
)

# ==========================================
# PRINT RESULTS
# ==========================================

print("\nRESCUEBITE AI - STRATEGY COMPARISON")
print("----------------------------------")
print("Food requests:", len(orders))
print("Volunteers:", len(volunteers))
print("KMeans clusters:", best_k)
print("Silhouette score:", round(scores[best_k], 3))

print("\nCOMPARISON RESULTS")
print(summary_df.to_string(index=False))

print("\nFAILURE REASONS BY STRATEGY")

for result in all_results:
    strategy = result["Strategy"].iloc[0]

    failed = result[
        result["VolunteerID"] == "Unassigned"
    ]

    print(f"\n{strategy}")

    if failed.empty:
        print("No unassigned requests.")
    else:
        print(
            failed["FailureReason"]
            .value_counts()
            .to_string()
        )

        print("\nAverage candidates at each stage:")
        print(
            failed[
                [
                    "CapacityCandidates",
                    "PickupCandidates",
                    "DeliveryCandidates",
                    "AvailabilityCandidates"
                ]
            ].mean().round(2).to_string()
        )

print("\nSaved files:")
print("- rescuebite_a_assignments.csv")
print("- rescuebite_b_assignments.csv")
print("- rescuebite_c_assignments.csv")
print("- rescuebite_strategy_comparison.csv")
