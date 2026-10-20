import ast
import pandas as pd

orders = pd.read_csv("foodgo-orders.csv")
volunteers = pd.read_csv("foodgo-volunteers.csv")
results = pd.read_csv("rescuebite_balanced_assignments.csv")

def parse_availability(value):
    try:
        return ast.literal_eval(str(value))
    except (ValueError, SyntaxError, TypeError):
        return []

print("TOTAL ORDERS:", len(orders))
print("TOTAL VOLUNTEERS:", len(volunteers))

print("\nVOLUNTEER CAPACITY SUMMARY")
print(volunteers["Capacity"].describe().round(2))

print("\nORDER QUANTITY SUMMARY")
print(orders["Quantity"].describe().round(2))

print("\nREQUESTS BY QUANTITY")
print(orders["Quantity"].value_counts().sort_index())

print("\nVOLUNTEER AVAILABILITY INTERVAL COUNTS")
volunteers["IntervalCount"] = volunteers["Availability"].apply(
    lambda value: len(parse_availability(value))
)
print(volunteers["IntervalCount"].value_counts().sort_index())

print("\nASSIGNMENT COUNTS BY CLUSTER")
print(
    results.groupby("Cluster")["VolunteerID"]
    .apply(lambda values: (values != "Unassigned").sum())
)

print("\nUNASSIGNED REQUESTS BY FOOD TYPE")
unassigned_ids = results.loc[
    results["VolunteerID"] == "Unassigned", "RequestID"
]
unassigned_orders = orders[
    orders["RequestID"].isin(unassigned_ids)
]
print(unassigned_orders["Perishable"].value_counts(dropna=False))

print("\nSAVED: Analysis displayed in terminal")