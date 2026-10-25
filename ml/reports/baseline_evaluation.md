# RescueBite AI Model A — Baseline Evaluation Report

> **Synthetic Data Experiment**: Baseline heuristic benchmark for daily NGO meal demand forecasting. All evaluations use synthetic data.

---

## 1. Baseline Model Architecture
- **Rule**: For NGO $ and date $, calculate the arithmetic average of observed demand strictly at:
  -  - 7$ days (1 week ago)
  -  - 14$ days (2 weeks ago)
  -  - 21$ days (3 weeks ago)
  -  - 28$ days (4 weeks ago)
- **Cutoff & Leakage Guarantee**: Observations on or after date $ (, D+1, \dots$) are strictly excluded.
- **Missing History Policy**:
  - Missing dates (e.g. from the 404 unobserved grid records) are omitted from the denominator; available lags are averaged.
  - If 0 lags are available, fallback uses the NGO's registered ase_daily_meals.

---

## 2. Evaluation Metrics (Final 60 Calendar Days Holdout)

| Metric | Result | Benchmark Context |
|---|---|---|
| **Evaluation Window** | 2026-08-26 to 2026-10-24 | Exactly 60 calendar days |
| **Total Test Observations** | **1769** rows | All observed rows in test window |
| **Evaluated Rows** | **1769** rows | Non-null predictions |
| **Prediction Coverage** | **100.0%** | 100% of test records covered |
| **Full 4 Lags Present** | **91.92%** | 91.92% have full 4 prior weeks |
| **Mean Absolute Error (MAE)** | **68.05 meals** | Baseline benchmark target (~68 meals) |
| **Root Mean Squared Error (RMSE)** | **135.61 meals** | Reference for penalizing larger spikes |
| **Fallbacks Used** | **0** | 0 (all NGOs had active history) |

---

## 3. Per-NGO Performance Breakdown

### Top 5 Best-Predicted NGOs (Lowest MAE)
| ngo_id | mae | test_rows |
| --- | --- | --- |
| N022 | 15.22 | 59 |
| N007 | 15.62 | 60 |
| N006 | 16.76 | 58 |
| N027 | 17.98 | 58 |
| N012 | 19.09 | 59 |

### Top 5 Most Volatile NGOs (Highest MAE)
| ngo_id | mae | test_rows |
| --- | --- | --- |
| N002 | 183.36 | 59 |
| N028 | 181.1 | 59 |
| N025 | 180.86 | 59 |
| N014 | 140.21 | 57 |
| N026 | 123.33 | 60 |

---

## 4. Test Suite Verification
All 5 automated tests passed in ml/tests/test_baseline.py:
- 	est_exact_lag_lookup (PASSED)
- 	est_missing_historical_dates (PASSED)
- 	est_insufficient_history_fallback (PASSED)
- 	est_multiple_ngos_isolation (PASSED)
- 	est_leakage_safety (PASSED)
