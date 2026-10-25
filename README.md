# RescueBite AI — Machine Learning & Datasets

This branch (`ml`) contains the dataset collections, redistribution optimization algorithms, constraint evaluation models, and machine learning experiments for RescueBite AI.

---

## Repository Structure

```
.
├── dataset/                    # Comprehensive redistribution datasets
│   ├── allocations.csv         # Allocation history and matching logs
│   ├── donations.csv           # Food donation logs (perishability, shelf life, quantities)
│   ├── donors.csv              # Commercial food donor profiles and coordinates
│   ├── ngos.csv                # Recipient NGO profiles, storage capacities, and constraints
│   ├── ngo_demand_daily.csv    # Daily demand patterns by NGO and meal type
│   ├── food_rules.csv          # Safe storage and handling temperature rules
│   └── holidays.csv            # Calendar event and holiday surplus indicators
└── ml/                         # ML algorithms and experimental pipelines
    ├── main.py                 # Core allocation and matching engine
    ├── balanced_main.py        # Balanced priority allocation strategy
    ├── improved_main.py        # Constraint-relaxed allocation strategy
    ├── train_demand_model.py   # NGO demand forecasting model training
    ├── compare_strategies.py   # Multi-strategy benchmark (deadline-first vs perishability-first)
    ├── compare_quantity_models.py # Quantity prediction model evaluation
    ├── diagnose_constraints.py # Constraint breakdown diagnostic tool
    ├── diagnose_failures.py    # Allocation failure mode analyzer
    ├── evaluate.py             # Match efficiency and coverage metrics
    ├── requirements.txt        # Python dependency manifest
    └── *.csv                   # Simulation results and cluster outputs
```

---

## Setup & Running Experiments

### 1. Install Dependencies
```bash
pip install -r ml/requirements.txt
```

### 2. Run Scheduling & Allocation Strategies
```bash
python ml/main.py
python ml/balanced_main.py
python ml/compare_strategies.py
```

### 3. Run Diagnostics & Evaluations
```bash
python ml/diagnose_constraints.py
python ml/compare_quantity_models.py
```
