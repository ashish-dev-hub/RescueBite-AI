// Normalize API base URL: handles '/api', 'https://backend.onrender.com', or 'https://backend.onrender.com/api/'
const rawBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').trim().replace(/\/+$/, '');
const BASE_URL = rawBaseUrl.endsWith('/api') ? rawBaseUrl : `${rawBaseUrl}/api`;

const getAuthHeaders = () => {
  const token = localStorage.getItem('rescuebite_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

async function safeFetch(url, options = {}) {
  try {
    return await fetch(url, options);
  } catch (err) {
    const msg = err?.message || '';
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')) {
      throw new Error(
        'Backend connection failed: Your Render backend service is currently suspended or starting up. Please check your Render dashboard to resume it.'
      );
    }
    throw err;
  }
}

async function handleResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    let errorMsg = data.message;
    if (!errorMsg) {
      if (response.status === 405) {
        errorMsg = 'Backend API is not connected. Please set VITE_API_BASE_URL in your Vercel project settings.';
      } else if (response.status === 404) {
        errorMsg = 'API endpoint not found. Please verify your backend URL.';
      } else {
        errorMsg = `Request failed with status ${response.status}`;
      }
    }
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export const api = {
  // Auth
  async login(email, password) {
    const res = await safeFetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(res);
  },

  async register(userData) {
    const res = await safeFetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    return handleResponse(res);
  },

  async googleAuth(credential, extraData = {}) {
    const res = await safeFetch(`${BASE_URL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential, ...extraData }),
    });
    return handleResponse(res);
  },

  async forgotPassword(email) {
    const res = await safeFetch(`${BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return handleResponse(res);
  },

  async resetPassword({ email, otp, newPassword }) {
    const res = await safeFetch(`${BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, newPassword }),
    });
    return handleResponse(res);
  },

  async getMe() {
    const res = await safeFetch(`${BASE_URL}/auth/me`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Donations
  async getDonations(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const res = await safeFetch(`${BASE_URL}/donations?${queryString}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async createDonation(donationData) {
    const res = await safeFetch(`${BASE_URL}/donations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(donationData),
    });
    return handleResponse(res);
  },

  async cancelDonation(id) {
    const res = await safeFetch(`${BASE_URL}/donations/${id}/cancel`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getDonorSupplyForecast(targetDate, donorId = '') {
    const params = new URLSearchParams();
    if (targetDate) params.append('targetDate', targetDate);
    if (donorId) params.append('donorId', donorId);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await safeFetch(`${BASE_URL}/donations/supply-forecast${queryString}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Demands
  async getDemands(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const res = await safeFetch(`${BASE_URL}/demands?${queryString}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getMyDemands() {
    const res = await safeFetch(`${BASE_URL}/demands/my`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async createDemand(demandData) {
    const res = await safeFetch(`${BASE_URL}/demands`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(demandData),
    });
    return handleResponse(res);
  },

  async cancelDemand(id) {
    const res = await safeFetch(`${BASE_URL}/demands/${id}/cancel`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getDemandForecast(targetDate, ngoId = '') {
    const params = new URLSearchParams();
    if (targetDate) params.append('targetDate', targetDate);
    if (ngoId) params.append('ngoId', ngoId);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await safeFetch(`${BASE_URL}/demands/forecast${queryString}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Matching
  async getRecommendations() {
    const res = await safeFetch(`${BASE_URL}/matching/recommendations`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getEligibleForNgo(ngoId) {
    const queryString = ngoId ? `?ngoId=${ngoId}` : '';
    const res = await safeFetch(`${BASE_URL}/matching/eligible-for-ngo${queryString}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getMlModelStatus() {
    const res = await safeFetch(`${BASE_URL}/matching/model-status`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Allocations
  async getAllocations(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const res = await safeFetch(`${BASE_URL}/allocations?${queryString}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async createAllocation(allocationData) {
    const res = await safeFetch(`${BASE_URL}/allocations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(allocationData),
    });
    return handleResponse(res);
  },

  async respondAllocation(id, action, rejectionReason = '') {
    const res = await safeFetch(`${BASE_URL}/allocations/${id}/respond`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ action, rejectionReason }),
    });
    return handleResponse(res);
  },

  async updateAllocationStatus(id, nextStatus, note = '') {
    const res = await safeFetch(`${BASE_URL}/allocations/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ nextStatus, note }),
    });
    return handleResponse(res);
  },

  // Analytics
  async getAnalyticsOverview() {
    const res = await safeFetch(`${BASE_URL}/analytics/overview`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};
