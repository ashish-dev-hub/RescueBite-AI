/**
 * RescueBite AI — Machine Learning Service Client
 * Connects Express backend with the FastAPI Python ML Serving Layer (Port 8000).
 * Provides robust fallbacks if the ML service is unavailable.
 */

const ML_API_BASE = process.env.ML_API_URL || 'http://localhost:8000';
const TIMEOUT_MS = 3500; // 3.5s timeout for low latency

/**
 * Helper to execute fetch with timeout
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timer);
    return response;
  } catch (error) {
    clearTimeout(timer);
    throw error;
  }
}

/**
 * Check if the Python ML FastAPI serving layer is reachable and healthy
 */
async function isAvailable() {
  try {
    const res = await fetchWithTimeout(`${ML_API_BASE}/health`, { method: 'GET' }, 1500);
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === 'healthy';
  } catch {
    return false;
  }
}

/**
 * Retrieve status and metadata for Model A and Model B
 */
async function getModelsStatus() {
  try {
    const res = await fetchWithTimeout(`${ML_API_BASE}/api/v1/models/status`, { method: 'GET' });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.warn('[ML Client] Could not fetch models status:', error.message);
    return null;
  }
}

/**
 * Model A: Predict daily meal demand for an NGO
 * @param {string} ngoId - Target NGO ID (e.g. 'N001')
 * @param {string} forecastDate - Target date string 'YYYY-MM-DD'
 * @returns {Promise<Object|null>} Forecast with uncertainty bounds
 */
async function getDemandForecast(ngoId, forecastDate) {
  try {
    const res = await fetchWithTimeout(`${ML_API_BASE}/api/v1/demand/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ngo_id: ngoId,
        forecast_date: forecastDate,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.warn(`[ML Client] Demand forecast fallback for NGO ${ngoId}:`, error.message);
    return null;
  }
}

/**
 * Model B: Rank candidate recipient NGOs for active surplus donation
 * @param {Object} donation - Active donation object
 * @param {Object} donor - Donor profile object
 * @param {number} topK - Max recommendations to return
 * @returns {Promise<Object|null>} Multi-candidate recommendation card
 */
async function getRecommendedAllocations(donation, donor, topK = 5) {
  try {
    const safeDonor = typeof donor === 'object' && donor !== null ? donor : {};
    const payload = {
      donation: {
        donation_id: String(donation._id || donation.donationId || 'DON_GENERIC'),
        food_category: donation.category || donation.food_category || 'cooked_veg',
        quantity_meals: Number(donation.remainingQuantity || donation.quantityMeals || 20),
        created_at: donation.createdAt ? new Date(donation.createdAt).toISOString() : undefined,
        prepared_at: donation.preparedAt ? new Date(donation.preparedAt).toISOString() : undefined,
        pickup_deadline: donation.pickupDeadline
          ? new Date(donation.pickupDeadline).toISOString()
          : undefined,
      },
      donor: {
        donor_id: String(safeDonor._id || safeDonor.donorId || donor || 'DONOR_GENERIC'),
        donor_type: safeDonor.donorType || 'restaurant',
        lat: Number(safeDonor.location?.coordinates?.lat || safeDonor.lat || 28.6139),
        lon: Number(safeDonor.location?.coordinates?.lng || safeDonor.lon || 77.2090),
        avg_surplus_meals: Number(safeDonor.avgSurplusMeals || 50),
        reliability: Number(safeDonor.reliability || 0.92),
      },
      top_k: topK,
      min_score: 0.0,
    };

    const res = await fetchWithTimeout(`${ML_API_BASE}/api/v1/allocation/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.warn('[ML Client] Allocation recommendation fallback:', error.message);
    return null;
  }
}

/**
 * Model C: Predict daily surplus meals for a commercial food donor
 * @param {string} donorId - Target donor ID (e.g. 'D001')
 * @param {string} forecastDate - Target date string 'YYYY-MM-DD'
 * @returns {Promise<Object|null>} Supply forecast with uncertainty intervals and probability
 */
async function getDonorSupplyForecast(donorId, forecastDate) {
  try {
    const res = await fetchWithTimeout(`${ML_API_BASE}/api/v1/donor-supply/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        donor_id: donorId,
        forecast_date: forecastDate,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.warn(`[ML Client] Donor supply forecast fallback for donor ${donorId}:`, error.message);
    return null;
  }
}

module.exports = {
  isAvailable,
  getModelsStatus,
  getDemandForecast,
  getRecommendedAllocations,
  getDonorSupplyForecast,
  ML_API_BASE,
};
