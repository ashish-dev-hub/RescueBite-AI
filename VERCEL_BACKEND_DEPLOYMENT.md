# Deploying RescueBite AI Backend on Vercel

This guide walks you through deploying the Node.js / Express backend of **RescueBite AI** to **Vercel Serverless Functions**.

---

## Why Vercel for Backend & Email OTP?

- **Zero Port Restrictions on SMTP:** Render free tier blocks or heavily restricts outbound email ports (`465` and `587`), causing OTP emails (like password reset codes) to timeout or fail. On Vercel, outbound SMTP traffic connects smoothly.
- **Fast Response Time:** No 50-second cold-suspensions after inactivity.
- **Seamless Integration:** Both frontend and backend stay within your unified Vercel dashboard.

---

## Step 1: Push the Prepared Backend Code

The codebase has been configured for Vercel Serverless:
1. `backend/api/index.js` acts as the serverless handler entrypoint.
2. `backend/vercel.json` routes all requests to `/api/index.js` and enables necessary headers.
3. `backend/src/config/db.js` reuses MongoDB connections across serverless invocations.
4. `backend/src/server.js` automatically bypasses local port listening when executing in a Vercel environment.

---

## Step 2: Deploy Backend as a New Vercel Project

1. Log into your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **"Add New..."** > **"Project"**.
3. Select your GitHub repository: `RescueBite-AI`.
4. In the **Project Configuration** screen:
   - **Project Name:** `rescue-bite-backend` (or `rescuebite-api`)
   - **Framework Preset:** `Other`
   - **Root Directory:** Click **Edit** and choose `backend` (⚠️ **CRITICAL STEP**)
5. Open **Environment Variables** and add the following keys:

| Key | Example Value | Description |
|---|---|---|
| `NODE_ENV` | `production` | Production mode |
| `MONGO_URI` | `mongodb+srv://...` | MongoDB Atlas connection string |
| `JWT_SECRET` | `your_long_random_jwt_secret_key_here` | 32+ character secret |
| `JWT_EXPIRES_IN` | `7d` | Token expiry |
| `CORS_ORIGIN` | `https://rescue-bite-ai.vercel.app` | Your frontend deployment URL |
| `EMAIL_SERVICE` | `gmail` | Email provider |
| `EMAIL_USER` | `your-email@gmail.com` | Your Gmail address |
| `EMAIL_PASS` | `xxxx xxxx xxxx xxxx` | 16-character Gmail App Password |
| `EMAIL_FROM` | `"RescueBite AI" <your-email@gmail.com>` | Sender display name & address |

> **MongoDB Atlas Note:** In **MongoDB Atlas** -> **Network Access**, ensure `0.0.0.0/0` (Allow Access from Anywhere) is whitelisted so Vercel's dynamic serverless IP pool can reach your database.

6. Click **Deploy**.
7. Once deployed, note down your new backend URL (e.g. `https://rescue-bite-backend.vercel.app`).

---

## Step 3: Connect Frontend to Backend

1. In the Vercel dashboard, open your existing **Frontend Project** (`rescue-bite-ai`).
2. Go to **Settings** > **Environment Variables**.
3. Set or update `VITE_API_BASE_URL`:
   - Value: `https://rescue-bite-backend.vercel.app` (replace with your actual backend URL)
4. Go to **Deployments** tab > click the latest deployment menu (`...`) > click **Redeploy**.

---

## Step 4: Verify OTP Email Flow

1. Open your frontend: `https://rescue-bite-ai.vercel.app`.
2. Click **Sign In** > **Forgot password?**.
3. Enter your registered email address and submit.
4. Your 6-digit OTP email will arrive directly in your inbox!
