# RescueBite AI — The Fresh Network

An intelligent, explainable food redistribution ecosystem connecting commercial food donors (restaurants, caterers, grocers) with community kitchens and recipient NGOs to eliminate food waste and fight hunger.

---

## Architecture Overview

- **Frontend**: React 19 + Vite SPA (Styled with custom CSS tokens, modern glassmorphism aesthetic).
- **Backend API**: Node.js + Express 5 REST API (JWT auth, MongoDB Atlas, constraint-based matching engine).
- **Database**: MongoDB Atlas.

---

## Deployment Guide

### Part 1: Deploy Backend on Render

1. **Push your code to GitHub**:
   Make sure all your latest commits are pushed to your GitHub repository:
   ```bash
   git add .
   git commit -m "Configure production deployment for Render and Vercel"
   git push origin main
   ```

2. **Allow MongoDB Atlas Network Access**:
   - Go to [MongoDB Atlas](https://cloud.mongodb.com/).
   - Navigate to **Security** -> **Network Access**.
   - Ensure `0.0.0.0/0` (Allow Access from Anywhere) is added to your IP Access List so Render's cloud servers can connect to your database.

3. **Create Web Service on Render**:
   - Go to the [Render Dashboard](https://dashboard.render.com/) and click **New +** -> **Web Service**.
   - Connect your GitHub repository (`RescueBite-AI`).
   - Configure the following settings:
     - **Name**: `rescuebite-backend` (or your preferred name)
     - **Region**: Choose the closest region (e.g., Singapore, Frankfurt, Oregon)
     - **Branch**: `main`
     - **Root Directory**: `backend`
     - **Runtime**: `Node`
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Instance Type**: `Free`

4. **Add Environment Variables on Render**:
   In the **Environment Variables** section, add:
   | Key | Value | Description |
   |---|---|---|
   | `NODE_ENV` | `production` | Enables production mode |
   | `MONGO_URI` | `mongodb+srv://...` | Your MongoDB Atlas connection URI |
   | `JWT_SECRET` | *(Generate a 32+ character random string)* | Secret for signing tokens |
   | `JWT_EXPIRES_IN` | `7d` | Token expiration |
   | `CORS_ORIGIN` | `https://<your-app>.vercel.app` | Your deployed Vercel frontend domain |

5. **Deploy & Copy Backend URL**:
   - Click **Deploy Web Service**.
   - Once deployed, copy your service URL (e.g., `https://rescuebite-backend.onrender.com`).
   - Verify it's working by opening: `https://rescuebite-backend.onrender.com/api/health`.

---

### Part 2: Deploy Frontend on Vercel

1. **Import Project to Vercel**:
   - Go to the [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New...** -> **Project**.
   - Select your GitHub repository (`RescueBite-AI`).

2. **Configure Project Settings**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select `frontend` (crucial: select `frontend`!)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)

3. **Set Environment Variable on Vercel**:
   - Expand the **Environment Variables** panel.
   - Add:
     - **Name**: `VITE_API_BASE_URL`
     - **Value**: `https://<your-render-backend-name>.onrender.com/api` (use the Render URL from Part 1)

4. **Deploy**:
   - Click **Deploy**.
   - Vercel will build and assign you a URL like `https://rescuebite-ai.vercel.app`.

5. **Final Step — Sync CORS**:
   - Copy your Vercel URL (e.g., `https://rescuebite-ai.vercel.app`).
   - In Render Dashboard -> your backend service -> **Environment**, ensure `CORS_ORIGIN` is set to your Vercel URL (the backend also auto-allows any `*.vercel.app` origin).

---

## Local Development

### 1. Backend
```bash
cd backend
npm install
npm run dev
```
Runs on `http://127.0.0.1:5000`.

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs on `http://127.0.0.1:5173` (proxies `/api` requests to port 5000 automatically).
