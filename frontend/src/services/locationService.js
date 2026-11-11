/**
 * RescueBite AI — Location & Routing Service
 *
 * Integrates:
 * 1. Browser Native Geolocation API (navigator.geolocation) for exact live GPS coordinates.
 * 2. OpenStreetMap Nominatim API for 100% free forward and reverse geocoding (no API key required).
 * 3. OSRM (Open Source Routing Machine) API for real road driving distance and transit duration calculations.
 */

// Fallback Haversine formula to compute straight-line distance in km
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export const locationService = {
  /**
   * Request real-time live GPS coordinates from the device / browser
   * @param {Object} options - Geolocation position options
   * @returns {Promise<{ lat: number, lng: number, accuracy: number }>}
   */
  async getCurrentPosition(options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }) {
    if (!navigator || !navigator.geolocation) {
      throw new Error('Geolocation is not supported by your browser.');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: Number(pos.coords.latitude.toFixed(6)),
            lng: Number(pos.coords.longitude.toFixed(6)),
            accuracy: Math.round(pos.coords.accuracy),
          });
        },
        (err) => {
          let errorMsg = 'Could not retrieve your live location.';
          if (err.code === 1) {
            errorMsg = 'Location permission was denied. Please allow location access in your browser settings.';
          } else if (err.code === 2) {
            errorMsg = 'Location unavailable. Please verify GPS or network connectivity.';
          } else if (err.code === 3) {
            errorMsg = 'Location request timed out. Please try again.';
          }
          reject(new Error(errorMsg));
        },
        options
      );
    });
  },

  /**
   * Reverse Geocode: Convert live GPS coordinates into a human-readable street address using OpenStreetMap Nominatim
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Promise<{ address: string, city: string, state: string, postalCode: string, displayName: string }>}
   */
  async reverseGeocode(lat, lng) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
        lat
      )}&lon=${encodeURIComponent(lng)}&addressdetails=1`;

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          // Nominatim requires a user-agent identification
          'User-Agent': 'RescueBiteAI-CivicFoodRedistribution/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`Nominatim reverse geocode failed with status: ${response.status}`);
      }

      const data = await response.json();
      const addr = data.address || {};

      const road = addr.road || addr.street || addr.pedestrian || addr.suburb || '';
      const locality = addr.neighbourhood || addr.suburb || addr.residential || '';
      const city = addr.city || addr.town || addr.village || addr.county || '';
      const state = addr.state || '';
      const postalCode = addr.postcode || '';

      const addressComponents = [road, locality, city, state, postalCode].filter(Boolean);
      const formattedAddress = addressComponents.join(', ') || data.display_name || `${lat}, ${lng}`;

      return {
        address: formattedAddress,
        city,
        state,
        postalCode,
        displayName: data.display_name || formattedAddress,
        raw: data,
      };
    } catch (err) {
      console.warn('[LocationService] Reverse geocode fallback:', err.message);
      return {
        address: `Lat ${lat}, Lng ${lng}`,
        city: '',
        state: '',
        postalCode: '',
        displayName: `Lat ${lat}, Lng ${lng}`,
      };
    }
  },

  /**
   * Forward Geocode: Convert a typed address into geographic coordinates using OpenStreetMap Nominatim
   * @param {string} addressQuery - The street or city address to look up
   * @returns {Promise<{ lat: number, lng: number, displayName: string } | null>}
   */
  async forwardGeocode(addressQuery) {
    if (!addressQuery || !addressQuery.trim()) return null;

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
        addressQuery.trim()
      )}&limit=1&addressdetails=1`;

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'RescueBiteAI-CivicFoodRedistribution/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`Nominatim forward geocode failed with status: ${response.status}`);
      }

      const results = await response.json();
      if (!Array.isArray(results) || results.length === 0) {
        return null;
      }

      const first = results[0];
      return {
        lat: Number(parseFloat(first.lat).toFixed(6)),
        lng: Number(parseFloat(first.lon).toFixed(6)),
        displayName: first.display_name,
      };
    } catch (err) {
      console.warn('[LocationService] Forward geocode error:', err.message);
      return null;
    }
  },

  /**
   * Calculate real road driving distance and transit duration using OSRM (Open Source Routing Machine)
   * @param {{ lat: number, lng: number }} origin - Donor coordinates
   * @param {{ lat: number, lng: number }} destination - NGO/Shelter coordinates
   * @returns {Promise<{ distanceKm: number, durationMins: number, routeSource: 'osrm' | 'haversine' }>}
   */
  async getDrivingRoute(origin, destination) {
    if (
      !origin ||
      !destination ||
      !origin.lat ||
      !origin.lng ||
      !destination.lat ||
      !destination.lng ||
      (origin.lat === destination.lat && origin.lng === destination.lng)
    ) {
      return { distanceKm: 0.5, durationMins: 4, routeSource: 'haversine' };
    }

    try {
      // OSRM expects coordinates in {lon},{lat} format
      const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=false&steps=false`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`OSRM routing failed with status: ${response.status}`);
      }

      const data = await response.json();
      if (data.code === 'Ok' && Array.isArray(data.routes) && data.routes.length > 0) {
        const route = data.routes[0];
        const distanceKm = Number((route.distance / 1000).toFixed(1)); // meters to km
        const durationMins = Math.max(1, Math.round(route.duration / 60)); // seconds to minutes

        return {
          distanceKm,
          durationMins,
          routeSource: 'osrm',
        };
      }
      throw new Error('No driving route returned by OSRM');
    } catch (err) {
      // Graceful fallback to Haversine distance with 25 km/h urban traffic assumption
      const distanceKm = calculateHaversineDistance(origin.lat, origin.lng, destination.lat, destination.lng);
      const durationMins = Math.max(3, Math.round((distanceKm / 25) * 60)); // 25 km/h urban speed

      return {
        distanceKm,
        durationMins,
        routeSource: 'haversine',
      };
    }
  },
};

export default locationService;
