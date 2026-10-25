# RescueBite AI Model A — Model Evaluation & Benchmark Report

> **Synthetic Data Experiment**: This forecasting system operates on synthetic data for food redistribution planning and simulation. All metrics, error comparisons, and performance statistics reflect synthetic data experiments.

---

## 1. Executive Summary & Benchmark Comparison

Model A is a leak-free Random Forest regressor with past-only rolling and same-weekday lag features. Both the baseline heuristic and Model A were evaluated on the exact same holdout window: the final 60 calendar days (`2026-08-26` to `2026-10-24`, 1,769 observed records).

| Metric | Baseline Heuristic | Model A (Random Forest) | Net Improvement |
|---|---|---|---|
| **Mean Absolute Error (MAE)** | 71.14 meals | **61.57 meals** | **+13.45% reduction** |
| **Root Mean Squared Error (RMSE)** | 141.19 meals | **126.39 meals** | **+10.48% reduction** |
| **$R^2$ Score (Test Holdout)** | — | **0.7000** | Strong predictive fit |
| **Prediction Coverage** | 100.0% | **100.0%** | Full coverage |
| **Evaluated Observations** | 1,769 rows | **1,769 rows** | Exactly identical test set |
| **Training Observations** | Prior history | **14,027 rows** | Chronologically partitioned ($< 2026\text{-}08\text{-}26$) |

---

## 2. Model Pipeline Architecture

The model is packaged as a scikit-learn pipeline to guarantee preprocessing fit isolation:

```
Input Features (18)
    ├── Numeric Features (17) ──────> SimpleImputer(strategy='median') ──────┐
    └── Categorical ('ngo_type') ───> OneHotEncoder(handle_unknown='ignore') ──┴──> RandomForestRegressor(n_estimators=150, max_depth=12, ...)
```

### Hyperparameters:
- `n_estimators`: 150
- `max_depth`: 12
- `min_samples_split`: 6
- `min_samples_leaf`: 3
- `max_features`: `"sqrt"`
- `random_state`: 42

---

## 3. Feature Importance Analysis

Feature importances extracted from the trained Random Forest regressor demonstrate that past rolling demand averages and baseline contracted capacities provide the strongest predictive signals:

| Rank | Feature Name | Importance Weight | Category | Operational Interpretation |
|---|---|---|---|---|
| 1 | `rolling_mean_28` | **16.82%** | Rolling Window | Medium-term baseline demand stability |
| 2 | `base_daily_meals` | **15.99%** | Static Profile | NGO contracted capacity anchor |
| 3 | `rolling_mean_14` | **15.30%** | Rolling Window | Bi-weekly seasonal adjustment |
| 4 | `rolling_mean_7` | **10.04%** | Rolling Window | Immediate 1-week momentum |
| 5 | `demand_lag_7` | **8.25%** | Same-Weekday Lag | 1-week-ago same-day pattern |
| 6 | `demand_lag_14` | **7.63%** | Same-Weekday Lag | 2-weeks-ago same-day pattern |
| 7 | `demand_lag_28` | **6.74%** | Same-Weekday Lag | 4-weeks-ago same-day pattern |
| 8 | `demand_lag_21` | **4.68%** | Same-Weekday Lag | 3-weeks-ago same-day pattern |
| 9 | `rolling_std_7` | **4.65%** | Volatility | Short-term demand variance |
| 10 | `receiving_capacity_meals` | **1.92%** | Static Profile | Physical storage constraint |

---

## 4. Per-NGO Performance Breakdown

### Top 5 Best Predicted NGOs (Lowest Test MAE)
| NGO ID | Test MAE | Test RMSE | Evaluated Rows | Profile Type |
|---|---|---|---|---|
| **N022** | **14.12** | 17.24 | 59 | Consistent low-variance demand |
| **N007** | **14.69** | 20.19 | 60 | Stable weekday schedule |
| **N006** | **16.42** | 20.01 | 58 | Predictable meal counts |
| **N027** | **16.54** | 20.91 | 58 | Strong lag-7 correlation |
| **N012** | **16.87** | 21.92 | 59 | Regular community shelter |

### Top 5 Most Volatile NGOs (Highest Test MAE)
| NGO ID | Test MAE | Test RMSE | Evaluated Rows | Profile Type |
|---|---|---|---|---|
| **N028** | 176.98 | 225.86 | 59 | High-volume spikes |
| **N025** | 160.35 | 389.96 | 59 | Event-driven sudden surges |
| **N002** | 157.57 | 189.76 | 59 | High baseline soup kitchen |
| **N014** | 120.05 | 158.70 | 57 | Occasional surge days |
| **N008** | 103.75 | 135.72 | 60 | Variable weekend patterns |

---

## 5. Leakage Guardrail Audit & Verification

1. **Chronological Invariant**:
   - $\max(\text{train\_date}) = \text{2026-08-25} < \min(\text{test\_date}) = \text{2026-08-26}$.
   - Exact calendar boundary maintained with 0 shared dates.
2. **Preprocessing Isolation**:
   - `ColumnTransformer` and imputers were fit solely on the training partition.
3. **Past-Only Rolling Shifts**:
   - All rolling and lag features are shifted by at least 1 day ($[D-k, D-1]$). Day $D$ actual demand was strictly excluded.
4. **Reproducibility**:
   - Model saved to `ml/models/model_a.joblib`.
   - Metrics exported to `ml/models/metrics.json`.
   - Verified by 13 automated tests across `ml/tests/`.
