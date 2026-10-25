"""RescueBite AI — Machine Learning Package for Food Redistribution & Demand Forecasting."""

from .baseline import SameWeekdayBaseline
from .evaluate import compute_per_ngo_metrics, evaluate_predictions
from .features import FeatureEngineer, chronological_split
from .matching_engine import MatchingEngine
from .matching_features import (
    AllocationFeatureEngineer,
    calculate_haversine_distance_km,
    chronological_split_allocations,
)
from .matching_train import (
    create_matching_pipeline,
    evaluate_classifier_predictions,
    train_matching_model,
)
from .predict import DemandPredictor
from .train import create_model_pipeline, train_model

__all__ = [
    # Model A: Demand Forecasting
    "SameWeekdayBaseline",
    "FeatureEngineer",
    "chronological_split",
    "create_model_pipeline",
    "train_model",
    "evaluate_predictions",
    "compute_per_ngo_metrics",
    "DemandPredictor",
    # Model B: Smart Allocation & Matching Engine
    "AllocationFeatureEngineer",
    "calculate_haversine_distance_km",
    "chronological_split_allocations",
    "create_matching_pipeline",
    "evaluate_classifier_predictions",
    "train_matching_model",
    "MatchingEngine",
]
