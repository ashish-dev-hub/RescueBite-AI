# RescueBite AI — The Fresh Network

An intelligent, explainable food redistribution platform connecting commercial food donors with community kitchens and NGOs.

---

## Running the Project

### 1. Backend Setup & Run
Open a terminal in the `backend` folder:
```powershell
cd backend
npm run dev      # Runs Express server with nodemon on http://localhost:5000
# or: npm start
```

### 2. Create Initial Coordinator Account
Since public registration is restricted to Food Donors and Recipient NGOs for security, create your authorized Coordinator account via the dedicated CLI utility:
```powershell
cd backend
npm run create-coordinator your_email@domain.com YourPassword123 "Your Name"
```

### 3. Frontend Setup & Run
Open a second terminal in the `frontend` folder:
```powershell
cd frontend
npm run dev      # Runs Vite React app on http://127.0.0.1:5173
```

---

## User Registration
* **Food Donors & NGOs:** Click **"Sign In / Register"** in the top navigation bar to register and access their respective portals directly.