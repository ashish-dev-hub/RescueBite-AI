# RescueBite AI — Live Location & Real Road Routing Integration

This document outlines the **Live Location, Geocoding, and Routing architecture** implemented on the `feature/live-location` branch of **RescueBite AI**.

---

## 🌍 Architecture Overview

RescueBite AI uses an open-source, zero-cost, zero-API-key location stack designed for civic food redistribution:

```
[User Browser / Device]
       │
       ▼
[navigator.geolocation] ──(Real GPS Lat/Lng)──► [LiveLocationPicker Component]
                                                        │
                      ┌─────────────────────────────────┴─────────────────────────────────┐
                      ▼                                                                   ▼
       [OpenStreetMap Nominatim]                                                   [OSRM Routing]
       • Reverse Geocoding: GPS -> Street Address                                  • Real Road Distance (km)
       • Forward Geocoding: Street Address -> GPS                                  • Real Transit Time (mins)
```

---

## 🛠️ The 3 Core Free Services

### 1. Browser Native Geolocation API (`navigator.geolocation`)
* **Cost:** 100% Free & built into all modern browsers & mobile operating systems.
* **Accuracy:** High accuracy GPS mode (`enableHighAccuracy: true`) with device-level fallback to cellular/Wi-Fi triangulation.
* **Location in Code:** [`frontend/src/services/locationService.js`](../frontend/src/services/locationService.js) (`locationService.getCurrentPosition()`).

### 2. OpenStreetMap Nominatim API
* **Cost:** 100% Free & open source (No billing, no credit card, no API key).
* **Endpoint (Reverse Geocoding):**  
  `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat={lat}&lon={lon}&addressdetails=1`
* **Purpose:** Converts the donor's or shelter's GPS coordinates into real-world street addresses, localities, cities, and pin codes.

### 3. OSRM (Open Source Routing Machine API)
* **Cost:** 100% Free public routing API.
* **Endpoint:**  
  `https://router.project-osrm.org/route/v1/driving/{donorLng},{donorLat};{ngoLng},{ngoLat}?overview=false`
* **Purpose:** Calculates the **actual road driving distance in kilometers** and **estimated driving transit time in minutes** between the donor kitchen and recipient shelter on the live road network.
* **Fallback:** If OSRM is unreachable or coordinates are identical, falls back cleanly to the mathematical Haversine formula with a 25 km/h urban traffic profile.

---

## 🚀 Integrated Touchpoints

1. **Surplus Food Donation (`DonorDashboard.jsx`):**
   - Donors have a **"Use Live GPS Location"** button next to the Pickup Address input.
   - Automatically resolves their current GPS coordinates and pre-fills their exact physical street address.

2. **Shelter Meal Demand (`NgoDashboard.jsx`):**
   - Recipient NGOs have a **"Use Live GPS Location"** button next to the Delivery / Drop-off Address input.
   - Captures shelter drop-off coordinates for proximity calculations.

3. **Partner Registration (`AuthModal.jsx`):**
   - New commercial donors, NGOs, and volunteers can click **"Use Live GPS Location"** during account registration to bind their account to their physical hub.

4. **Allocation Desk (`CoordinatorDesk.jsx`):**
   - Operations Coordinators see **real road transit distance** and **driving transit duration** computed via OSRM between the donor and matched recipient shelter.
   - Displays real-time routing source status tag (`● OSRM Live Road Network`).

---

## 🧪 How to Test

1. Run the frontend development server:
   ```bash
   npm --prefix frontend run dev
   ```
2. Log in as a Donor, click **"List Surplus Food"**, and tap **"Use Live GPS Location"**.
3. Allow browser location permission when prompted.
4. Watch the GPS coordinates badge appear and the pickup address automatically populate with your real street address!

