/**
 * @file liveTrackingService.js
 * @description Production-Grade Real-Time Live Location Tracking Service
 * 
 * Features:
 * 1. High-Accuracy Browser Geolocation with watchPosition lifecycle management.
 * 2. GPS Noise & Jitter Filter (Accuracy <= 30m rejection).
 * 3. Haversine Distance Threshold (Ignores stationary micro-movements < 15m).
 * 4. Nominatim Reverse Geocoding with strict 1 req/sec compliance, debouncing, and custom User-Agent.
 * 5. OSRM Live Driving ETA & Distance recalculations (Strict [lng, lat] coordinate ordering).
 * 6. Clean lifecycle teardown (cancels active timers, aborts in-flight network requests).
 */

/**
 * Calculates great-circle distance between two geographic coordinates using Haversine formula.
 * @param {number} lat1 Latitude of point 1 in degrees
 * @param {number} lon1 Longitude of point 1 in degrees
 * @param {number} lat2 Latitude of point 2 in degrees
 * @param {number} lon2 Longitude of point 2 in degrees
 * @returns {number} Distance in meters
 */
export function calculateHaversineMeters(lat1, lon1, lat2, lon2) {
  const EARTH_RADIUS_METERS = 6371000;
  const toRadians = (deg) => (deg * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

export class LiveTrackingService {
  constructor(options = {}) {
    // Configuration thresholds
    this.MAX_ACCURACY_THRESHOLD_METERS = options.maxAccuracy || 30; // Reject GPS noise > 30m
    this.MIN_MOVEMENT_THRESHOLD_METERS = options.minMovement || 15; // Ignore jitter < 15m
    this.NOMINATIM_DEBOUNCE_MS = options.nominatimDebounceMs || 3500; // Strict throttling for Nominatim
    this.NOMINATIM_USER_AGENT = options.userAgent || 'RescueBiteAI-LiveTracker/1.0 (contact@rescuebite.org)';

    // Active tracking state
    this.watchId = null;
    this.destination = null; // { lat, lng }
    this.lastEmittedPosition = null; // { lat, lng, accuracy }
    this.currentAddress = 'Locating street address...';
    this.currentRoute = { distanceKm: null, durationMin: null };
    this.isTracking = false;

    // Timers & Network controllers
    this.nominatimTimer = null;
    this.osrmAbortController = null;
    this.nominatimAbortController = null;
    this.lastOsmRequestTimestamp = 0;

    // User callbacks
    this.onUpdateCallback = null;
    this.onErrorCallback = null;
  }

  /**
   * Start tracking user position in real time towards a target destination.
   * 
   * @param {Object} destination Destination coordinate
   * @param {number} destination.lat Target latitude
   * @param {number} destination.lng Target longitude
   * @param {Function} onUpdate Callback invoked with updated tracking payload
   * @param {Function} onError Callback invoked on critical errors
   */
  startTracking(destination, onUpdate, onError) {
    if (!('geolocation' in navigator)) {
      const err = new Error('Geolocation is not supported by this browser.');
      if (onError) onError(err);
      return;
    }

    if (!destination || typeof destination.lat !== 'number' || typeof destination.lng !== 'number') {
      const err = new Error('Invalid destination coordinates provided. Expected { lat, lng }.');
      if (onError) onError(err);
      return;
    }

    // Clean up any existing tracking session before re-initializing
    this.stopTracking();

    this.destination = { lat: destination.lat, lng: destination.lng };
    this.onUpdateCallback = onUpdate;
    this.onErrorCallback = onError;
    this.isTracking = true;

    const geolocationOptions = {
      enableHighAccuracy: true, // Forces hardware GPS on mobile / Wi-Fi triangulation on desktop
      timeout: 10000,          // 10s maximum wait time per reading
      maximumAge: 0,           // Never return a cached position; force fresh reading
    };

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this._handlePositionSuccess(pos),
      (err) => this._handlePositionError(err),
      geolocationOptions
    );
  }

  /**
   * Internal handler for incoming geolocation fixes
   * @private
   */
  async _handlePositionSuccess(position) {
    if (!this.isTracking) return;

    const { latitude, longitude, accuracy } = position.coords;

    /*
     * 1. ACCURACY FILTER:
     * Discard low-confidence readings. GPS cold starts or indoor multipath reflections
     * can report accuracy readings of 50m-200m+, causing erratic location jumping.
     */
    if (accuracy > this.MAX_ACCURACY_THRESHOLD_METERS) {
      console.warn(
        `[LiveTrackingService] Skipped noisy GPS fix. Accuracy (${accuracy.toFixed(1)}m) exceeded limit (${this.MAX_ACCURACY_THRESHOLD_METERS}m).`
      );
      return;
    }

    /*
     * 2. HAVERSINE DISTANCE FILTER (Anti-Jitter Threshold):
     * When stationary, GPS drift emits small fluctuations (1m-5m).
     * If the user hasn't moved >= 15m from the last confirmed position, do not re-calculate routes or fire updates.
     */
    if (this.lastEmittedPosition) {
      const distanceMovedMeters = calculateHaversineMeters(
        this.lastEmittedPosition.lat,
        this.lastEmittedPosition.lng,
        latitude,
        longitude
      );

      if (distanceMovedMeters < this.MIN_MOVEMENT_THRESHOLD_METERS) {
        // Stationary jitter ignored
        return;
      }
    }

    // Update verified position
    this.lastEmittedPosition = {
      lat: Number(latitude.toFixed(6)),
      lng: Number(longitude.toFixed(6)),
      accuracy: Math.round(accuracy),
    };

    /*
     * 3. OSRM LIVE ROUTING UPDATE:
     * High priority: Recalculate driving ETA and road distance immediately upon verified movement.
     */
    await this._updateRoute(this.lastEmittedPosition, this.destination);

    /*
     * 4. NOMINATIM REVERSE GEOCODING (Debounced):
     * Nominatim strictly rate-limits to 1 request/second and reverse geocoding on every GPS ping
     * causes 429 bans and UI flickering. We debounce it so address is fetched only when the user
     * settles or after the configured quiet window.
     */
    this._scheduleReverseGeocode(this.lastEmittedPosition);

    // Emit live state update immediately with current known address and new route
    this._emitUpdate();
  }

  /**
   * Internal error handler for watchPosition
   * @private
   */
  _handlePositionError(error) {
    console.error('[LiveTrackingService] Geolocation error:', error.message);
    if (this.onErrorCallback) {
      this.onErrorCallback(error);
    }
  }

  /**
   * Recalculates route and ETA using OSRM Public Driving API
   * @private
   */
  async _updateRoute(origin, destination) {
    if (!destination) return;

    // Abort previous in-flight OSRM request if a newer position arrived
    if (this.osrmAbortController) {
      this.osrmAbortController.abort();
    }
    this.osrmAbortController = new AbortController();

    try {
      /*
       * CRITICAL OSRM NOTE:
       * OSRM API strictly requires coordinates in {longitude},{latitude} order!
       * Passing {lat},{lng} will reverse X/Y, causing 400 errors or routing into the ocean.
       * Correct format: /<originLng>,<originLat>;<destLng>,<destLat>
       */
      const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=false&steps=false`;

      const response = await fetch(url, {
        signal: this.osrmAbortController.signal,
      });

      if (!response.ok) {
        throw new Error(`OSRM HTTP error: ${response.status}`);
      }

      const data = await response.json();

      if (data?.routes && data.routes.length > 0) {
        const primaryRoute = data.routes[0];
        this.currentRoute = {
          distanceKm: Number((primaryRoute.distance / 1000).toFixed(2)),
          durationMin: Math.max(1, Math.round(primaryRoute.duration / 60)),
        };
      }
    } catch (err) {
      if (err.name === 'AbortError') return; // Cancelled in favor of newer coordinates

      console.warn('[LiveTrackingService] OSRM route calculation failed. Falling back to Haversine estimate:', err.message);

      // Graceful fallback to Haversine straight-line distance + urban speed model (~25 km/h)
      const straightLineMeters = calculateHaversineMeters(origin.lat, origin.lng, destination.lat, destination.lng);
      const distanceKm = Number((straightLineMeters / 1000).toFixed(2));
      const durationMin = Math.max(1, Math.round((distanceKm / 25) * 60));

      this.currentRoute = {
        distanceKm,
        durationMin,
      };
    }
  }

  /**
   * Debounces Nominatim reverse geocode calls to respect OSM usage policy (max 1 req/sec)
   * @private
   */
  _scheduleReverseGeocode(coords) {
    // Clear any pending debounced timer
    if (this.nominatimTimer) {
      clearTimeout(this.nominatimTimer);
    }

    this.nominatimTimer = setTimeout(async () => {
      // Abort in-flight Nominatim request if pending
      if (this.nominatimAbortController) {
        this.nominatimAbortController.abort();
      }
      this.nominatimAbortController = new AbortController();

      try {
        /*
         * NOMINATIM RATE-LIMITING COMPLIANCE:
         * 1. Max 1 request per second enforced via timestamp throttling.
         * 2. Mandatory custom User-Agent identifying the client app.
         */
        const now = Date.now();
        const timeSinceLast = now - this.lastOsmRequestTimestamp;
        if (timeSinceLast < 1000) {
          await new Promise((r) => setTimeout(r, 1000 - timeSinceLast));
        }
        this.lastOsmRequestTimestamp = Date.now();

        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.lat}&lon=${coords.lng}&zoom=18&addressdetails=1`;

        const response = await fetch(url, {
          signal: this.nominatimAbortController.signal,
          headers: {
            Accept: 'application/json',
            'User-Agent': this.NOMINATIM_USER_AGENT,
          },
        });

        if (!response.ok) {
          throw new Error(`Nominatim HTTP error: ${response.status}`);
        }

        const data = await response.json();
        if (data?.address) {
          const addr = data.address;
          const road = addr.road || addr.street || addr.pedestrian || '';
          const neighborhood = addr.suburb || addr.neighbourhood || addr.residential || '';
          const city = addr.city || addr.town || addr.village || addr.county || '';
          const state = addr.state || '';

          const parts = [road, neighborhood, city, state].filter(Boolean);
          this.currentAddress = parts.join(', ') || data.display_name;
        } else if (data?.display_name) {
          this.currentAddress = data.display_name;
        }

        // Emit update with resolved human-readable address
        this._emitUpdate();
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.warn('[LiveTrackingService] Nominatim reverse geocode failed:', err.message);
      }
    }, this.NOMINATIM_DEBOUNCE_MS);
  }

  /**
   * Dispatches clean tracking state to listener callback
   * @private
   */
  _emitUpdate() {
    if (!this.onUpdateCallback || !this.lastEmittedPosition) return;

    this.onUpdateCallback({
      coords: { ...this.lastEmittedPosition },
      address: this.currentAddress,
      route: { ...this.currentRoute },
      timestamp: Date.now(),
    });
  }

  /**
   * Stop tracking and clean up all listeners, timers, and abort controllers
   */
  stopTracking() {
    this.isTracking = false;

    // 1. Clear active watchPosition listener
    if (this.watchId !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    // 2. Clear pending debounce timer
    if (this.nominatimTimer) {
      clearTimeout(this.nominatimTimer);
      this.nominatimTimer = null;
    }

    // 3. Abort active network requests
    if (this.osrmAbortController) {
      this.osrmAbortController.abort();
      this.osrmAbortController = null;
    }
    if (this.nominatimAbortController) {
      this.nominatimAbortController.abort();
      this.nominatimAbortController = null;
    }

    // 4. Reset internal state references
    this.lastEmittedPosition = null;
    this.destination = null;
    this.onUpdateCallback = null;
    this.onErrorCallback = null;
  }
}

// Export singleton helper as well as class
export const liveTracker = new LiveTrackingService();
export default LiveTrackingService;
