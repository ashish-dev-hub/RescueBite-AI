# RescueBite AI - ML Experiments

This project contains food redistribution scheduling algorithms and machine learning experiments.

## Requirements

- Python 3.10 or later
- pandas
- scikit-learn
- matplotlib

## Installation

Run this command to install the required libraries:

python -m pip install -r requirements.txt

## Run the project

Run these commands from this folder:

python main.py
python compare_strategies.py
python compare_quantity_models.py

## Datasets

- foodgo-orders.csv: Food request data
- foodgo-volunteers.csv: Volunteer data
- foodgo-clustered.csv: Clustered food request data

## Experimental results

The current simulation contains 500 food requests and 50 volunteers. The deadline-first strategy assigned 231 requests (46.2%), while the perishable-first strategy assigned 227 requests (45.4%).

These are simulation results, not results from a live service.
