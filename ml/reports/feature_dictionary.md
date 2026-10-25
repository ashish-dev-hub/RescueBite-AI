# RescueBite AI Model A — Feature Dictionary & Specification

> **Synthetic Data Disclaimer**: This feature engineering pipeline is designed for simulation and evaluation using synthetic NGO demand datasets. All formulas, statistical summaries, and performance expectations reflect synthetic data experiments.

---

## 1. Feature Set Summary

The feature engineering pipeline transforms raw daily demand records (`dataset/ngo_demand_daily.csv`), NGO profile metadata (`dataset/ngos.csv`), and holiday calendars (`dataset/holidays.csv`) into an ML-ready feature matrix.

- **Total Engineered Features**: 18
- **Categorical Features**: 1 (`ngo_type`)
- **Numeric Features**: 17
- **Leakage Policy**: Strictly past-only. Every feature for target date $D$ uses data known strictly on or before $D-1$.

---

## 2. Complete Feature Catalog

| Feature Name | Category | Data Type | Available at Cutoff? | Missing Value Policy | Description & Mathematical Formula |
|---|---|---|:---:|---|---|
| `weekday` | Calendar | `int` (0–6) | Yes | None (derived) | Day of the week: Monday = 0, Sunday = 6. |
| `month` | Calendar | `int` (1–12) | Yes | None (derived) | Calendar month index. |
| `day_of_month` | Calendar | `int` (1–31) | Yes | None (derived) | Day of the month index. |
| `is_weekend` | Calendar | `int` (0/1) | Yes | None (derived) | Binary indicator: `1` if `weekday >= 5`, else `0`. |
| `is_holiday` | Calendar | `int` (0/1) | Yes | Defaults to `0` | Binary indicator for official public holidays. |
| `ngo_type` | Static Profile | `str` (category) | Yes | Mode imputation | Operational type (e.g. `shelter`, `soup_kitchen`, `orphanage`). |
| `base_daily_meals` | Static Profile | `float` / `int` | Yes | Median imputation | Contracted standard baseline meal volume for the NGO. |
| `receiving_capacity_meals` | Static Profile | `float` / `int` | Yes | Median imputation | Maximum physical storage/distribution capacity. |
| `accepts_nonveg` | Static Profile | `int` (0/1) | Yes | Mode imputation | Binary indicator of dietary acceptance. |
| `open_hours_span` | Static Profile | `int` / `float` | Yes | Median imputation | Daily operating window: `open_until_hour - open_from_hour`. |
| `demand_lag_7` | Past-Only Lag | `float` | Yes | Median imputation | Observed meals requested at $D - 7$ (same weekday last week). |
| `demand_lag_14` | Past-Only Lag | `float` | Yes | Median imputation | Observed meals requested at $D - 14$ (2 weeks prior). |
| `demand_lag_21` | Past-Only Lag | `float` | Yes | Median imputation | Observed meals requested at $D - 21$ (3 weeks prior). |
| `demand_lag_28` | Past-Only Lag | `float` | Yes | Median imputation | Observed meals requested at $D - 28$ (4 weeks prior). |
| `rolling_mean_7` | Past-Only Rolling | `float` | Yes | Median imputation | Arithmetic mean over shifted 7-day window $[D-7, D-1]$. |
| `rolling_mean_14` | Past-Only Rolling | `float` | Yes | Median imputation | Arithmetic mean over shifted 14-day window $[D-14, D-1]$. |
| `rolling_mean_28` | Past-Only Rolling | `float` | Yes | Median imputation | Arithmetic mean over shifted 28-day window $[D-28, D-1]$. |
| `rolling_std_7` | Past-Only Rolling | `float` | Yes | Imputed as `0.0` | Standard deviation over $[D-7, D-1]$; `0.0` if $\le 1$ observation. |

---

## 3. Mathematical Definitions & Cutoff Guarantees

### A. Calendar Alignment & Reindexing
To prevent distorted lag windows caused by unobserved dates (the 404 missing rows in the synthetic dataset), feature extraction reindexes data onto a continuous daily grid:
$$\text{Grid} = \text{NGOs} \times \{\min(\text{date}), \dots, \max(\text{date})\}$$
- Missing rows remain `NaN` and are never artificially filled as 0 meals.
- This ensures `shift(7)` strictly queries the calendar date $D - 7$ days, never an arbitrary previous row.

### B. Shift Invariant for Rolling Windows
For any target date $D$, rolling windows are calculated with an explicit 1-day shift:
$$\text{rolling\_mean\_k}(D) = \frac{1}{|S_k|} \sum_{t \in S_k} \text{meals\_requested}(t)$$
$$\text{where } S_k = \{t \in \text{Calendar} \mid D - k \le t \le D - 1 \text{ and } \text{meals\_requested}(t) \text{ is observed}\}$$

Target-day demand $\text{meals\_requested}(D)$ has a zero coefficient in all feature computations.

---

## 4. Verification & Testing

The feature pipeline implementation in [`ml/src/rescuebite_ml/features.py`](file:///c:/Users/ashis/OneDrive/Desktop/RescueBite%20AI/ml/src/rescuebite_ml/features.py) is verified via automated pytest tests in [`ml/tests/test_features.py`](file:///c:/Users/ashis/OneDrive/Desktop/RescueBite%20AI/ml/tests/test_features.py):

- **Calendar & Static Features**: Verified across leap months, weekends, and operating span math.
- **Exact Lag Shifts**: Validated against ground truth historical offsets.
- **Unobserved Date Grid**: Verified that missing historical days produce `NaN` rather than pulling incorrect non-lag records.
- **Strict Leakage Invariance**: Verified that changing target-day demand to an extreme value (`99999`) produces 0 changes across all 18 feature values.
- **Chronological Split**: Verified that $\max(\text{train\_date}) < \min(\text{test\_date})$ with 0 overlapping dates.
