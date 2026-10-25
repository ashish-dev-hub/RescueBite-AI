# RescueBite AI — Model A: NGO Meal Demand Forecasting

Regression forecasting pipeline to predict daily `meals_requested` for recipient NGOs.

---

## 1. Scope & Objective
- **Target**: `meals_requested` (daily count of meals needed by an NGO).
- **Primary Input**: `../dataset/ngo_demand_daily.csv` (15,796 rows across 30 NGOs over 540 days).
- **Supporting Inputs**: `../dataset/ngos.csv` (NGO metadata & capacities), `../dataset/holidays.csv` (calendar events).
- **Baseline**: Same-weekday average demand over the previous 4 weeks (D-7, D-14, D-21, D-28).
- **Candidate Model**: `RandomForestRegressor` with past-only rolling features and lag features.
- **Evaluation**: Chronological holdout on the final 60 calendar days (strictly no random train/test split to prevent leakage).
- **Data Limitation**: The dataset is synthetic. Missing NGO-date rows (404 missing out of full grid) are not automatically zero-demand days.

---

## 2. Directory Structure
```
ml/
├── notebooks/
│   ├── 01_data_audit.ipynb               # Phase 1: Comprehensive data audit
│   └── 02_model_a_demand_forecasting.ipynb # Pipeline exploration
├── src/
│   └── rescuebite_ml/
│       ├── __init__.py
│       ├── data.py                       # Data loading & integrity checks
│       ├── features.py                   # Past-only feature engineering
│       ├── baseline.py                   # Same-weekday rolling baseline
│       ├── train.py                      # Chronological pipeline training
│       ├── evaluate.py                   # Metrics (MAE, RMSE, coverage)
│       └── predict.py                    # Inference interface
├── models/                               # Serialized model artifacts (.joblib)
├── reports/
│   ├── figures/                          # EDA & residual plots
│   ├── data_audit.md                     # Data audit report
│   ├── prediction_contract.md            # Feature contract & leakage policy
│   ├── feature_dictionary.md             # Feature definitions
│   └── evaluation.md                     # Final model benchmark comparison
├── tests/                                # Test suite (pytest)
├── requirements.txt                      # Python dependencies
├── .gitignore                            # ML-specific ignore rules
└── README.md                             # Model documentation
```

---

## 3. Environment & Setup
From the repository root:
```bash
py -m venv ml/.venv
ml\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r ml/requirements.txt
```
