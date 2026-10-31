# 🌿 RescueBite AI — The Fresh Network

[![React 19](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-22c55e?style=for-the-badge&logo=react)](https://react.dev/)
[![Node.js 20+](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express%205-15803d?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Python FastAPI](https://img.shields.io/badge/ML%20Engine-FastAPI%20%2B%20scikit--learn-0284c7?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![MongoDB Atlas](https://img.shields.io/badge/Database-MongoDB%20Atlas-16a34a?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/atlas)
[![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg?style=for-the-badge)](LICENSE)

> **RescueBite AI** is an intelligent, explainable food redistribution ecosystem that connects commercial food donors (restaurants, caterers, bakeries, grocers) with community kitchens and recipient NGOs to eliminate food waste, reduce greenhouse gas emissions, and fight urban hunger.

---

## 📑 Table of Contents

- [🌟 Features Overview](#-features-overview)
- [🏗️ System Architecture](#️-system-architecture)
- [🛠️ Tech Stack](#️-tech-stack)
- [📂 Project Directory Structure](#-project-directory-structure)
- [🚀 Quickstart & Local Setup](#-quickstart--local-setup)
- [🤖 Machine Learning Engine (Model A & Model B)](#-machine-learning-engine)
- [📧 Nodemailer & Password Reset Setup](#-nodemailer--password-reset-setup)
- [🔐 Google OAuth 2.0 Integration](#-google-oauth-20-integration)
- [🌐 Production Deployment Guide](#-production-deployment-guide)
  - [Backend & ML on Render](#part-1-deploy-backend-on-render)
  - [Frontend on Vercel](#part-2-deploy-frontend-on-vercel)
- [📡 API Endpoints Reference](#-api-endpoints-reference)

---

## 🌟 Features Overview

- **🏢 Multi-Role Tailored Portals:**
  - **Food Donor Portal:** List surplus batches in under 15 seconds with perishability countdown timers, food quantity, and temperature handling requirements (Hot Holding $>60^\circ\text{C}$, Refrigerated $<4^\circ\text{C}$, Ambient).
  - **Operations Coordinator Desk:** 3-column triage center with human-in-the-loop verification, live priority queues, route-proximity filters, and driver dispatch approval.
  - **Recipient NGO Portal:** Daily meal intake logging, historical demand insights, and 1-tap allocation accept/reject with dietary suitability checks.
  - **Live Impact Analytics:** Real-time metrics for delivered meals, surplus listings active, landfill food diverted (kg), avoided $\text{CO}_2\text{e}$ (kg), and conserved embedded water (Liters).
- **🤖 Dual Machine Learning Serving Layer:**
  - **Model A (Demand Forecaster):** Prevents stockouts by predicting next-day meal needs with uncertainty intervals (10th–90th percentiles).
  - **Model B (Smart Allocation Engine):** Evaluates multi-factor feasibility (demand fit, safe transit windows, dietary constraints, receiving capacity) and outputs transparent reason codes.
- **🔐 Secure Authentication & Self-Service Password Reset:**
  - JWT-based authentication with role-based route guards.
  - Google OAuth 2.0 One-Tap and popup login.
  - **Forgot Password Flow:** Generates 6-digit cryptographic verification codes sent via **Nodemailer** HTML emails with 15-minute expiration and SHA-256 token hashing.
- **🎨 Interactive Botanical UI Design:**
  - Modern, responsive interface styled with fresh organic palette tokens (`#173B35`, `#2F7D67`, `#EAF4EC`, `#FAF8F1`).
  - Interactive AI match simulation radar, role explorer, and dynamic impact estimator.

---

## 🏗️ System Architecture

```
                                  +-------------------------------+
                                  |    RESCUEBITE WEB CLIENT      |
                                  |     (React 19 + Vite SPA)     |
                                  +---------------+---------------+
                                                  |
                                                  | HTTPS / REST
                                                  v
                                  +-------------------------------+
                                  |      NODE.JS / EXPRESS 5      |
                                  |          API BACKEND          |
                                  +-------+---------------+-------+
                                          |               |
                         Mongoose / Atlas |               | Internal HTTP Client
                                          v               v
                        +--------------------+  +--------------------+
                        |   MONGODB ATLAS    |  |  PYTHON FASTAPI    |
                        | (Users, Donations, |  |  ML SERVING LAYER  |
                        | Allocations, Logs) |  | (Model A & Model B)|
                        +--------------------+  +--------------------+
                                          ^
                                          | SMTP / TLS
                                +--------------------+
                                |    NODEMAILER      |
                                | (Password Reset &  |
                                |  Event Alerts)     |
                                +--------------------+
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite 8, Lucide React, `@react-oauth/google` |
| **Backend API** | Node.js, Express 5, Mongoose 9, JWT, bcryptjs, Nodemailer, CORS |
| **Machine Learning** | Python 3.14+, FastAPI, scikit-learn, Pandas, NumPy, Uvicorn |
| **Database** | MongoDB Atlas (Cloud NoSQL) |
| **Email Transport** | Nodemailer (Gmail App Passwords or Custom SMTP: SendGrid/Brevo/SES) |
| **Deployment** | Vercel (Frontend SPA) + Render (Node.js API & Python ML) |

---

## 📂 Project Directory Structure

```text
RescueBite AI/
├── backend/                        # Node.js + Express 5 Backend
│   ├── src/
│   │   ├── config/                 # Database configuration (db.js)
│   │   ├── controllers/            # Route controllers (auth, donations, demands, etc.)
│   │   ├── middleware/             # Auth JWT protection & error middleware
│   │   ├── models/                 # Mongoose models (User, Donation, Demand, Allocation)
│   │   ├── routes/                 # Express API routes
│   │   ├── services/               # ML client, email service (Nodemailer), matching
│   │   └── server.js               # Express application entrypoint & CORS config
│   ├── .env.example                # Backend environment template
│   └── package.json
│
├── frontend/                       # React 19 + Vite Frontend
│   ├── src/
│   │   ├── assets/                 # SVGs, icons, illustrations
│   │   ├── components/             # Reusable UI (Navbar, Modal, ProtectedRoute, Badges)
│   │   ├── context/                # AuthContext (state management, tokens, login/logout)
│   │   ├── pages/                  # LandingPage, DonorDashboard, NgoDashboard, CoordinatorDesk
│   │   ├── services/               # API service layer (safeFetch, API methods)
│   │   ├── App.jsx                 # Route navigation & portal switching
│   │   └── index.css               # Design system tokens & creative layout classes
│   ├── .env.example                # Frontend environment template
│   └── package.json
│
├── ml/                             # Python Machine Learning Subsystem
│   ├── src/rescuebite_ml/          # FastAPI serving package, Model A & B inference
│   ├── tests/                      # Pytest suite (contract tests, baseline tests)
│   ├── requirements.txt            # Python dependencies
│   └── pyproject.toml
│
├── dataset/                        # Synthetic & historical operational datasets
├── render.yaml                     # Render infrastructure-as-code blueprint
├── vercel.json                     # Vercel SPA routing rewrite rules
└── README.md
```

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- **Node.js** (v20+ recommended)
- **Python** (v3.11+ with `pip`)
- **MongoDB Atlas Connection URI** (or local MongoDB on `mongodb://localhost:27017/rescuebite`)

### 1. Clone the Repository
```bash
git clone https://github.com/ashish-dev-hub/RescueBite-AI.git
cd RescueBite-AI
```

### 2. Configure Environment Files

#### Backend (`backend/.env`):
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/rescuebite?retryWrites=true&w=majority
JWT_SECRET=super_secret_development_key_minimum_32_characters_long
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173

# ML Service URL
ML_API_URL=http://localhost:8000

# Nodemailer / Email Service
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-digit-google-app-password
```

#### Frontend (`frontend/.env`):
```env
VITE_API_BASE_URL=/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### 3. Install Dependencies
```bash
# Install Backend packages
cd backend && npm install && cd ..

# Install Frontend packages
cd frontend && npm install && cd ..

# Install Python ML packages
pip install -r ml/requirements.txt
```

### 4. Run Services Concurrently

Open three separate terminal windows:

```bash
# Terminal 1 — Python ML Service (Port 8000)
npm run dev:ml

# Terminal 2 — Node.js Express Backend (Port 5000)
npm run dev:backend

# Terminal 3 — React Vite Frontend (Port 5173)
npm run dev:frontend
```

Now open `http://localhost:5173` in your browser.

---

## 🤖 Machine Learning Engine

The ML subsystem is served via FastAPI on port 8000 and exposes health and prediction contracts.

### Model A: NGO Demand Forecaster
- **Algorithm:** `RandomForestRegressor` with past-only lag invariants to ensure strict temporal causality (no data leakage).
- **Features:** Day-of-week, historical 7-day intake moving average, shelter capacity, and local holiday indicators.
- **Uncertainty Bounds:** Estimates the 10th and 90th percentile bounds from ensemble tree leaves.
- **Benchmark:** $\text{MAE} \le 36.6$ meals (outperforms standard same-weekday baseline by **46.2%**).

### Model B: Smart Allocation & Redistribution Engine
- **Algorithm:** `RandomForestClassifier` predicting delivery feasibility $P(\text{delivered})$.
- **Constraint Hard Filters:**
  1. Non-vegetarian items are never allocated to vegetarian-only shelters.
  2. Donations exceeding $150\%$ of shelter intake capacity are flagged or split.
  3. Perishability transit windows: Estimated transit time must not exceed remaining safe hours.
- **Composite Ranking Score ($0 - 100$):**
  $$\text{Score} = 0.35 \times \text{DemandFit} + 0.25 \times \text{Urgency} + 0.20 \times \text{Proximity} + 0.20 \times \text{CapacityFit}$$
- **Explainable Output Badges:**
  - `HIGH_DELIVERY_SUCCESS`
  - `PROXIMITY_MATCH`
  - `HOT_CHAIN_VALIDATED` / `COLD_STORAGE_FEASIBLE`
  - `DIRECT_QUANTITY_MATCH`

---

## 📧 Nodemailer & Password Reset Setup

RescueBite AI features a password reset system with email verification.

### How It Works:
1. User clicks **"Forgot Password?"** on the Sign-In modal.
2. Backend generates a 6-digit random verification code.
3. The code is hashed using **SHA-256** and saved with a 15-minute expiration timestamp (`resetPasswordToken`, `resetPasswordExpire`).
4. **Nodemailer** dispatches a branded HTML email containing the verification code.
5. User enters the code along with their new password; the backend validates the hash and updates the account password with `bcryptjs`.

### Generating a Google 16-Digit App Password:
1. Go to your **[Google Account Security](https://myaccount.google.com/security)** and ensure **2-Step Verification** is turned **ON**.
2. Visit **[Google App Passwords](https://myaccount.google.com/apppasswords)**.
3. Under **App name**, enter `RescueBite AI` and click **Create**.
4. Copy the generated 16-character password (e.g., `abcd efgh ijkl mnop`).
5. Add it to your backend environment variables:
   ```env
   EMAIL_SERVICE=gmail
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=abcdefghijklmnop
   ```

*(Custom SMTP services like SendGrid, Mailgun, Brevo, or AWS SES are also supported via `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS`)*.

---

## 🔐 Google OAuth 2.0 Integration

RescueBite AI provides Google One-Tap and popup login via `@react-oauth/google`.

### Setup Steps:
1. Open the [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth 2.0 Client ID** (Web application).
3. Under **Authorized JavaScript Origins**, add:
   - `http://localhost:5173`
   - `https://rescue-bite-ai.vercel.app` (or your production Vercel domain)
4. Copy your **Client ID** into:
   - `frontend/.env` as `VITE_GOOGLE_CLIENT_ID`
   - `backend/.env` as `GOOGLE_CLIENT_ID`

---

## 🌐 Production Deployment Guide

### Part 1: Deploy Backend on Render

1. Log in to [dashboard.render.com](https://dashboard.render.com).
2. Click **New +** -> **Web Service** and connect the `RescueBite-AI` repository.
3. Configure settings:
   - **Name:** `rescuebite-backend`
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Add Environment Variables:
   - `NODE_ENV`: `production`
   - `MONGO_URI`: `mongodb+srv://...`
   - `JWT_SECRET`: *(32+ character random string)*
   - `JWT_EXPIRES_IN`: `7d`
   - `CORS_ORIGIN`: `https://rescue-bite-ai.vercel.app`
   - `ML_API_URL`: `https://rescuebite-ml.onrender.com` (if ML service is deployed)
   - `EMAIL_SERVICE`: `gmail`
   - `EMAIL_USER`: `your-email@gmail.com`
   - `EMAIL_PASS`: `your-16-digit-app-password`

### Part 2: Deploy Frontend on Vercel

1. Log in to [vercel.com](https://vercel.com).
2. Click **Add New...** -> **Project** and import `RescueBite-AI`.
3. Configure settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add Environment Variables:
   - `VITE_API_BASE_URL`: `https://rescuebite-backend-zs4o.onrender.com/api` (your Render backend URL)
   - `VITE_GOOGLE_CLIENT_ID`: `your-client-id.apps.googleusercontent.com`
5. Click **Deploy**.

---

## 📡 API Endpoints Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register new Donor, NGO, or Coordinator |
| `POST` | `/api/auth/login` | Public | Sign in with email and password |
| `POST` | `/api/auth/google` | Public | Sign in or register via Google ID token |
| `POST` | `/api/auth/forgot-password` | Public | Send 6-digit verification OTP email |
| `POST` | `/api/auth/reset-password` | Public | Verify OTP and update password |
| `GET` | `/api/auth/me` | Private | Retrieve authenticated user profile |

### Surplus Donations (`/api/donations`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/donations` | Private | List active donations with filters |
| `POST` | `/api/donations` | Private (Donor) | Create surplus food listing |
| `PATCH` | `/api/donations/:id/cancel` | Private (Donor) | Cancel active surplus listing |
| `GET` | `/api/donations/supply-forecast`| Private | Retrieve predicted surplus volumes |

### Shelter Demands (`/api/demands`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/demands` | Private | List shelter intake demands |
| `POST` | `/api/demands` | Private (NGO) | Create meal requirement request |
| `GET` | `/api/demands/forecast` | Private | Model A next-day demand prediction |

### Allocations & Matching (`/api/allocations` & `/api/matching`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/matching/recommendations`| Private (Coord) | Model B ranked match list |
| `POST` | `/api/allocations` | Private (Coord) | Create and approve allocation |
| `PATCH` | `/api/allocations/:id/respond`| Private (NGO) | Accept or reject allocated delivery |
| `PATCH` | `/api/allocations/:id/status` | Private | Update milestone (Picked Up, Delivered) |

### Analytics (`/api/analytics`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/analytics/overview` | Public | Aggregate delivered meals, kg diverted, CO2e |

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
Feel free to contribute, open issues, and submit pull requests to help eliminate food waste!
