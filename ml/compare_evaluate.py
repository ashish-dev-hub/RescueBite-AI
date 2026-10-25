import pandas as pd

orders = pd.read_csv("foodgo-orders.csv")
original = pd.read_csv("rescuebite_assignments.csv")
improved = pd.read_csv("rescuebite_improved_assignments.csv")

orders["RequestID"] = orders["RequestID"].astype(str)
original["RequestID"] = original["RequestID"].astype(str)
improved["RequestID"] = improved["RequestID"].astype(str)

def get_metrics(name, results):
    data = orders.merge(
        results,
        on="RequestID",
        how="left",
        suffixes=("_order", "_result")
    )

    if "Perishable_order" in data.columns:
        data["FoodType"] = data["Perishable_order"]
    else:
        data["FoodType"] = data["Perishable"]

    data["Assigned"] = (
        data["VolunteerID"].notna()
        & (data["VolunteerID"].astype(str) != "Unassigned")
    )

    total = len(data)
    assigned = int(data["Assigned"].sum())

    print(f"\n{'=' * 45}")
    print(name)
    print(f"{'=' * 45}")
    print("Total requests:", total)
    print("Assigned:", assigned)
    print("Unassigned:", total - assigned)
    print("Assignment rate:", round(assigned / total * 100, 2), "%")

    print("\nAssignment rate by food type:")
    food_stats = data.groupby("FoodType")["Assigned"].agg(
        Total="count",
        Assigned="sum",
        Rate="mean"
    )
    food_stats["Rate"] = (food_stats["Rate"] * 100).round(2)
    print(food_stats.to_string())

    if "RouteDistanceKM" in data.columns:
        distance = pd.to_numeric(
            data.loc[data["Assigned"], "RouteDistanceKM"],
            errors="coerce"
        ).fillna(0).sum()
        print("\nTotal estimated route distance:", round(distance, 2), "km")

    print("\nTop volunteer workloads:")
    workload = (
        data.loc[data["Assigned"]]
        .groupby("VolunteerID")
        .size()
        .sort_values(ascending=False)
        .head(10)
    )
    print(workload.to_string())

    return {
        "Version": name,
        "Total": total,
        "Assigned": assigned,
        "Unassigned": total - assigned,
        "AssignmentRate": round(assigned / total * 100, 2)
    }

original_metrics = get_metrics("ORIGINAL VERSION", original)
improved_metrics = get_metrics("IMPROVED VERSION", improved)

comparison = pd.DataFrame([original_metrics, improved_metrics])
comparison.to_csv("rescuebite_comparison.csv", index=False)

print("\nFINAL COMPARISON")
print(comparison.to_string(index=False))
print("\nSaved: rescuebite_comparison.csv")