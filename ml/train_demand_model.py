
import pandas as pd
import numpy as np

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.dummy import DummyClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    mean_absolute_error
)

# Load dataset
df = pd.read_csv("foodgo-clustered.csv")

# Features available before predicting quantity
features = [
    "Perishable",
    "P-Lat", "P-Lon",
    "D-Lat", "D-Lon",
    "Cluster"
]

X = df[features].copy()
X["Perishable"] = X["Perishable"].astype(int)

# Target: requested food quantity (1, 2, or 3)
y = df["Quantity"]

# Keep a separate test set
X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.20,
    random_state=42,
    stratify=y
)

# Baseline: always predict the most common training class
baseline = DummyClassifier(strategy="most_frequent")
baseline.fit(X_train, y_train)
baseline_pred = baseline.predict(X_test)

# Random Forest model
model = RandomForestClassifier(
    n_estimators=200,
    random_state=42,
    class_weight="balanced"
)
model.fit(X_train, y_train)
pred = model.predict(X_test)

# Evaluation
print("\nRESCUEBITE AI - QUANTITY MODEL")
print("Training records:", len(X_train))
print("Testing records:", len(X_test))

print("\nBaseline accuracy:",
      round(accuracy_score(y_test, baseline_pred) * 100, 2), "%")
print("Random Forest accuracy:",
      round(accuracy_score(y_test, pred) * 100, 2), "%")
print("Random Forest MAE:",
      round(mean_absolute_error(y_test, pred), 3))

print("\nClassification report:")
print(classification_report(y_test, pred, zero_division=0))

print("Confusion matrix (actual rows, predicted columns):")
print(confusion_matrix(y_test, pred))

# Save model and test predictions
results = X_test.copy()
results["ActualQuantity"] = y_test
results["PredictedQuantity"] = pred
results.to_csv("rescuebite_quantity_test_results.csv", index=False)

print("\nTest predictions saved to rescuebite_quantity_test_results.csv")
# Feature importance analysis
print("\nFEATURE IMPORTANCE:")

importance = pd.DataFrame({
    "Feature": features,
    "Importance": model.feature_importances_
})

importance = importance.sort_values(
    "Importance", ascending=False
)

print(importance.to_string(index=False))

print("\nERROR ANALYSIS:")
error_analysis = pd.DataFrame({
    "Actual": y_test,
    "Predicted": pred
})

error_analysis["AbsoluteError"] = (
    error_analysis["Actual"] - error_analysis["Predicted"]
).abs()

print(error_analysis.head(15).to_string(index=False))

print("\nMean absolute error by actual quantity:")
print(
    error_analysis.groupby("Actual")["AbsoluteError"]
    .mean()
    .round(3)
)
