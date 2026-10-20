
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.dummy import DummyClassifier
from sklearn.metrics import accuracy_score, mean_absolute_error

# Load data
df = pd.read_csv("foodgo-clustered.csv")

# Target
y = df["Quantity"]

# Compare two feature sets
feature_sets = {
    "With Cluster": [
        "Perishable", "P-Lat", "P-Lon",
        "D-Lat", "D-Lon", "Cluster"
    ],
    "Without Cluster": [
        "Perishable", "P-Lat", "P-Lon",
        "D-Lat", "D-Lon"
    ]
}

# Same train/test split for fair comparison
train_idx, test_idx = train_test_split(
    df.index,
    test_size=0.20,
    random_state=42,
    stratify=y
)

y_train = y.loc[train_idx]
y_test = y.loc[test_idx]

# Baseline model
baseline = DummyClassifier(strategy="most_frequent")
baseline.fit(df.loc[train_idx, ["Quantity"]], y_train)
baseline_pred = baseline.predict(df.loc[test_idx, ["Quantity"]])

results = [{
    "Model": "Baseline",
    "AccuracyPct": round(accuracy_score(y_test, baseline_pred) * 100, 2),
    "MAE": round(mean_absolute_error(y_test, baseline_pred), 3)
}]

# Random Forest experiments
for name, features in feature_sets.items():
    X = df[features].copy()
    X["Perishable"] = X["Perishable"].astype(int)

    model = RandomForestClassifier(
        n_estimators=200,
        random_state=42,
        class_weight="balanced"
    )

    model.fit(X.loc[train_idx], y_train)
    pred = model.predict(X.loc[test_idx])

    results.append({
        "Model": name,
        "AccuracyPct": round(accuracy_score(y_test, pred) * 100, 2),
        "MAE": round(mean_absolute_error(y_test, pred), 3)
    })

result_df = pd.DataFrame(results)
print("\nQUANTITY MODEL COMPARISON")
print(result_df.to_string(index=False))

result_df.to_csv("rescuebite_quantity_model_comparison.csv", index=False)
print("\nSaved: rescuebite_quantity_model_comparison.csv")
