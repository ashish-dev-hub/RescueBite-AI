
import pandas as pd

orders = pd.read_csv("foodgo-orders.csv")
results = pd.read_csv("rescuebite_assignments.csv")

data = orders.merge(results, on="RequestID")
data["Assigned"] = data["VolunteerID"] != "Unassigned"

print("Overall assignment rate:")
print(round(data["Assigned"].mean() * 100, 2), "%")

print("\nAssignment rates by food type:")
print(
    data.groupby("Perishable")["Assigned"]
    .agg(["count", "sum", "mean"])
    .assign(AssignmentRate=lambda x: (x["mean"] * 100).round(2))
    .drop(columns="mean")
)

print("\nAssignment rates by cluster:")
print(
    data.groupby("Cluster")["Assigned"]
    .agg(["count", "sum", "mean"])
    .assign(AssignmentRate=lambda x: (x["mean"] * 100).round(2))
    .drop(columns="mean")
)

print("\nRequests by cluster:")
print(data["Cluster"].value_counts().sort_index())

print("\nVolunteer workload:")
print(
    data[data["Assigned"]]
    .groupby("VolunteerID")
    .size()
    .sort_values(ascending=False)
    .head(10)
)
