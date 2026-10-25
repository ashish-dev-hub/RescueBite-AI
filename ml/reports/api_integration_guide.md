# RescueBite AI — ML Model Serving API Integration Guide

> **Synthetic Data Disclaimer**: This REST API serves model predictions and allocation recommendations derived from synthetic food rescue datasets (`allocations.csv`, `donations.csv`, `donors.csv`, `food_rules.csv`, `ngos.csv`, `ngo_demand_daily.csv`). All outputs reflect simulation and planning experiments.

---

## 1. Overview & Architecture

The RescueBite AI Model Serving Layer is a FastAPI application exposing real-time REST endpoints for downstream integration with the Node.js/Express backend, coordinator dashboards, and mobile volunteer apps.

```
+-------------------------------------------------------+
|  Frontend (React / Vite) / Backend (Express / Node)   |
+-------------------------------------------------------+
                           |
                     (HTTP / JSON)
                           v
+-------------------------------------------------------+
|    FastAPI Serving Layer (ml/src/rescuebite_ml/api.py) |
|           Port: 8000 | Host: 0.0.0.0                  |
+-------------------------------------------------------+
          |                                 |
          v                                 v
+-----------------------+       +-----------------------+
|  Model A: Forecaster  |       |  Model B: Allocator   |
| (DemandPredictor)     |       | (MatchingEngine)      |
| Random Forest (MAE 36)|       | Feasibility Classifier|
+-----------------------+       +-----------------------+
```

---

## 2. Quickstart & Local Execution

### Starting the Server
From the project root:
```powershell
py -m uvicorn rescuebite_ml.api:app --app-dir ml/src --host 0.0.0.0 --port 8000 --reload
```

Interactive OpenAPI Swagger UI is automatically accessible at:
```text
http://localhost:8000/docs
```
Interactive ReDoc documentation:
```text
http://localhost:8000/redoc
```

---

## 3. API Reference & Endpoints

### 3.1 System Endpoints

#### `GET /health`
Verifies service availability.
- **Response**:
```json
{
  "status": "healthy",
  "service": "rescuebite-ml-api",
  "version": "1.0.0",
  "timestamp_utc": "2026-10-26T01:30:00Z"
}
```

#### `GET /api/v1/models/status`
Returns readiness, algorithm metadata, and dataset scope for both loaded models.
- **Response**:
```json
{
  "service": "rescuebite-ml-api",
  "model_a_demand_forecaster": {
    "model_name": "Model A: Demand Forecaster",
    "loaded": true,
    "version": "random_forest_v1",
    "algorithm": "RandomForestRegressor",
    "status": "READY",
    "metadata": {
      "ngo_profiles_count": 30,
      "holidays_count": 27
    }
  },
  "model_b_allocation_matching": {
    "model_name": "Model B: Smart Allocation & Matching Engine",
    "loaded": true,
    "version": "random_forest_v1",
    "algorithm": "RandomForestClassifier",
    "status": "READY",
    "metadata": {
      "registered_ngos_count": 30,
      "food_rules_count": 6
    }
  },
  "disclaimer": "Synthetic-data experiment for operational redistribution planning only."
}
```

---

### 3.2 Model A — Daily NGO Meal Demand Forecasting

#### `POST /api/v1/demand/predict`
Generates a daily meal demand forecast and 10th–90th percentile uncertainty bounds.

- **Request**:
```json
{
  "ngo_id": "N001",
  "forecast_date": "2026-10-26"
}
```

- **Response**:
```json
{
  "ngo_id": "N001",
  "forecast_date": "2026-10-26",
  "predicted_meals": 136.4,
  "baseline_prediction": 140.2,
  "model_version": "random_forest_v1",
  "is_fallback": false,
  "confidence_lower": 118.0,
  "confidence_upper": 155.0,
  "disclaimer": "Synthetic-data experiment for operational redistribution planning only."
}
```

#### `POST /api/v1/demand/predict-batch`
Batch prediction for multiple NGOs across target dates.

- **Request**:
```json
{
  "targets": [
    { "ngo_id": "N001", "forecast_date": "2026-10-26" },
    { "ngo_id": "N002", "forecast_date": "2026-10-26" }
  ]
}
```

---

### 3.3 Model B — Smart Food Redistribution & Allocation

#### `POST /api/v1/allocation/recommend`
Evaluates all registered recipient NGOs against hard constraints (dietary compliance, capacity limits, safe transit hours, operating hours) and returns top-ranked candidates sorted by composite match score.

- **Request**:
```json
{
  "donation": {
    "donation_id": "DON_9821",
    "food_category": "cooked_veg",
    "quantity_meals": 45.0,
    "created_at": "2026-10-26 13:00:00",
    "prepared_at": "2026-10-26 11:30:00",
    "pickup_deadline": "2026-10-26 16:30:00"
  },
  "donor": {
    "donor_id": "D001",
    "donor_type": "restaurant",
    "lat": 28.6139,
    "lon": 77.2090,
    "avg_surplus_meals": 50.0,
    "reliability": 0.94
  },
  "top_k": 3,
  "min_score": 0.0
}
```

- **Response**:
```json
{
  "donation_id": "DON_9821",
  "quantity_meals": 45.0,
  "food_category": "cooked_veg",
  "total_candidates_evaluated": 30,
  "eligible_candidates_count": 30,
  "ineligible_breakdown": {},
  "recommendations": [
    {
      "ngo_id": "N027",
      "ngo_type": "orphanage",
      "match_score": 65.7,
      "success_probability": 0.5061,
      "distance_km": 11.43,
      "travel_minutes": 28.6,
      "recommended_quantity": 45.0,
      "capacity_utilization": 0.455,
      "receiving_capacity_meals": 99.0,
      "base_daily_meals": 58.0,
      "reason_codes": [
        "DIETARY_COMPATIBLE_VEG",
        "ADEQUATE_RECEIVING_CAPACITY",
        "COMFORTABLE_PICKUP_WINDOW",
        "BENEFICIARY_FACILITY_ORPHANAGE"
      ],
      "disclaimer": "Synthetic-data experiment for operational redistribution planning only."
    }
  ],
  "disclaimer": "Synthetic-data experiment for operational redistribution planning only."
}
```

#### `POST /api/v1/allocation/evaluate-pair`
Evaluates operational feasibility and score for a specific (donation, NGO) pair.

---

## 4. Node.js / Express Backend Integration Example

In the RescueBite Express backend (`backend/src/services/mlClient.js`):

```javascript
const axios = require('axios');

const ML_API_BASE = process.env.ML_API_URL || 'http://localhost:8000';

async function getDemandForecast(ngoId, dateStr) {
  const resp = await axios.post(`${ML_API_BASE}/api/v1/demand/predict`, {
    ngo_id: ngoId,
    forecast_date: dateStr,
  });
  return resp.data;
}

async function getRecommendedAllocations(donation, donor, topK = 5) {
  const resp = await axios.post(`${ML_API_BASE}/api/v1/allocation/recommend`, {
    donation,
    donor,
    top_k: topK,
  });
  return resp.data;
}

module.exports = { getDemandForecast, getRecommendedAllocations };
```
