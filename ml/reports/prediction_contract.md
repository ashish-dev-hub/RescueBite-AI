# RescueBite AI Model A — Prediction Contract & Leakage Guardrails

> **Synthetic Data Disclaimer**: This forecasting system operates on synthetic data for food redistribution simulation. All metrics and specifications represent synthetic-data experiments.

---

## 1. Prediction Grain & Scope

| Attribute | Specification |
|---|---|
| **Prediction Grain** | Single NGO per calendar day: `(ngo_id, forecast_date)` |
| **Target Variable** | `meals_requested` (non-negative integer representing daily requested meals) |
| **Operational Horizon** | Next-day forecasting ($T+1$ ahead) |
| **Evaluation Window** | Final 60 calendar days (`2026-08-26` to `2026-10-24`) |
| **Training Window** | Prior 480 calendar days (`2025-05-03` to `2026-08-25`) |

---

## 2. Forecast Cutoff Definition

- **Cutoff Timestamp**: `23:59:59` on Day $D-1$ (immediately prior to target date $D$).
- **Strict Invariant**: Any feature input to the model for predicting date $D$ **must be known or observable on or before date $D-1$**.
- **Data Leakage Boundary**: Target-day actual demand (`meals_requested` on date $D$), post-event allocation feedback, and any records from dates $> D-1$ are strictly forbidden from entering feature pipelines.

---

## 3. Feature Availability & Leakage Audit Matrix

| Feature Name | Source | Available at Cutoff? | Leakage Status | Description & Formula |
|---|---|:---:|:---:|---|
| `weekday` | Calendar (`date`) | Yes | Safe | Day of week (0 = Monday, 6 = Sunday) |
| `month` | Calendar (`date`) | Yes | Safe | Calendar month (1–12) |
| `day_of_month` | Calendar (`date`) | Yes | Safe | Day index (1–31) |
| `is_weekend` | Calendar (`date`) | Yes | Safe | Binary flag: `weekday >= 5` |
| `is_holiday` | `dataset/holidays.csv` | Yes | Safe | Known public holiday calendar |
| `ngo_type` | `dataset/ngos.csv` | Yes | Safe | Categorical NGO profile (Shelter, Kitchen, etc.) |
| `base_daily_meals` | `dataset/ngos.csv` | Yes | Safe | Baseline contracted capacity |
| `receiving_capacity_meals` | `dataset/ngos.csv` | Yes | Safe | Storage capacity constraint |
| `accepts_nonveg` | `dataset/ngos.csv` | Yes | Safe | Dietary acceptance flag |
| `open_hours_span` | `dataset/ngos.csv` | Yes | Safe | Operating window (`open_until - open_from`) |
| `demand_lag_7` | `ngo_demand_daily.csv` | Yes | Safe | $D-7$ same-weekday demand |
| `demand_lag_14` | `ngo_demand_daily.csv` | Yes | Safe | $D-14$ same-weekday demand |
| `demand_lag_21` | `ngo_demand_daily.csv` | Yes | Safe | $D-21$ same-weekday demand |
| `demand_lag_28` | `ngo_demand_daily.csv` | Yes | Safe | $D-28$ same-weekday demand |
| `rolling_mean_7` | `ngo_demand_daily.csv` | Yes | Safe | Shifted 7-day rolling average: $[D-7, D-1]$ |
| `rolling_mean_14` | `ngo_demand_daily.csv` | Yes | Safe | Shifted 14-day rolling average: $[D-14, D-1]$ |
| `rolling_mean_28` | `ngo_demand_daily.csv` | Yes | Safe | Shifted 28-day rolling average: $[D-28, D-1]$ |
| `rolling_std_7` | `ngo_demand_daily.csv` | Yes | Safe | Shifted 7-day volatility: $[D-7, D-1]$ |
| `meals_requested[D]` | `ngo_demand_daily.csv` | **No** | **LEAKAGE** | **Target variable on forecast date. Strictly forbidden.** |
| `actual_allocation[D]` | Operational logs | **No** | **LEAKAGE** | Allocation result occurring after prediction. |
| `future_demand[D+k]` | `ngo_demand_daily.csv` | **No** | **LEAKAGE** | Unobservable future data. |

---

## 4. Cold-Start & Missing History Policies

### Policy A: Missing Grid Rows (Handling the 404 Missing Dates)
- The dataset has 404 missing NGO-date rows across 30 NGOs over 540 days.
- **Rule**: Missing dates are **never imputed as zero**. They represent unobserved/non-reporting days.
- **Lag Resolution**: When calculating lag $D-k$, if that specific date is missing for that NGO, the feature will be `NaN` and imputed using the training-fold median inside the scikit-learn pipeline.

### Policy B: Insufficient History (< 28 Days Active)
- For NGOs newly onboarded with fewer than 28 days of observations:
  - If 4 same-weekday lags are incomplete, the baseline calculates the mean of available prior same-weekdays (minimum 1 valid observation).
  - If no historical same-weekdays exist, fallback defaults to the NGO's `base_daily_meals`.

### Policy C: Unknown NGO ID at Inference Time
- When inference is requested for an unknown or unobserved NGO:
  - Static features (`base_daily_meals`, `receiving_capacity_meals`, `ngo_type`) provide the primary signal.
  - Missing lag and rolling features are populated via the pre-fitted training pipeline imputer (`SimpleImputer(strategy='median')`).

---

## 5. Output Contract Schema

```json
{
  "ngo_id": "NGO-001",
  "forecast_date": "2026-10-25",
  "predicted_meals": 185.0,
  "baseline_prediction": 172.5,
  "model_version": "random_forest_v1",
  "is_fallback": false,
  "confidence_lower": 150.0,
  "confidence_upper": 220.0,
  "disclaimer": "Synthetic-data experiment for operational redistribution planning only."
}
```

---

## 6. Preprocessing & Splitting Protocol

1. **Chronological Splitting**:
   - `train_cutoff`: `< 2026-08-26`
   - `test_cutoff`: `>= 2026-08-26`
   - Maximum training date must be strictly earlier than minimum test date: $\max(Train) < \min(Test)$.
2. **Preprocessing Fit Isolation**:
   - Imputers, encoders (`OneHotEncoder`), and scalers must be fit **only on training data** within an `sklearn.pipeline.Pipeline`.
   - Never fit any transformer on the concatenated train+test data.
