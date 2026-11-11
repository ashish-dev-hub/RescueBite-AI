/**
 * RescueBite AI — Location & Routing Service
 *
 * Integrates:
 * 1. Browser Native Geolocation API (navigator.geolocation) for exact live GPS coordinates.
 * 2. Automatic Network IP Geolocation fallback for when device GPS is restricted by OS or browser settings.
 * 3. OpenStreetMap Nominatim API for 100% free forward and reverse geocoding (no API key required).
 * 4. OSRM (Open Source Routing Machine) API for real road driving distance and transit duration calculations.
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
   * Fetch approximate location via IP Geolocation (Zero permission required)
   * Fallback for when device GPS is disabled in Windows or browser permissions are blocked.
   */
  async getIpLocation() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);
      const res = await fetch('https://ipapi.co/json/', {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data && data.latitude && data.longitude) {
          return {
            lat: Number(parseFloat(data.latitude).toFixed(6)),
            lng: Number(parseFloat(data.longitude).toFixed(6)),
            city: data.city || '',
            state: data.region || '',
            postalCode: data.postal || '',
            address: [data.city, data.region, data.country_name].filter(Boolean).join(', '),
            accuracy: 2500, // ~2.5km locality accuracy
            source: 'ip',
          };
        }
      }
    } catch (e) {
      // Attempt secondary free provider
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);
      const res = await fetch('https://ipwho.is/', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data && data.latitude && data.longitude) {
          return {
            lat: Number(parseFloat(data.latitude).toFixed(6)),
            lng: Number(parseFloat(data.longitude).toFixed(6)),
            city: data.city || '',
            state: data.region || '',
            postalCode: data.postal || '',
            address: [data.city, data.region, data.country].filter(Boolean).join(', '),
            accuracy: 3000,
            source: 'ip',
          };
        }
      }
    } catch (e) {
      // Ignored
    }

    return null;
  },

  /**
   * Request real-time live GPS coordinates from the device / browser with automatic IP fallback
   * @param {Object} options - Geolocation position options
   * @returns {Promise<{ lat: number, lng: number, accuracy: number, source: 'gps' | 'ip' }>}
   */
  async getCurrentPosition(options = { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 }) {
    // 1. Attempt Native Browser GPS
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const gpsResult = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              resolve({
                lat: Number(pos.coords.latitude.toFixed(6)),
                lng: Number(pos.coords.longitude.toFixed(6)),
                accuracy: Math.round(pos.coords.accuracy),
                source: 'gps',
              });
            },
            (err) => reject(err),
            options
          );
        });
        return gpsResult;
      } catch (gpsErr) {
        console.warn('[LocationService] Browser GPS attempt failed, activating IP network fallback:', gpsErr.message);
      }
    }

    // 2. Seamless IP Geolocation Fallback
    const ipLocation = await this.getIpLocation();
    if (ipLocation) {
      return {
        lat: ipLocation.lat,
        lng: ipLocation.lng,
        accuracy: ipLocation.accuracy,
        source: 'ip',
        city: ipLocation.city,
        state: ipLocation.state,
        postalCode: ipLocation.postalCode,
        address: ipLocation.address,
      };
    }

    throw new Error('Location access is restricted. Please check your browser or Windows location permissions, or type your address manually.');
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
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`OSRM routing failed with status: ${response.status}`);
      }

      const data = await response.json();
      if (data.code === 'Ok' && Array.isArray(data.routes) && data.routes.length > 0) {
        const route = data.routes[0];
        const distanceKm = Number((route.distance / 1000).toFixed(1));
        const durationMins = Math.max(1, Math.round(route.duration / 60));

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
      const durationMins = Math.max(3, Math.round((distanceKm / 25) * 60));

      return {
        distanceKm,
        durationMins,
        routeSource: 'haversine',
      };
    }
  },
};

export default locationService;
