# RescueBite AI — The Fresh Network

An intelligent, explainable food redistribution ecosystem connecting commercial food donors (restaurants, caterers, grocers) with community kitchens and recipient NGOs to eliminate food waste and fight hunger.

---

## 🌟 Architecture Overview

RescueBite AI operates as a unified full-stack platform:

```
+-----------------------------------------------------------------------------------------+
|                                     FRONTEND (React 19 + Vite)                          |
|  - CoordinatorDesk: Displays Model B P(Delivered) probability & AI match reason tags     |
|  - NgoDashboard: Displays Model A Next-Day Demand Forecast banner & Prefill action      |
|  - ReasonCodeBadge: Visual badges for all Model B ML explanation codes                  |
+-----------------------------------------------------------------------------------------+
                                             |
                                  (HTTP / JSON - Port 5000)
                                             v
+-----------------------------------------------------------------------------------------+
|                                   BACKEND (Express 5 + Node.js)                         |
|  - mlClient.js: Resilient HTTP client communicating with Python FastAPI serving layer   |
|  - matchingController.js: Enhances matches with Model B predictions + fallback          |
|  - demandController.js: GET /api/demands/forecast serving Model A predictions           |
|  - MongoDB Atlas: Users, Donations, Demands, Allocations                                 |
+-----------------------------------------------------------------------------------------+
                                             |
                                  (HTTP / JSON - Port 8000)
                                             v
+-----------------------------------------------------------------------------------------+
|                                   ML SERVING LAYER (FastAPI)                            |
|  - Model A: Demand Forecaster (RandomForestRegressor, 10th-90th percentile bounds)     |
|  - Model B: Allocation Engine (RandomForestClassifier, composite match score 0-100)     |
|  - Health & Model Registry: GET /health, GET /api/v1/models/status                     |
+-----------------------------------------------------------------------------------------+
```

- **Frontend**: React 19 + Vite SPA (Styled with custom CSS tokens, modern glassmorphism aesthetic).
- **Backend API**: Node.js + Express 5 REST API (JWT auth, MongoDB Atlas, ML client integration).
- **ML Subsystem**: Python 3.14 + FastAPI + scikit-learn (Model A Forecaster, Model B Allocator).
- **Database**: MongoDB Atlas.

---

## 🚀 Quickstart & Local Development

From the project root:

### 1. Install Dependencies
```bash
# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..

# Python ML Environment
py -m pip install -r ml/requirements.txt
```

### 2. Run All Services
```bash
# Terminal 1 — Python ML Service (Port 8000)
npm run dev:ml

# Terminal 2 — Node.js Express Backend (Port 5000)
npm run dev:backend

# Terminal 3 — React Vite Frontend (Port 5173)
npm run dev:frontend
```

### 3. Run Automated ML Tests
```bash
npm run test:ml
```
*(Runs 35 unit & integration tests covering feature engineering, model training, contract schemas, and FastAPI endpoints).*

---

## 🤖 Machine Learning Capabilities

### Model A — NGO Meal Demand Forecaster
- **Objective**: Predict daily meal demand for recipient NGOs while observing past-only lag invariants (strictly zero temporal leakage).
- **Architecture**: `RandomForestRegressor` with median imputation and one-hot encoding.
- **Uncertainty Bounds**: 10th and 90th empirical tree ensemble percentiles.
- **Evaluation**: $\text{MAE} \le 36.6$ meals (outperforming the 68.05 meal same-weekday baseline by **46.2%**).

### Model B — Smart Food Redistribution & Allocation Engine
- **Objective**: Predict delivery feasibility $P(\text{delivered})$ and rank eligible NGOs for active surplus donations.
- **Hard Constraint Gates**: Non-negotiable filtering of dietary mismatches (non-veg to veg-only), capacity overloads ($>150\%$), operating hours, and perishability safe hours.
- **Composite Match Scoring (0–100)**: Combines model probability (40%), proximity (25%), capacity fit (20%), and urgency buffers (15%).
- **Explainable Reason Codes**: `HIGH_DELIVERY_SUCCESS`, `NEARBY_LOCATION`, `DIETARY_COMPATIBLE_VEG`, `ADEQUATE_RECEIVING_CAPACITY`, `COMFORTABLE_PICKUP_WINDOW`.

### ML FastAPI Serving Layer Endpoints
- `GET /health` — Service health and timestamp.
- `GET /api/v1/models/status` — Model registry status and metadata.
- `POST /api/v1/demand/predict` — Single NGO demand forecast with confidence intervals.
- `POST /api/v1/demand/predict-batch` — Batch forecasts across multiple NGOs.
- `POST /api/v1/allocation/recommend` — Multi-candidate ranking with reason codes.
- `POST /api/v1/allocation/evaluate-pair` — Single pair feasibility check.

Interactive OpenAPI documentation available at `http://localhost:8000/docs`.

---

## 🌐 Production Deployment Guide

### Part 1: Deploy Backend on Render

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Configure production deployment"
   git push origin main
   ```

2. **Allow MongoDB Atlas Network Access**:
   - Go to [MongoDB Atlas](https://cloud.mongodb.com/).
   - Navigate to **Security** -> **Network Access**.
   - Ensure `0.0.0.0/0` (Allow Access from Anywhere) is added to your IP Access List so Render can connect.

3. **Create Web Service on Render**:
   - In [Render Dashboard](https://dashboard.render.com/), click **New +** -> **Web Service**.
   - Connect repository `RescueBite-AI`.
   - Settings:
     - **Name**: `rescuebite-backend`
     - **Branch**: `main`
     - **Root Directory**: `backend`
     - **Runtime**: `Node`
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Instance Type**: `Free`

4. **Environment Variables on Render**:
   | Key | Value | Description |
   |---|---|---|
   | `NODE_ENV` | `production` | Enables production mode |
   | `MONGO_URI` | `mongodb+srv://...` | MongoDB Atlas URI |
   | `JWT_SECRET` | *(32+ character string)* | Secret for signing tokens |
   | `JWT_EXPIRES_IN` | `7d` | Token expiration |
   | `CORS_ORIGIN` | `https://<your-app>.vercel.app` | Vercel domain |
   | `ML_API_URL` | `https://<your-ml-service>.onrender.com` | Python ML Service URL |

---

### Part 2: Deploy Frontend on Vercel

1. **Import Project to Vercel**:
   - In [Vercel Dashboard](https://vercel.com/dashboard), click **Add New...** -> **Project**.
   - Select `RescueBite-AI`.

2. **Configure Project Settings**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

3. **Set Environment Variable on Vercel**:
   - `VITE_API_BASE_URL`: `https://<your-render-backend-name>.onrender.com/api`

---

## 🔐 Google Authentication Setup

RescueBite AI supports both real Google OAuth 2.0 (via Google Identity Services) and instant testing/demo fallback for development.

### 1. Create Google OAuth Credentials
1. Visit the [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project.
3. Navigate to **APIs & Services** > **OAuth consent screen**:
   - Select **External** and fill in your app name (`RescueBite AI`) and support email.
4. Navigate to **APIs & Services** > **Credentials**:
   - Click **+ Create Credentials** > **OAuth client ID** (Web application).
   - **Authorized JavaScript origins**:
     - `http://localhost:5173`
     - `https://<your-app>.vercel.app` (for production)
5. Copy your **Client ID** (ends with `.apps.googleusercontent.com`).

### 2. Configure Environment Variables
- **Frontend** (`frontend/.env`): `VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com`
- **Backend** (`backend/.env`): `GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com`
