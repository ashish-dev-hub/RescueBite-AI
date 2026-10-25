# RescueBite AI Model A — Data Audit Report

> **Synthetic Data Disclaimer**: This dataset is synthetically generated for demonstration and simulation purposes. All metrics, patterns, and evaluations are synthetic-data experiments and do not represent live operational guarantees.

---

## 1. Input Dataset Verification

Paths resolved using `pathlib.Path`:
- **Demand Dataset**: `dataset/ngo_demand_daily.csv` (Primary target)
- **NGO Master Directory**: `dataset/ngos.csv` (Supporting features & capacities)
- **Holiday Calendar**: `dataset/holidays.csv` (Event indicators)

### Table 1: File Shapes & Dimensions
| Dataset | Rows | Columns | Null Values | Duplicate Rows |
|---|---|---|---|---|
| `ngo_demand_daily.csv` | **15,796** | 4 | 0 | 0 |
| `ngos.csv` | **30** | 9 | 0 | 0 |
| `holidays.csv` | **26** | 2 | 0 | 0 |

---

## 2. Key Target Variable Analysis (`meals_requested`)

- **Total Records**: 15,796
- **Invalid / Negative Values**: 0
- **Summary Statistics**:
  - **Minimum**: 0 meals
  - **25th Percentile**: 87 meals
  - **Median (50th)**: 169 meals
  - **Mean**: 246.24 meals
  - **75th Percentile**: 314 meals
  - **Maximum**: 5,261 meals
  - **Standard Deviation**: 240.16 meals
- **Distribution Characteristics**: Right-skewed distribution with occasional high-volume request peaks.

---

## 3. Date Span & Grid Completeness Audit

- **Date Range**: `2025-05-03` to `2026-10-24` (exactly **540 calendar days**).
- **Unique NGOs**: 30 active NGOs.
- **Expected Full Cartesian Grid** ($30 \times 540$): **16,200** NGO-date records.
- **Actual Records**: **15,796** records.
- **Missing Grid Records**: **404 missing rows** (2.5% of total grid).
- **Records per NGO Range**: Min = 514, Median = 527.0, Max = 531 records per NGO.

> **CRITICAL POLICY ON MISSING RECORDS**: 
> Missing NGO-date records are **NOT automatically zero-demand days**. NGOs may simply not report, operate, or submit requests on certain dates. Imputing zeros without evidence would artificially bias model evaluation downwards. Missing history must be explicitly handled by lagging models via lookups and valid historical windows.

---

## 4. Relational Join Integrity

- **Foreign Key Check (`ngo_id`)**:
  - NGOs in `ngo_demand_daily.csv` not found in `ngos.csv`: **None (0 mismatches)**.
  - NGOs in `ngos.csv` without demand records: **None (0 mismatches)**.
  - Join cardinality is strictly $N:1$ (safe left join without multiplying rows).
- **Key Uniqueness**:
  - Duplicate composite keys `(ngo_id, date)`: **0 duplicates**.

---

## 5. Figures & Visualizations

Figures generated under `ml/reports/figures/`:
1. `daily_demand_timeseries.png`: Total daily demand trajectory over 540 days across the network.
2. `target_distribution.png`: Linear vs. log-transformed target distribution.
