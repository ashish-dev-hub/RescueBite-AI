"""FastAPI Model Serving Layer for RescueBite AI.

Exposes REST API endpoints for:
1. Model A: NGO Meal Demand Forecasting with uncertainty intervals.
2. Model B: Smart Food Redistribution & Allocation Engine with constraint filters and explainable reason codes.
"""

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
import sys
from typing import Any, AsyncGenerator, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from .donor_supply_predictor import DonorSupplyPredictor
    from .matching_engine import MatchingEngine
    from .predict import DemandPredictor
except ImportError:
    _src_dir = Path(__file__).resolve().parent.parent
    if str(_src_dir) not in sys.path:
        sys.path.insert(0, str(_src_dir))
    from rescuebite_ml.donor_supply_predictor import DonorSupplyPredictor
    from rescuebite_ml.matching_engine import MatchingEngine
    from rescuebite_ml.predict import DemandPredictor

SYNTHETIC_DATA_DISCLAIMER = (
    "Synthetic-data experiment for operational redistribution planning only."
)

# Global service singletons
_demand_predictor: Optional[DemandPredictor] = None
_matching_engine: Optional[MatchingEngine] = None
_donor_supply_predictor: Optional[DonorSupplyPredictor] = None


def get_demand_predictor() -> DemandPredictor:
    """Retrieve or lazily initialize the Model A DemandPredictor singleton."""
    global _demand_predictor
    if _demand_predictor is None:
        _demand_predictor = DemandPredictor()
    return _demand_predictor


def get_matching_engine() -> MatchingEngine:
    """Retrieve or lazily initialize the Model B MatchingEngine singleton."""
    global _matching_engine
    if _matching_engine is None:
        _matching_engine = MatchingEngine()
    return _matching_engine


def get_donor_supply_predictor() -> DonorSupplyPredictor:
    """Retrieve or lazily initialize the Model C DonorSupplyPredictor singleton."""
    global _donor_supply_predictor
    if _donor_supply_predictor is None:
        _donor_supply_predictor = DonorSupplyPredictor()
    return _donor_supply_predictor


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Warm up and initialize machine learning models upon server startup."""
    try:
        get_demand_predictor()
    except Exception as exc:
        print(f"[Warning] DemandPredictor warmup deferred: {exc}")

    try:
        get_matching_engine()
    except Exception as exc:
        print(f"[Warning] MatchingEngine warmup deferred: {exc}")

    try:
        get_donor_supply_predictor()
    except Exception as exc:
        print(f"[Warning] DonorSupplyPredictor warmup deferred: {exc}")

    yield


app = FastAPI(
    title="RescueBite AI — ML Prediction & Allocation API",
    version="1.0.0",
    description=(
        "Production REST API serving RescueBite AI machine learning capabilities: "
        "Model A (Demand Forecasting) and Model B (Smart Food Redistribution & Allocation Engine). "
        "All data and benchmarks reflect synthetic food rescue logistics experiments."
    ),
    lifespan=lifespan,
)

# Enable CORS for frontend and backend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Pydantic Schemas
# ============================================================================


class HealthResponse(BaseModel):
    status: str = Field(..., examples=["healthy"])
    service: str = Field(..., examples=["rescuebite-ml-api"])
    version: str = Field(..., examples=["1.0.0"])
    timestamp_utc: str = Field(..., examples=["2026-10-26T01:30:00Z"])


class ModelStatusInfo(BaseModel):
    model_name: str
    loaded: bool
    version: str
    algorithm: str
    status: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ModelsStatusResponse(BaseModel):
    service: str = "rescuebite-ml-api"
    model_a_demand_forecaster: ModelStatusInfo
    model_b_allocation_matching: ModelStatusInfo
    model_c_donor_supply: Optional[ModelStatusInfo] = None
    disclaimer: str = SYNTHETIC_DATA_DISCLAIMER


class DonorSupplyPredictionRequest(BaseModel):
    donor_id: str = Field(..., description="Target registered donor identifier", examples=["D001"])
    forecast_date: str = Field(
        ..., description="Target forecast date in YYYY-MM-DD format", examples=["2026-10-27"]
    )


class DonorSupplyPredictionResponse(BaseModel):
    donor_id: str
    forecast_date: str
    predicted_surplus_meals: float
    has_surplus_probability: float
    surplus_p10: float
    surplus_p90: float
    confidence_score: float
    donor_type: str
    is_fallback: bool
    reason_codes: List[str]
    model_version: str
    disclaimer: str = SYNTHETIC_DATA_DISCLAIMER


class DonorSupplyBatchItem(BaseModel):
    donor_id: str = Field(..., examples=["D001"])
    forecast_date: str = Field(..., examples=["2026-10-27"])


class DonorSupplyBatchRequest(BaseModel):
    targets: List[DonorSupplyBatchItem] = Field(
        ..., description="List of (donor_id, forecast_date) requests"
    )


class DonorSupplyBatchResponse(BaseModel):
    total: int
    predictions: List[DonorSupplyPredictionResponse]
    disclaimer: str = SYNTHETIC_DATA_DISCLAIMER


class DemandPredictionRequest(BaseModel):
    ngo_id: str = Field(..., description="Target NGO identifier", examples=["N001"])
    forecast_date: str = Field(
        ..., description="Target forecast date in YYYY-MM-DD format", examples=["2026-10-26"]
    )


class DemandPredictionResponse(BaseModel):
    ngo_id: str
    forecast_date: str
    predicted_meals: float
    baseline_prediction: float
    model_version: str
    is_fallback: bool
    confidence_lower: float
    confidence_upper: float
    disclaimer: str = SYNTHETIC_DATA_DISCLAIMER


class DemandBatchItem(BaseModel):
    ngo_id: str = Field(..., examples=["N001"])
    forecast_date: str = Field(..., examples=["2026-10-26"])


class DemandBatchRequest(BaseModel):
    targets: List[DemandBatchItem] = Field(
        ..., description="List of (ngo_id, forecast_date) requests"
    )


class DemandBatchResponse(BaseModel):
    total: int
    predictions: List[DemandPredictionResponse]
    disclaimer: str = SYNTHETIC_DATA_DISCLAIMER


class DonorProfile(BaseModel):
    donor_id: str = Field(default="D001", examples=["D001"])
    donor_type: str = Field(default="restaurant", examples=["restaurant"])
    lat: float = Field(default=28.6139, examples=[28.6139])
    lon: float = Field(default=77.2090, examples=[77.2090])
    avg_surplus_meals: float = Field(default=50.0, examples=[50.0])
    reliability: float = Field(default=0.92, examples=[0.92])


class DonationPayload(BaseModel):
    donation_id: str = Field(default="DON_001", examples=["DON_001"])
    food_category: str = Field(
        default="cooked_veg",
        description="Category: cooked_veg, cooked_nonveg, bakery, packaged, fruit_veg_raw, dairy",
        examples=["cooked_veg"],
    )
    quantity_meals: float = Field(..., gt=0, examples=[45.0])
    created_at: Optional[str] = Field(
        default=None, examples=["2026-10-26 13:00:00"]
    )
    prepared_at: Optional[str] = Field(
        default=None, examples=["2026-10-26 11:30:00"]
    )
    pickup_deadline: Optional[str] = Field(
        default=None, examples=["2026-10-26 16:30:00"]
    )


class AllocationRecommendRequest(BaseModel):
    donation: DonationPayload
    donor: DonorProfile
    top_k: int = Field(default=5, ge=1, le=30, examples=[5])
    min_score: float = Field(default=0.0, ge=0.0, le=100.0, examples=[0.0])


class NgoRecommendation(BaseModel):
    ngo_id: str
    ngo_type: str
    match_score: float
    success_probability: float
    distance_km: float
    travel_minutes: float
    recommended_quantity: float
    capacity_utilization: float
    receiving_capacity_meals: float
    base_daily_meals: float
    reason_codes: List[str]
    disclaimer: str = SYNTHETIC_DATA_DISCLAIMER


class AllocationRecommendResponse(BaseModel):
    donation_id: str
    quantity_meals: float
    food_category: str
    total_candidates_evaluated: int
    eligible_candidates_count: int
    ineligible_breakdown: Dict[str, int]
    recommendations: List[NgoRecommendation]
    disclaimer: str = SYNTHETIC_DATA_DISCLAIMER


class EvaluatePairRequest(BaseModel):
    donation: DonationPayload
    donor: DonorProfile
    ngo_id: str = Field(..., examples=["N001"])
    recommended_quantity: Optional[float] = Field(default=None, gt=0, examples=[35.0])


class EvaluatePairResponse(BaseModel):
    ngo_id: str
    is_eligible: bool
    ineligibility_reasons: List[str]
    evaluation: Optional[NgoRecommendation] = None
    disclaimer: str = SYNTHETIC_DATA_DISCLAIMER


# ============================================================================
# API Endpoints
# ============================================================================


@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["System"],
    summary="Service Health Check",
)
def health_check() -> HealthResponse:
    """Return live status of the ML serving service."""
    now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return HealthResponse(
        status="healthy",
        service="rescuebite-ml-api",
        version="1.0.0",
        timestamp_utc=now_utc,
    )


@app.get(
    "/api/v1/models/status",
    response_model=ModelsStatusResponse,
    tags=["System"],
    summary="Model Registry & Operational Status",
)
def get_models_status() -> ModelsStatusResponse:
    """Query model readiness, versions, and algorithm metadata."""
    pred = get_demand_predictor()
    match = get_matching_engine()

    model_a_info = ModelStatusInfo(
        model_name="Model A: Demand Forecaster",
        loaded=pred.pipeline is not None,
        version=pred.MODEL_VERSION,
        algorithm="RandomForestRegressor",
        status="READY" if pred.pipeline is not None else "ERROR",
        metadata={
            "ngo_profiles_count": len(pred.ngo_profile_map),
            "holidays_count": len(pred.holiday_dates),
        },
    )

    model_b_info = ModelStatusInfo(
        model_name="Model B: Smart Allocation & Matching Engine",
        loaded=match.model is not None,
        version="random_forest_v1",
        algorithm="RandomForestClassifier",
        status="READY" if match.model is not None else "DEGRADED_HEURISTIC",
        metadata={
            "registered_ngos_count": len(match.ngos_df),
            "food_rules_count": len(match._food_rules_map),
        },
    )

    donor_pred = get_donor_supply_predictor()
    model_c_info = ModelStatusInfo(
        model_name="Model C: Donor Surplus Forecaster",
        loaded=donor_pred.regressor_pipeline is not None,
        version=donor_pred.model_version,
        algorithm="RandomForestRegressor + RandomForestClassifier",
        status="READY" if donor_pred.regressor_pipeline is not None else "ERROR",
        metadata={
            "registered_donors_count": len(donor_pred.donor_profiles),
            "recent_history_count": len(donor_pred.recent_history),
        },
    )

    return ModelsStatusResponse(
        service="rescuebite-ml-api",
        model_a_demand_forecaster=model_a_info,
        model_b_allocation_matching=model_b_info,
        model_c_donor_supply=model_c_info,
        disclaimer=SYNTHETIC_DATA_DISCLAIMER,
    )


@app.post(
    "/api/v1/demand/predict",
    response_model=DemandPredictionResponse,
    tags=["Model A: Demand Forecasting"],
    summary="Predict Meal Demand for Single NGO",
)
def predict_ngo_demand(request: DemandPredictionRequest) -> DemandPredictionResponse:
    """Generate meal demand prediction with uncertainty bounds strictly conforming to prediction contract."""
    predictor = get_demand_predictor()
    try:
        result = predictor.predict_one(request.ngo_id, request.forecast_date)
        return DemandPredictionResponse(**result)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to generate demand prediction: {exc}",
        ) from exc


@app.post(
    "/api/v1/demand/predict-batch",
    response_model=DemandBatchResponse,
    tags=["Model A: Demand Forecasting"],
    summary="Batch Predict Meal Demand for Multiple NGOs",
)
def predict_demand_batch(request: DemandBatchRequest) -> DemandBatchResponse:
    """Generate batch predictions for multiple (NGO, date) pairs."""
    predictor = get_demand_predictor()
    targets = [(item.ngo_id, item.forecast_date) for item in request.targets]
    try:
        raw_results = predictor.predict_batch(targets)
        predictions = [DemandPredictionResponse(**r) for r in raw_results]
        return DemandBatchResponse(
            total=len(predictions),
            predictions=predictions,
            disclaimer=SYNTHETIC_DATA_DISCLAIMER,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to process batch demand predictions: {exc}",
        ) from exc


@app.post(
    "/api/v1/donor-supply/predict",
    response_model=DonorSupplyPredictionResponse,
    tags=["Model C: Donor Supply Forecasting"],
    summary="Predict Surplus Meals for Single Food Donor",
)
def predict_donor_supply(request: DonorSupplyPredictionRequest) -> DonorSupplyPredictionResponse:
    """Generate expected surplus meals, occurrence probability, and bounds for a commercial food donor."""
    predictor = get_donor_supply_predictor()
    try:
        result = predictor.predict_one(request.donor_id, request.forecast_date)
        return DonorSupplyPredictionResponse(**result)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to generate donor surplus prediction: {exc}",
        ) from exc


@app.post(
    "/api/v1/donor-supply/predict-batch",
    response_model=DonorSupplyBatchResponse,
    tags=["Model C: Donor Supply Forecasting"],
    summary="Batch Predict Surplus Meals for Multiple Donors",
)
def predict_donor_supply_batch(request: DonorSupplyBatchRequest) -> DonorSupplyBatchResponse:
    """Generate batch predictions for multiple (donor_id, forecast_date) queries."""
    predictor = get_donor_supply_predictor()
    targets = [(item.donor_id, item.forecast_date) for item in request.targets]
    try:
        raw_results = predictor.predict_batch(targets)
        predictions = [DonorSupplyPredictionResponse(**r) for r in raw_results]
        return DonorSupplyBatchResponse(
            total=len(predictions),
            predictions=predictions,
            disclaimer=SYNTHETIC_DATA_DISCLAIMER,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to process batch donor surplus predictions: {exc}",
        ) from exc


@app.post(
    "/api/v1/allocation/recommend",
    response_model=AllocationRecommendResponse,
    tags=["Model B: Redistribution & Matching"],
    summary="Recommend Candidate Recipient NGOs for Surplus Donation",
)
def recommend_allocation(
    request: AllocationRecommendRequest,
) -> AllocationRecommendResponse:
    """Filter candidate recipient NGOs against hard constraints and rank eligible recipients.

    Outputs composite match score, delivery probability, proximity distance, and reason codes.
    """
    engine = get_matching_engine()

    donation_dict = request.donation.model_dump()
    # Provide default timestamps if omitted
    now_ts = datetime.now()
    if not donation_dict.get("created_at"):
        donation_dict["created_at"] = now_ts.strftime("%Y-%m-%d %H:%M:%S")
    if not donation_dict.get("prepared_at"):
        donation_dict["prepared_at"] = now_ts.strftime("%Y-%m-%d %H:%M:%S")
    if not donation_dict.get("pickup_deadline"):
        # Default 4-hour window
        deadline = now_ts.timestamp() + 14400
        donation_dict["pickup_deadline"] = datetime.fromtimestamp(deadline).strftime(
            "%Y-%m-%d %H:%M:%S"
        )

    donor_dict = request.donor.model_dump()

    try:
        raw_result = engine.recommend_ngos(
            donation=donation_dict,
            donor=donor_dict,
            top_k=request.top_k,
            min_score=request.min_score,
        )

        recs = [NgoRecommendation(**cand) for cand in raw_result["recommendations"]]

        return AllocationRecommendResponse(
            donation_id=raw_result["donation_id"],
            quantity_meals=raw_result["quantity_meals"],
            food_category=raw_result["food_category"],
            total_candidates_evaluated=raw_result["total_candidates_evaluated"],
            eligible_candidates_count=raw_result["eligible_candidates_count"],
            ineligible_breakdown=raw_result["ineligible_breakdown"],
            recommendations=recs,
            disclaimer=raw_result["disclaimer"],
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to generate allocation recommendations: {exc}",
        ) from exc


@app.post(
    "/api/v1/allocation/evaluate-pair",
    response_model=EvaluatePairResponse,
    tags=["Model B: Redistribution & Matching"],
    summary="Evaluate Single Candidate Pair Feasibility",
)
def evaluate_candidate_pair(request: EvaluatePairRequest) -> EvaluatePairResponse:
    """Check hard eligibility constraints and evaluate match score for a specific (donation, NGO) pair."""
    engine = get_matching_engine()

    donation_dict = request.donation.model_dump()
    donor_dict = request.donor.model_dump()

    # Look up NGO in directory
    matched_ngo_df = engine.ngos_df[engine.ngos_df["ngo_id"] == request.ngo_id]
    if matched_ngo_df.empty:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"NGO with ID '{request.ngo_id}' not found in registry.",
        )

    ngo_dict = matched_ngo_df.iloc[0].to_dict()

    is_eligible, reasons = engine.check_eligibility(donation_dict, donor_dict, ngo_dict)
    eval_card: Optional[NgoRecommendation] = None

    if is_eligible:
        scored = engine.score_candidate(
            donation=donation_dict,
            donor=donor_dict,
            ngo=ngo_dict,
            recommended_quantity=request.recommended_quantity,
        )
        eval_card = NgoRecommendation(**scored)

    return EvaluatePairResponse(
        ngo_id=request.ngo_id,
        is_eligible=is_eligible,
        ineligibility_reasons=reasons,
        evaluation=eval_card,
        disclaimer=SYNTHETIC_DATA_DISCLAIMER,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
