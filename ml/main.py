
import ast
import pandas as pd
import matplotlib.pyplot as plt
from math import radians, sin, cos, sqrt, atan2
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score

orders = pd.read_csv("foodgo-orders.csv")
volunteers = pd.read_csv("foodgo-volunteers.csv")

def distance(lat1, lon1, lat2, lon2):
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    a = sin((lat2 - lat1) / 2) ** 2 + cos(lat1) * cos(lat2) * sin((lon2 - lon1) / 2) ** 2
    return 6371 * 2 * atan2(sqrt(a), sqrt(1 - a))

def to_minutes(value):
    value = int(value)
    return (value // 100) * 60 + value % 100

features = orders[["P-Lat", "P-Lon"]]
scaler = StandardScaler()
X = scaler.fit_transform(features)

scores = {}
for k in range(2, 9):
    model = KMeans(n_clusters=k, random_state=42, n_init=10)
    labels = model.fit_predict(X)
    scores[k] = silhouette_score(X, labels)

best_k = max(scores, key=scores.get)
model = KMeans(n_clusters=best_k, random_state=42, n_init=10)
orders["Cluster"] = model.fit_predict(X)

states = []

for _, v in volunteers.iterrows():
    intervals = [
        (to_minutes(start), to_minutes(end))
        for start, end in ast.literal_eval(v["Availability"])
    ]
    states.append({
        "id": v["VolunteerID"],
        "capacity": float(v["Capacity"]),
        "lat": float(v["S-Lat"]),
        "lon": float(v["S-Lon"]),
        "time": 0,
        "intervals": intervals
    })

orders["P_Start"] = orders["P-ET"].apply(to_minutes)
orders["P_End"] = orders["P-LT"].apply(to_minutes)
orders["D_Start"] = orders["D-ET"].apply(to_minutes)
orders["D_End"] = orders["D-LT"].apply(to_minutes)
orders = orders.sort_values(["P_Start", "P_End"])

results = []
speed_kmh = 30
pickup_service_minutes = 10

for _, order in orders.iterrows():
    quantity = float(order["Quantity"])
    best = None

    for v in states:
        if v["capacity"] < quantity:
            continue

        first_leg = distance(
            v["lat"], v["lon"],
            order["P-Lat"], order["P-Lon"]
        )

        second_leg = distance(
            order["P-Lat"], order["P-Lon"],
            order["D-Lat"], order["D-Lon"]
        )

        travel_to_pickup = first_leg / speed_kmh * 60
        travel_to_delivery = second_leg / speed_kmh * 60

        for start, end in v["intervals"]:
            departure = max(v["time"], start)
            pickup_arrival = departure + travel_to_pickup
            pickup_time = max(pickup_arrival, order["P_Start"])
            delivery_arrival = pickup_time + pickup_service_minutes + travel_to_delivery
            delivery_time = max(delivery_arrival, order["D_Start"])

            if pickup_time > order["P_End"]:
                continue

            if delivery_time > order["D_End"] or delivery_time > end:
                continue

            if pickup_time + pickup_service_minutes + travel_to_delivery > end:
                continue

            route_distance = first_leg + second_leg

            if best is None or route_distance < best["distance"]:
                best = {
                    "volunteer": v,
                    "distance": route_distance,
                    "pickup_time": pickup_time,
                    "delivery_time": delivery_time,
                    "interval_end": end,
                    "pickup_lat": float(order["P-Lat"]),
                    "pickup_lon": float(order["P-Lon"]),
                    "delivery_lat": float(order["D-Lat"]),
                    "delivery_lon": float(order["D-Lon"])
                }

    if best is None:
        results.append({
            "RequestID": order["RequestID"],
            "Cluster": order["Cluster"],
            "VolunteerID": "Unassigned",
            "RouteDistanceKM": None,
            "PickupTime": None,
            "DeliveryTime": None
        })
    else:
        v = best["volunteer"]
        v["time"] = best["delivery_time"]
        v["lat"] = best["delivery_lat"]
        v["lon"] = best["delivery_lon"]

        results.append({
            "RequestID": order["RequestID"],
            "Cluster": order["Cluster"],
            "VolunteerID": v["id"],
            "RouteDistanceKM": round(best["distance"], 2),
            "PickupTime": round(best["pickup_time"], 1),
            "DeliveryTime": round(best["delivery_time"], 1)
        })

result_df = pd.DataFrame(results)
result_df.to_csv("rescuebite_assignments.csv", index=False)

assigned = result_df[result_df["VolunteerID"] != "Unassigned"]

print("Food requests:", len(result_df))
print("Clusters:", best_k)
print("Silhouette score:", round(scores[best_k], 4))
print("Assigned requests:", len(assigned))
print("Unassigned requests:", len(result_df) - len(assigned))
print("Total estimated route distance:", round(assigned["RouteDistanceKM"].sum(), 2), "km")
print("\nSample assignments:")
print(result_df.head(15).to_string(index=False))

plt.figure(figsize=(10, 7))
plt.scatter(orders["P-Lon"], orders["P-Lat"], c=orders["Cluster"], cmap="viridis", s=25)
plt.xlabel("Longitude")
plt.ylabel("Latitude")
plt.title("RescueBite AI - Food Request Clusters")
plt.tight_layout()
plt.savefig("food_clusters.png", dpi=150)
plt.show()
