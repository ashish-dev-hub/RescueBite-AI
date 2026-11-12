/**
 * RescueBite AI — Location & Routing Service
 *
 * Integrates:
 * 1. Dual-Pass Browser Geolocation (Wi-Fi triangulation + GPS satellite) with 15s timeout.
 * 2. OpenStreetMap Nominatim API for forward/reverse geocoding and live street search.
 * 3. Internet Provider IP Geolocation as an emergency secondary fallback.
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
   * Note: IP Geolocation identifies the regional telecom internet gateway (ISP node),
   * not the exact building or room.
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
            accuracy: 5000, // Regional telecom hub
            source: 'ip',
          };
        }
      }
    } catch (e) {
      // Secondary fallback
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
            accuracy: 5000,
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
   * Request real-time live location with dual-pass accuracy:
   * Pass 1: Wi-Fi triangulation (enableHighAccuracy: false) - fastest & most reliable on laptops/PCs.
   * Pass 2: Hardware GPS (enableHighAccuracy: true) - for mobile/GPS devices.
   * Pass 3: Regional IP fallback with clear user indication.
   */
  async getCurrentPosition() {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      // Pass 1: Standard Wi-Fi / Cell positioning (uses Google/Windows Wi-Fi BSSID database, ~15-50m accuracy)
      try {
        const wifiResult = await new Promise((resolve, reject) => {
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
            {
              enableHighAccuracy: false,
              timeout: 10000,
              maximumAge: 60000,
            }
          );
        });
        return wifiResult;
      } catch (pass1Err) {
        console.warn('[LocationService] Wi-Fi positioning attempt failed, trying high accuracy pass:', pass1Err.message);
      }

      // Pass 2: High accuracy GPS pass
      try {
        const highAccResult = await new Promise((resolve, reject) => {
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
            {
              enableHighAccuracy: true,
              timeout: 12000,
              maximumAge: 30000,
            }
          );
        });
        return highAccResult;
      } catch (pass2Err) {
        console.warn('[LocationService] High accuracy GPS attempt failed:', pass2Err.message);
      }
    }

    // Pass 3: Regional IP gateway fallback
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

    throw new Error('Location could not be determined automatically. Please type your actual street or colony address in the input above.');
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
   * Search addresses & localities using OpenStreetMap Nominatim
   * @param {string} query - Street, colony, or city query
   * @returns {Promise<Array<{ displayName: string, lat: number, lng: number, city: string, state: string }>>}
   */
  async searchAddresses(query) {
    if (!query || query.trim().length < 3) return [];

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
        query.trim()
      )}&limit=5&addressdetails=1`;

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'RescueBiteAI-CivicFoodRedistribution/1.0',
        },
      });

      if (!response.ok) return [];

      const results = await response.json();
      if (!Array.isArray(results)) return [];

      return results.map((item) => {
        const addr = item.address || {};
        const road = addr.road || addr.street || '';
        const locality = addr.suburb || addr.neighbourhood || '';
        const city = addr.city || addr.town || addr.village || '';
        const state = addr.state || '';
        const formatted = [road, locality, city, state].filter(Boolean).join(', ') || item.display_name;

        return {
          displayName: formatted,
          fullDisplayName: item.display_name,
          lat: Number(parseFloat(item.lat).toFixed(6)),
          lng: Number(parseFloat(item.lon).toFixed(6)),
          city,
          state,
          postalCode: addr.postcode || '',
        };
      });
    } catch (err) {
      console.warn('[LocationService] Street search failed:', err.message);
      return [];
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
   * @param {boolean} [includeGeometry=false] - Whether to include detailed road coordinates for Leaflet polylines
   * @returns {Promise<{ distanceKm: number, durationMins: number, routeSource: 'osrm' | 'haversine', coordinates?: Array<[number, number]> }>}
   */
  async getDrivingRoute(origin, destination, includeGeometry = false) {
    if (
      !origin ||
      !destination ||
      !origin.lat ||
      !origin.lng ||
      !destination.lat ||
      !destination.lng ||
      (origin.lat === destination.lat && origin.lng === destination.lng)
    ) {
      return {
        distanceKm: 0.5,
        durationMins: 4,
        routeSource: 'haversine',
        coordinates: origin?.lat && destination?.lat ? [[origin.lat, origin.lng], [destination.lat, destination.lng]] : [],
      };
    }

    try {
      const geomParam = includeGeometry ? 'overview=full&geometries=geojson' : 'overview=false&steps=false';
      const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?${geomParam}`;

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

        let coordinates = [];
        if (includeGeometry && route.geometry?.coordinates) {
          // OSRM GeoJSON is [lon, lat], convert to Leaflet [lat, lon]
          coordinates = route.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
        }

        return {
          distanceKm,
          durationMins,
          routeSource: 'osrm',
          coordinates,
        };
      }
      throw new Error('No driving route returned by OSRM');
    } catch (err) {
      const distanceKm = calculateHaversineDistance(origin.lat, origin.lng, destination.lat, destination.lng);
      const durationMins = Math.max(3, Math.round((distanceKm / 25) * 60));

      return {
        distanceKm,
        durationMins,
        routeSource: 'haversine',
        coordinates: [[origin.lat, origin.lng], [destination.lat, destination.lng]],
      };
    }
  },
};

export default locationService;
