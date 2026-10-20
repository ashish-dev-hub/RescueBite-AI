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

async function handleResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.message || `Request failed with status ${response.status}`;
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
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(res);
  },

  async register(userData) {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    return handleResponse(res);
  },

  async getMe() {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Donations
  async getDonations(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const res = await fetch(`${BASE_URL}/donations?${queryString}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async createDonation(donationData) {
    const res = await fetch(`${BASE_URL}/donations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(donationData),
    });
    return handleResponse(res);
  },

  async cancelDonation(id) {
    const res = await fetch(`${BASE_URL}/donations/${id}/cancel`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Demands
  async getDemands(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const res = await fetch(`${BASE_URL}/demands?${queryString}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getMyDemands() {
    const res = await fetch(`${BASE_URL}/demands/my`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async createDemand(demandData) {
    const res = await fetch(`${BASE_URL}/demands`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(demandData),
    });
    return handleResponse(res);
  },

  async cancelDemand(id) {
    const res = await fetch(`${BASE_URL}/demands/${id}/cancel`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Matching
  async getRecommendations() {
    const res = await fetch(`${BASE_URL}/matching/recommendations`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getEligibleForNgo(ngoId) {
    const queryString = ngoId ? `?ngoId=${ngoId}` : '';
    const res = await fetch(`${BASE_URL}/matching/eligible-for-ngo${queryString}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Allocations
  async getAllocations(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const res = await fetch(`${BASE_URL}/allocations?${queryString}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async createAllocation(allocationData) {
    const res = await fetch(`${BASE_URL}/allocations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(allocationData),
    });
    return handleResponse(res);
  },

  async respondAllocation(id, action, rejectionReason = '') {
    const res = await fetch(`${BASE_URL}/allocations/${id}/respond`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ action, rejectionReason }),
    });
    return handleResponse(res);
  },

  async updateAllocationStatus(id, nextStatus, note = '') {
    const res = await fetch(`${BASE_URL}/allocations/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ nextStatus, note }),
    });
    return handleResponse(res);
  },

  // Analytics
  async getAnalyticsOverview() {
    const res = await fetch(`${BASE_URL}/analytics/overview`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};
