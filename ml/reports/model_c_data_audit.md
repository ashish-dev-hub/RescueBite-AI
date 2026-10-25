# RescueBite AI Model C — Data Audit & Target Feasibility Report

> **Synthetic Data Disclaimer**: This dataset is synthetically generated for simulation and prototype demonstration purposes. All metrics, donor behaviors, and historical records reflect simulated parameters and must not be interpreted as empirical guarantees of live real-world operational distributions.

---

## 1. Executive Summary & Audit Objectives

The objective of **Model C (Donor Surplus Prediction)** within RescueBite AI is to estimate the future volume of surplus meals each commercial donor is likely to generate. While Model A projects recipient NGO meal demand, Model C projects food rescue supply.

Before formulating features or training baseline heuristics, this audit inspects the four relevant project datasets:
1. `dataset/donations.csv` — Primary transaction log of surplus donations.
2. `dataset/donors.csv` — Donor profiles, geographical coordinates, static baseline averages, and reliability ratings.
3. `dataset/holidays.csv` — Calendar holiday markers.
4. `dataset/allocations.csv` — Allocation dispatch history (referenced for context only).

---

## 2. Dataset Schema & Data Integrity Analysis

### 2.1 File Shapes & Primary Keys

| Dataset | File Path | Total Rows | Total Columns | Unique Entity Key | Null Values | Duplicate Keys |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Donors** | `dataset/donors.csv` | 120 | 6 | `donor_id` (120 unique) | 0 (0.0%) | 0 (None) |
| **Donations** | `dataset/donations.csv` | 29,674 | 8 | `donation_id` (29,674 unique) | 0 (0.0%) | 0 (None) |
| **Holidays** | `dataset/holidays.csv` | 26 | 2 | `date` (26 unique) | 0 (0.0%) | 0 (None) |
| **Allocations** | `dataset/allocations.csv` | 28,396 | 10 | `allocation_id` (28,396 unique) | 0 (0.0%) | 0 (None) |

### 2.2 Detailed Column Profiles & Types

#### `dataset/donors.csv`
* `donor_id` (`str`): Unique identifier (`D001` through `D120`).
* `donor_type` (`str`): Commercial classification:
  * `restaurant`: 62 donors (51.7%)
  * `grocery`: 38 donors (31.7%)
  * `hostel_mess`: 12 donors (10.0%)
  * `caterer`: 8 donors (6.7%)
* `lat`, `lon` (`float64`): GPS coordinates within the Delhi-NCR operational region.
* `avg_surplus_meals` (`int64`): Statically assigned profile estimate (Min: 35, Median: 78, Max: 245).
* `reliability` (`float64`): Static historical fulfillment score (Min: 0.72, Median: 0.88, Max: 0.98).

#### `dataset/donations.csv`
* `donation_id` (`str`): Unique donation batch code (`DON000001` through `DON029674`).
* `donor_id` (`str`): Foreign key to `donors.csv`. All 120 registered donors appear in `donations.csv`.
* `created_at` (`str` / ISO-8601): Exact timestamp when surplus batch was submitted (e.g. `2025-05-03T13:20:33+05:30`).
* `prepared_at` (`str` / ISO-8601): Kitchen preparation timestamp.
* `pickup_deadline` (`str` / ISO-8601): Expiration cutoff before safe consumption threshold lapses.
* `food_category` (`str`): Food type (`cooked_veg`: 11,722, `cooked_nonveg`: 8,047, `bakery`: 3,814, `fruit_veg_raw`: 2,516, `packaged`: 2,506, `dairy`: 1,069).
* `quantity_meals` (`int64`): Volume of meals in the donation offer.
* `remaining_quantity` (`int64`): Meals remaining unassigned after matching.

---

## 3. Date Ranges & Temporal Observations

* **Observation Start Date**: `2025-05-03`
* **Observation End Date**: `2026-10-24`
* **Total Elapsed Period**: Exactly **540 calendar days** (~18 months).
* **Calendar Continuity**: Every single calendar day in the 540-day span has active donation activity. There are no missing whole-system operational dates.
* **Donor Lifespans**:
  * Every donor's earliest donation occurred between `2025-05-03` and `2025-05-14`.
  * Every donor's latest donation occurred between `2026-10-05` and `2026-10-24`.
  * **Finding**: All 120 donors were active across the full 540-day window. There are no late-onboarded cohorts.

---

## 4. Quantity Distribution & Target Analysis

### 4.1 Individual Donation Level (`quantity_meals`)

| Metric | Individual Donation Level |
| :--- | :--- |
| **Count** | 29,674 records |
| **Mean** | 64.8 meals |
| **Std Dev** | 72.9 meals |
| **Min** | 8 meals |
| **5th Percentile** | 12 meals |
| **25th Percentile (Q1)** | 25 meals |
| **50th Percentile (Median)**| 44 meals |
| **75th Percentile (Q3)** | 78 meals |
| **90th Percentile** | 134 meals |
| **95th Percentile** | 184 meals |
| **99th Percentile** | 345 meals |
| **Max** | 1,500 meals |

### 4.2 Aggregated Daily Donor Level (`total_surplus_meals`)

Because Model C predicts at the **donor-day** unit (total surplus a donor will offer on a given calendar date), individual donations within the same day must be aggregated:

$$\text{total\_surplus\_meals}_{d, t} = \sum_{i \in \text{Donations}_{d, t}} \text{quantity\_meals}_i$$

* **Active Donor-Days Observed**: 25,794
* **Donations Per Active Donor-Day**:
  * 1 donation: 21,914 days (85.0%)
  * 2 donations: 3,880 days (15.0%)
  * $\ge 3$ donations: 0 days (0.0%)

#### Aggregated Daily Surplus Statistics (On Active Days):
* **Mean**: 74.5 meals
* **Median**: 52.0 meals
* **IQR**: 29.0 to 92.0 meals
* **90th Percentile**: 153.0 meals
* **99th Percentile**: 368.0 meals
* **Max**: 1,500.0 meals

---

## 5. Donor-Day Observation Window & Zero-Surplus Analysis

### 5.1 The Panel Completeness Question

A fundamental question for regression modeling is whether the absence of a record in `donations.csv` represents:
1. **Legitimate Zero Surplus**: The donor operated, had no surplus food to rescue, and offered 0 meals.
2. **Missing Observation / Closed Facility**: The facility was closed, did not report, or had no data logging on that day.

#### Mathematical Dimensions:
* Total unique registered donors: $N = 120$
* Total observed calendar days: $T = 540$
* Full Cartesian product ($N \times T$): **64,800 donor-days**
* Observed positive donation days: **25,794 donor-days** (**39.81%**)
* Unrecorded donor-days: **39,006 donor-days** (**60.19%**)

### 5.2 Cadence by Donor Type

| Donor Type | Donors Count | Total Active Days | Avg Active Days / Donor | Typical Daily Frequency | Mean Surplus on Active Days |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Restaurant** | 62 | 15,692 | 253.1 / 540 (46.9%) | ~3.3 days / week | 39.5 meals |
| **Grocery Store** | 38 | 6,244 | 164.3 / 540 (30.4%) | ~2.1 days / week | 100.0 meals |
| **Hostel Mess** | 12 | 2,971 | 247.6 / 540 (45.8%) | ~3.2 days / week | 69.7 meals |
| **Caterer** | 8 | 887 | 110.9 / 540 (20.5%) | ~1.4 days / week (Event-driven) | 247.1 meals |

### 5.3 Recommendation on Target Definition (Two-Part Formulation)

Because the synthetic generator created donation records when surplus events occurred:
* **Option A (Zero-Inflated Full Panel)**: Expand to full $64,800$ rows, filling unrecorded days with `total_surplus_meals = 0`.
  * *Advantage*: Matches operational question: "On any given day $t$, how much surplus should we expect from donor $d$?"
  * *Distribution*: 60.2% exact zeros, 39.8% positive continuous values ($[8, 1500]$).
  * *Modeling Approach*: Hurdle model or Random Forest trained on the zero-filled panel, with optional binary classifier $P(\text{has\_surplus} > 0)$.
* **Option B (Conditional Surplus on Active Days)**: Train regression solely on positive donation days ($25,794$ rows), estimating expected volume *given that an offer occurs*.

> **Recommendation for Phase 2**: Adopt **Option A (Full Donor-Day Panel with Explicit Zero-Surplus Days)** as the primary prediction target, as it directly answers the platform's supply-demand balancing objective. The baseline and candidate models will be evaluated on the complete panel with strict leakage-free temporal lags.

---

## 6. Contextual Dataset: `allocations.csv`

The allocations file was inspected solely to verify downstream outcome integrity:
* Contains 28,396 allocation attempts covering 25,038 unique donations.
* Outcomes: `delivered` (76.7%), `rejected_by_ngo` (9.4%), `expired` (4.3%), `rejected_by_coordinator` (4.1%), `failed_delivery` (3.4%), `cancelled` (2.1%).
* **Leakage Guardrail**: No field from `allocations.csv` may ever be used as an input feature for Model C, as allocation outcomes occur chronologically *after* donor surplus is submitted.

---

## 7. Phase 1 Deliverables Summary

| Artifact | Location | Description |
| :--- | :--- | :--- |
| **Data Audit Script** | `ml/notebooks/audit_model_c.py` | Executable verification script inspecting schemas, distributions, and nulls. |
| **Cadence Check Script**| `ml/notebooks/check_donor_cadence.py` | Temporal span, lifespans, and weekday frequency analysis script. |
| **Jupyter Notebook** | `ml/notebooks/02_model_c_data_audit.ipynb` | Formatted interactive audit notebook. |
| **Audit Report** | `ml/reports/model_c_data_audit.md` | Comprehensive data audit and target feasibility documentation. |

---

## 8. Acceptance Checklist (Phase 1)

- [x] Inspected `donations.csv`, `donors.csv`, `holidays.csv`, and `allocations.csv`.
- [x] Verified data types, row counts, null counts (0 nulls found), and duplicate keys (0 duplicates found).
- [x] Reported complete quantity distributions (Mean: 64.8 meals, Median: 44.0 meals, Max: 1500.0 meals).
- [x] Verified temporal span: 540 calendar days (`2025-05-03` to `2026-10-24`) with all 120 donors active across the entire span.
- [x] Analyzed donor-day panel completeness (25,794 active days / 64,800 grid days = 39.81% positive surplus days).
- [x] Documented weekday and donor-type cadence.
- [x] Established strict zero-leakage guardrails (allocations data strictly excluded).
- [x] **Zero models trained** in Phase 1 per project instructions.
