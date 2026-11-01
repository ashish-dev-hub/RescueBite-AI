# RescueBite AI — Frontend Codebase Map & Audit

> **Scope**: Frontend Only (`frontend/src/`, `frontend/package.json`, `frontend/src/index.css`)  
> **Branch**: `ui-redesign`  
> **Purpose**: Baseline technical inventory, role mapping, copy claim audit, and design token blueprint prior to UI overhaul.

---

## 1. Technical Stack & Architecture

- **Core Framework**: React 19 (`react: ^19.3.1`, `react-dom: ^19.3.1`)
- **Build Tooling**: Vite 8 (`vite: ^8.3.4`, `@vitejs/plugin-react: ^6.1.2`)
- **Linter**: Oxlint (`oxlint: ^1.88.0`)
- **Iconography**: `lucide-react: ^1.59.0`
- **Authentication**: Custom JWT storage (`localStorage`) + `@react-oauth/google: ^0.13.5` (Google Identity Services)
- **Styling Architecture**: Custom CSS Variables & utility classes in `src/index.css` (1,195 lines) + inline style overrides. *No Tailwind or external CSS framework currently installed.*
- **Routing Pattern**: Custom state-driven tab router in `src/App.jsx` (`activeTab: 'landing' | 'coordinator' | 'donor' | 'ngo' | 'impact'`), guarded by `ProtectedRoute.jsx`.

---

## 2. Page & Role Inventory

| Tab / Route | Component File | Accessible Roles | Key API Methods Used |
|---|---|---|---|
| `landing` | `src/pages/LandingPage.jsx` | Public | `api.getAnalyticsOverview()` |
| `coordinator` | `src/pages/CoordinatorDesk.jsx` | `coordinator` | `api.getMatches()`, `api.approveMatch()`, `api.rejectMatch()`, `api.updateMatchStatus()` |
| `donor` | `src/pages/DonorDashboard.jsx` | `donor` | `api.getDonations()`, `api.createDonation()`, `api.cancelDonation()` |
| `ngo` | `src/pages/NgoDashboard.jsx` | `ngo` | `api.getDemands()`, `api.createDemand()`, `api.cancelDemand()`, `api.acceptMatch()`, `api.rejectMatch()` |
| `impact` | `src/pages/ImpactPage.jsx` | Public | `api.getAnalyticsOverview()`, `api.getImpactSummary()` |
| `auth` (modal) | `src/pages/AuthModal.jsx` | Public | `api.login()`, `api.register()`, `api.googleAuth()`, `api.forgotPassword()`, `api.resetPassword()` |

---

## 3. Copy Claims vs Real Features Audit

Per the master prompt safety requirements: *"If a copy claim on the page is not backed by a real feature, tell me instead of keeping or inventing it."*

| Current Copy Claim on Landing Page | Backed by Real Feature? | Code Reality & Recommendation |
|---|---|---|
| **"Cold-Chain Verified"** | ⚠️ Partial | Backend stores a static enum `storageRequirement: 'refrigerated' \| 'ambient' \| 'hot_holding'` and a temperature number entered by donor. There is **no real IoT sensor hardware integration**. <br>👉 *Recommendation*: Update copy to *"Declared Storage Standard (Chilled / Hot Holding)"* or *"Temperature Requirement Monitored"*. |
| **"15-Min Rapid Dispatch"** | ❌ No | Dispatch is manually triggered by a coordinator clicking "Approve Match". 15 minutes is an aspirational marketing target, not an automated system guarantee. <br>👉 *Recommendation*: Rephrase to *"Urgent Dispatch Priority for Short-Window Surplus"*. |
| **"Direct ESG Metrics / Automatic Tax Deduction"** | ⚠️ Partial | Backend calculates formulaic carbon savings (`1.12 kg CO₂/meal`, `0.45 kg food/meal`). There is **no real 80G / tax invoice PDF generator**. <br>👉 *Recommendation*: Keep verified environmental impact formulas; label tax benefit as informational or remove until implemented. |
| **"AI-forecasted meal demand based on historical intake"** | ❌ No | NGOs manually input demand (`mealCountRequested`, `reason`, `dietaryRequirements`). Match scoring has an ML baseline, but demand forecasting does not automatically run. <br>👉 *Recommendation*: Change copy to *"AI-assisted constraint matching based on actual shelter intake quotas"*. |
| **Sample Statistics (184 meals, 6 offers, 1,240 kg CO₂)** | ⚠️ Sample Data | These are hardcoded fallbacks when backend has zero records. <br>👉 *Recommendation*: Explicitly label as *"Sample data"* until live production records populate. |
| **Testimonial ("Maria Santos, Hope Community Kitchen")** | ❌ Fictional | Placeholder marketing testimonial with Western persona. <br>👉 *Recommendation*: Replace with grounded Indian community pilot context (e.g., Delhi/Mumbai/Bengaluru community kitchens) or a clear illustrative case study clearly marked as such. |

---

## 4. Current AI-Template Visual Tropes (To Be Replaced)

1. **Repetitive Card Recipe**: Small pill badge + giant bold headline + centered subtitle + 3 identical cards in a row.
2. **Generic Tinted Icon Squares**: Every card has a 46x46 rounded mint green box with a Lucide icon.
3. **Pills & Eyebrow Badges Overload**: 15+ different pill badges (`LIVE AI FOOD RESCUE`, `EXPLAINABLE RESCUE LIFECYCLE`, `INTERACTIVE CALCULATOR`, `15-Min Rapid Dispatch`).
4. **Numbered 01 / 02 / 03 Blocks**: Step cards with oversized monospace numbers.
5. **Soft Glowing Gradients & Blobs**: Ambient CSS background blobs (`.ambient-glow-1`, `.ambient-glow-2`) and generic green shadows.

---

## 5. Target Editorial Design Direction Blueprint

- **Color Palette**:
  - Background: Warm newsprint / paper off-white (`#F8F5EE`, `#F2EDE4`)
  - Deep Ink / Primary Text & Action: Forest Ink (`#11261F`, `#183329`)
  - Single Accent: Chilli Red (`#C8372D`) or Turmeric Gold (`#D97706`) used strictly for urgent status / action highlights
  - Hairline Rule Borders: `#D8D2C4` (preferring 1px crisp rules over fuzzy drop shadows)
- **Typography**:
  - Headlines: Characterful editorial serif (e.g. *Fraunces* or *Instrument Serif*)
  - UI / Body: Clean humanist sans (e.g. *DM Sans* or *Manrope*)
  - Numerals: Tabular digits (`font-variant-numeric: tabular-nums`)
- **Asymmetric Hero & 3D Interactive Feature**:
  - Left: Left-aligned editorial narrative, grounded Indian local logistics context (Ward 42, Connaught Place, Indiranagar, Bandra East, Dal Makhani, 45 Fresh Meals).
  - Right: Three.js interactive tilted isometric grid showing node connectivity (Donor nodes -> Shelter nodes with live animated arc and 4-factor score breakdown).
  - Fallback: Crisp SVG / PNG poster for mobile/low-power/prefers-reduced-motion.
- **Explainable Matching Bar**:
  - Replace pill tags with a genuine 4-part segmented progress/bar breakdown:
    - **Demand Fit**: 35%
    - **Deadline Urgency**: 25%
    - **Proximity**: 20%
    - **Storage Match**: 20%
- **Single Listing Timeline**:
  - Replace the 3 generic cards with a real-world linear dispatch record:
    `[19:10] Surplus Logged` → `[19:14] AI Match Found (94/100)` → `[19:18] Coordinator Approved` → `[19:42] Verified Delivery (Indiranagar Shelter)`.
