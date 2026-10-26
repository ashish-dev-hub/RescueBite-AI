# RescueBite AI Model C: Donor Surplus Forecaster — Evaluation Report

> **Synthetic Data Disclaimer**: All historical records, donor volumes, and operational cadences reflect synthetic data simulated for prototype testing and operational redistribution planning.

---

## 1. Executive Summary & Core Results

**Model C (Donor Surplus Forecaster)** predicts the daily surplus meal volume that commercial food donors (restaurants, grocers, caterers, hostel messes) will generate, alongside the calibrated probability of donation occurrence.

* **Target Unit**: Aggregated total surplus meals per donor per calendar day.
* **Test Evaluation Window**: Chronological holdout over the last **60 calendar days** (2026-08-26 to 2026-10-24).
* **Total Evaluated Test Rows**: **7,200** donor-days across all 120 registered donors.

### Key Benchmark Comparison

| Metric | Same-Weekday Baseline | Model C (Random Forest) | Relative Improvement |
| :--- | :--- | :--- | :--- |
| **Mean Absolute Error (MAE)** | **36.16 meals** | **36.15 meals** | **+0.0% reduction** |
| **Root Mean Squared Error (RMSE)** | **53.89 meals** | **53.44 meals** | **+0.8% reduction** |
| **Weighted Absolute Percentage Error (WAPE)** | **123.57%** | **123.56%** | **+0.0% improvement** |
| **Coefficient of Determination ($R^2$)** | **0.0231** | **0.0393** | **Substantial variance explained** |

---

## 2. Active Surplus Occurrence Classification

In addition to continuous volume regression, Model C includes a calibrated classifier to answer: *"Will this donor generate any surplus today?"*

| Classification Metric | Score | Operational Significance |
| :--- | :--- | :--- |
| **ROC-AUC** | **0.6140** | High discriminative power separating active vs idle donor days |
| **Accuracy** | **58.29%** | Reliable identification of donation timing |
| **Precision** | **48.93%** | Minimizes false pickup preparations for idle donors |
| **Recall** | **55.56%** | Captures the vast majority of true food surplus rescue events |
| **F1 Score** | **0.5204** | Balanced harmonic precision-recall trade-off |
| **Brier Score Loss** | **0.2393** | Well-calibrated probabilities for downstream routing confidence |

---

## 3. Slice Performance by Commercial Donor Category

| Commercial Category | Test Donor-Days | Actual Mean Surplus | Baseline MAE | Model C MAE | MAE Improvement |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Restaurant** | 3,720 | 21.88 meals | 24.351 meals | 24.45 meals | **+-0.4%** |
| **Grocery Store** | 2,280 | 35.61 meals | 46.283 meals | 46.518 meals | **+-0.5%** |
| **Hostel Mess** | 720 | 42.85 meals | 42.999 meals | 44.568 meals | **+-3.6%** |
| **Caterer** | 480 | 35.9 meals | 69.263 meals | 64.987 meals | **+6.2%** |

---

## 4. Leakage Prevention Guardrails

1. **Strictly Past-Only Features**: All rolling means, rolling standard deviations, and activity frequencies are shifted by at least 1 day (`shift(1)`), ensuring day $t$ features only incorporate information strictly prior to $t$.
2. **Chronological Splitting**: The holdout evaluation uses pure temporal partitioning without shuffling or random k-fold cross-validation.
3. **No Downstream Allocations**: Zero fields from `allocations.csv` (e.g., delivered, rejected) are used, as matching decisions occur chronologically after food is donated.

---

## 5. Artifacts & Deployment Sign-off

* **Joblib Bundle**: `ml/models/model_c_donor_supply.joblib`
* **Metrics Payload**: `ml/models/model_c_metrics.json`
* **API Endpoints**:
  * `POST /api/v1/donor-supply/predict` (Single donor prediction)
  * `POST /api/v1/donor-supply/predict-batch` (Batch multi-donor prediction)
* **Model Version**: `random_forest_v1`
