"""Model training pipeline for RescueBite AI Model B (Allocation & Matching Classifier).

Trains a leak-free Random Forest classifier to predict delivery feasibility and success probability
for candidate (donation, recipient NGO) pairs using chronological splitting.
"""

import json
from pathlib import Path
import sys
from typing import Any, Dict, Optional, Tuple, Union

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    brier_score_loss,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

try:
    from .matching_features import (
        AllocationFeatureEngineer,
        chronological_split_allocations,
    )
except ImportError:
    _src_dir = Path(__file__).resolve().parent.parent
    if str(_src_dir) not in sys.path:
        sys.path.insert(0, str(_src_dir))
    from rescuebite_ml.matching_features import (
        AllocationFeatureEngineer,
        chronological_split_allocations,
    )

UnionPath = Union[str, Path]


def create_matching_pipeline(
    random_state: int = 42,
    n_estimators: int = 120,
    max_depth: int = 10,
    min_samples_split: int = 6,
    min_samples_leaf: int = 4,
    class_weight: Any = "balanced",
) -> Pipeline:
    """Create the scikit-learn preprocessing and classification pipeline.

    Args:
        random_state: Seed for reproducibility.
        n_estimators: Number of decision trees.
        max_depth: Maximum tree depth.
        min_samples_split: Minimum samples to split an internal node.
        min_samples_leaf: Minimum samples in a leaf.
        class_weight: Weighting scheme ('balanced' or None).

    Returns:
        Configured scikit-learn Pipeline instance.
    """
    preprocessor = ColumnTransformer(
        transformers=[
            (
                "num",
                SimpleImputer(strategy="median"),
                AllocationFeatureEngineer.NUMERIC_FEATURES,
            ),
            (
                "cat",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                AllocationFeatureEngineer.CATEGORICAL_FEATURES,
            ),
        ]
    )

    classifier = RandomForestClassifier(
        n_estimators=n_estimators,
        max_depth=max_depth,
        min_samples_split=min_samples_split,
        min_samples_leaf=min_samples_leaf,
        class_weight=class_weight,
        random_state=random_state,
        n_jobs=-1,
    )

    return Pipeline([("preprocessor", preprocessor), ("classifier", classifier)])


def _find_repo_root() -> Path:
    current = Path(__file__).resolve().parent
    for _ in range(5):
        if (current / "dataset").exists() or (current / ".git").exists():
            return current
        current = current.parent
    return Path(__file__).resolve().parent.parent.parent.parent


def evaluate_classifier_predictions(
    y_true: Union[pd.Series, np.ndarray],
    y_pred: Union[pd.Series, np.ndarray],
    y_prob: Union[pd.Series, np.ndarray],
) -> Dict[str, float]:
    """Compute comprehensive classification performance metrics.

    Args:
        y_true: Ground truth binary labels (0 or 1).
        y_pred: Predicted discrete binary labels (0 or 1).
        y_prob: Predicted probabilities for the positive class (1).

    Returns:
        Dictionary of computed metric names and floating point values.
    """
    y_t = np.asarray(y_true).astype(int)
    y_p = np.asarray(y_pred).astype(int)
    y_pr = np.asarray(y_prob).astype(float)

    acc = float(accuracy_score(y_t, y_p))
    bal_acc = balanced_accuracy_score(y_t, y_p)
    prec = float(precision_score(y_t, y_p, zero_division=0))
    rec = float(recall_score(y_t, y_p, zero_division=0))
    f1 = float(f1_score(y_t, y_p, zero_division=0))
    brier = float(brier_score_loss(y_t, y_pr))

    try:
        roc_auc = float(roc_auc_score(y_t, y_pr))
    except ValueError:
        roc_auc = 0.5

    return {
        "accuracy": round(acc, 4),
        "balanced_accuracy": round(bal_acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "roc_auc": round(roc_auc, 4),
        "brier_score": round(brier, 4),
    }


def train_matching_model(
    allocations_path: UnionPath = "dataset/allocations.csv",
    donations_path: UnionPath = "dataset/donations.csv",
    donors_path: UnionPath = "dataset/donors.csv",
    ngos_path: UnionPath = "dataset/ngos.csv",
    food_rules_path: UnionPath = "dataset/food_rules.csv",
    model_output_path: UnionPath = "ml/models/model_b_matching.joblib",
    metrics_output_path: UnionPath = "ml/models/model_b_metrics.json",
    test_days: int = 60,
    random_state: int = 42,
) -> Dict[str, Any]:
    """Execute end-to-end Model B training, chronological evaluation, and serialization.

    Args:
        allocations_path: Path to allocations history CSV.
        donations_path: Path to donations master CSV.
        donors_path: Path to donor directory CSV.
        ngos_path: Path to recipient NGO directory CSV.
        food_rules_path: Path to food safety constraints CSV.
        model_output_path: Output destination for trained .joblib pipeline.
        metrics_output_path: Output destination for JSON metrics file.
        test_days: Number of final calendar days reserved for holdout evaluation.
        random_state: Random seed for model training.

    Returns:
        Dictionary containing summary evaluation metrics and execution metadata.
    """
    repo_root = _find_repo_root()

    def _resolve(p: UnionPath) -> Path:
        p_obj = Path(p)
        return p_obj.resolve() if p_obj.is_absolute() else (repo_root / p_obj).resolve()

    p_alloc = _resolve(allocations_path)
    p_don = _resolve(donations_path)
    p_donors = _resolve(donors_path)
    p_ngos = _resolve(ngos_path)
    p_rules = _resolve(food_rules_path)
    p_model = _resolve(model_output_path)
    p_metrics = _resolve(metrics_output_path)

    for path, name in [
        (p_alloc, "Allocations"),
        (p_don, "Donations"),
        (p_donors, "Donors"),
        (p_ngos, "NGOs"),
        (p_rules, "Food Rules"),
    ]:
        if not path.exists():
            raise FileNotFoundError(f"{name} dataset not found: {path}")

    df_allocations = pd.read_csv(p_alloc)
    df_donations = pd.read_csv(p_don)
    df_donors = pd.read_csv(p_donors)
    df_ngos = pd.read_csv(p_ngos)
    df_food_rules = pd.read_csv(p_rules)

    # 1. Leakage-free feature engineering
    fe = AllocationFeatureEngineer()
    feat_df = fe.build_training_features(
        df_allocations=df_allocations,
        df_donations=df_donations,
        df_donors=df_donors,
        df_ngos=df_ngos,
        df_food_rules=df_food_rules,
    )

    # 2. Chronological Train / Test Holdout Split
    train_df, test_df = chronological_split_allocations(feat_df, test_days=test_days)

    train_max_date = pd.DatetimeIndex(train_df["created_at"]).max()
    test_min_date = pd.DatetimeIndex(test_df["created_at"]).min()

    if train_max_date >= test_min_date:
        raise RuntimeError("Temporal leakage detected: train and test dates overlap!")

    X_train = train_df[AllocationFeatureEngineer.ALL_FEATURES]
    y_train = train_df["is_delivered"]

    X_test = test_df[AllocationFeatureEngineer.ALL_FEATURES]
    y_test = test_df["is_delivered"]

    # 3. Fit Pipeline
    pipeline = create_matching_pipeline(random_state=random_state)
    pipeline.fit(X_train, y_train)

    # 4. Predictions on Train and Holdout Test
    prob_train = pipeline.predict_proba(X_train)[:, 1]
    pred_train = pipeline.predict(X_train)

    prob_test = pipeline.predict_proba(X_test)[:, 1]
    pred_test = pipeline.predict(X_test)

    train_metrics = evaluate_classifier_predictions(y_train, pred_train, prob_train)
    test_metrics = evaluate_classifier_predictions(y_test, pred_test, prob_test)

    # 5. Baseline Comparisons on Test Holdout
    # Majority class prior baseline
    prior_prob = y_train.mean()
    prior_probs = np.full(len(y_test), prior_prob)
    prior_preds = (prior_probs >= 0.5).astype(int)
    prior_metrics = evaluate_classifier_predictions(y_test, prior_preds, prior_probs)

    # Distance-only heuristic baseline (shorter distance -> higher success probability)
    test_distances = test_df["distance_km"].to_numpy()
    max_d = max(1.0, float(np.nanmax(test_distances)))
    heuristic_probs = np.clip(1.0 - (test_distances / max_d) * 0.4, 0.5, 0.95)
    heuristic_preds = (heuristic_probs >= 0.5).astype(int)
    heuristic_metrics = evaluate_classifier_predictions(
        y_test, heuristic_preds, heuristic_probs
    )

    # 6. Extract Feature Importances
    preprocessor: ColumnTransformer = pipeline.named_steps["preprocessor"]
    classifier: RandomForestClassifier = pipeline.named_steps["classifier"]

    cat_encoder = preprocessor.named_transformers_["cat"]
    encoded_cat_names = list(
        cat_encoder.get_feature_names_out(AllocationFeatureEngineer.CATEGORICAL_FEATURES)
    )
    all_feature_names = AllocationFeatureEngineer.NUMERIC_FEATURES + encoded_cat_names

    importances = classifier.feature_importances_
    feat_imp_pairs = sorted(
        zip(all_feature_names, [float(x) for x in importances]),
        key=lambda p: p[1],
        reverse=True,
    )
    feature_importance_dict = {
        name: round(val, 5) for name, val in feat_imp_pairs[:20]
    }

    # 7. Package Metrics Report
    report: Dict[str, Any] = {
        "model_name": "RescueBite_Model_B_Matching_Classifier",
        "algorithm": "RandomForestClassifier",
        "leakage_guardrail": "Strict exclusion of remaining_quantity, approved_quantity, failure_reason",
        "sample_counts": {
            "total_records": len(feat_df),
            "train_records": len(train_df),
            "test_records": len(test_df),
            "train_positive_rate": round(y_train.mean(), 4),
            "test_positive_rate": round(y_test.mean(), 4),
            "train_start_date": str(pd.DatetimeIndex(train_df["created_at"]).min()),
            "train_end_date": str(train_max_date),
            "test_start_date": str(test_min_date),
            "test_end_date": str(pd.DatetimeIndex(test_df["created_at"]).max()),
        },
        "evaluation": {
            "model_b_test": test_metrics,
            "model_b_train": train_metrics,
            "baseline_majority_prior": prior_metrics,
            "baseline_distance_heuristic": heuristic_metrics,
        },
        "top_feature_importances": feature_importance_dict,
    }

    # 8. Save Artifacts
    p_model.parent.mkdir(parents=True, exist_ok=True)
    p_metrics.parent.mkdir(parents=True, exist_ok=True)

    joblib.dump(pipeline, p_model)
    with open(p_metrics, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    return report


if __name__ == "__main__":
    results = train_matching_model()
    print("Model B Training Complete:")
    print(json.dumps(results["evaluation"]["model_b_test"], indent=2))
