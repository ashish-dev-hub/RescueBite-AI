# RescueBite AI Model B — Smart Allocation & Matching Engine Contract

> **Synthetic Data Disclaimer**: This allocation and matching system is designed for simulation and evaluation using synthetic food redistribution datasets (`allocations.csv`, `donations.csv`, `donors.csv`, `food_rules.csv`, `ngos.csv`). All metrics, thresholds, and ranking formulas reflect synthetic data experiments.

---

## 1. Problem Formulation & Objective

When a donor lists surplus food, the RescueBite AI platform must recommend candidate recipient NGOs to maximize the likelihood of a successful, safe, and swift food rescue while minimizing food waste.

- **Objective**: Predict the probability of successful delivery:
  $$P(\text{status} = \text{'delivered'} \mid \text{donation}, \text{ngo}, \text{donor}, \text{logistics})$$
- **Downstream Application**: Rank all eligible NGOs for an active donation using a multi-factor composite matching score combining:
  1. Predicted Delivery Probability ($P(\text{delivered})$)
  2. Distance & Travel Feasibility
  3. Capacity & Dietary Fit
  4. Time Urgency & Perishability Constraints

---

## 2. Hard Eligibility Constraints (Pre-Filters)

Before machine learning scoring, candidate (donation, NGO) pairs must satisfy four non-negotiable operational constraints:

1. **Dietary Acceptance**:
   If donation is non-vegetarian (`is_nonveg == True`), recipient NGO **must accept non-veg** (`accepts_nonveg == True`).
2. **Operating Hours**:
   Pickup and delivery must occur within the recipient NGO's operational hours (`open_from_hour` to `open_until_hour`).
3. **Receiving Capacity**:
   Donation quantity must not exceed NGO's receiving capacity (`quantity_meals <= receiving_capacity_meals * 1.5`).
4. **Perishability & Safety Window**:
   Delivery must be feasible before food safety window expires ($\text{travel\_minutes} / 60 < \text{safe\_hours}$).

---

## 3. Data Leakage Audit & Guardrail Invariants

Historical records in `dataset/allocations.csv` and `dataset/donations.csv` contain several columns that are observed **only after** an allocation has been executed.

| Column | Table | Leakage Status | Rationale |
|---|---|:---:|---|
| `remaining_quantity` | `donations.csv` | **LEAKAGE** | Updated only after food is picked up or fails. Strongly negative correlation with delivery. **Strictly forbidden.** |
| `failure_reason` | `allocations.csv` | **LEAKAGE** | Post-hoc diagnostic logged after an allocation fails. **Strictly forbidden.** |
| `approved_quantity` | `allocations.csv` | **LEAKAGE** | Adjusted by NGO/coordinator upon delivery inspection. **Strictly forbidden.** |
| `status` | `allocations.csv` | **TARGET** | Target classification label (`delivered` vs. other). |
| `created_at` (Donation) | `donations.csv` | **SAFE** | Timestamp when donation was posted. |
| `prepared_at` | `donations.csv` | **SAFE** | Timestamp when food was prepared. |
| `pickup_deadline` | `donations.csv` | **SAFE** | Time by which food must be picked up. |
| `quantity_meals` | `donations.csv` | **SAFE** | Initial reported volume of surplus food. |
| `distance_km` / `travel_minutes` | `allocations.csv` | **SAFE** | Pre-computable via coordinates between donor and NGO. |
| `donor_type`, `reliability` | `donors.csv` | **SAFE** | Pre-existing static donor reputation. |
| `ngo_type`, capacities | `ngos.csv` | **SAFE** | Pre-existing registered NGO operational attributes. |
| `food_category`, `safe_hours` | `food_rules.csv` | **SAFE** | Static safety rules based on food type. |

---

## 4. Chronological Splitting Protocol

To mirror real-world operational evaluation and prevent temporal leakage:
- **Evaluation Window (Holdout Test)**: Final 60 calendar days (`2026-08-26` to `2026-10-24`).
- **Training Window**: Prior 480 calendar days (`2025-05-03` to `2026-08-25`).
- **Invariant**: $\max(\text{train\_timestamp}) < \min(\text{test\_timestamp})$.

---

## 5. Output Recommendation Contract Schema

When generating recommendations for an incoming donation, the matching engine outputs:

```json
{
  "donation_id": "DON000001",
  "quantity_meals": 24,
  "food_category": "cooked_veg",
  "recommendations": [
    {
      "ngo_id": "N023",
      "ngo_type": "shelter",
      "match_score": 92.4,
      "success_probability": 0.88,
      "distance_km": 1.8,
      "travel_minutes": 5.2,
      "capacity_fit_ratio": 0.16,
      "reason_codes": [
        "HIGH_DELIVERY_SUCCESS",
        "NEARBY_LOCATION",
        "DIETARY_COMPATIBLE",
        "ADEQUATE_RECEIVING_CAPACITY"
      ],
      "disclaimer": "Synthetic-data experiment for operational redistribution planning only."
    }
  ]
}
```
