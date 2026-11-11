/**
 * TypeScript definitions for LiveTrackingService
 */

export interface TrackingCoordinates {
  lat: number;
  lng: number;
  accuracy: number;
}

export interface RouteInfo {
  distanceKm: number | null;
  durationMin: number | null;
}

export interface LiveTrackingPayload {
  coords: TrackingCoordinates;
  address: string;
  route: RouteInfo;
  timestamp: number;
}

export interface LiveTrackingOptions {
  maxAccuracy?: number;
  minMovement?: number;
  nominatimDebounceMs?: number;
  userAgent?: string;
}

export declare class LiveTrackingService {
  constructor(options?: LiveTrackingOptions);
  startTracking(
    destination: { lat: number; lng: number },
    onUpdate: (payload: LiveTrackingPayload) => void,
    onError?: (error: GeolocationPositionError | Error) => void
  ): void;
  stopTracking(): void;
}

export declare const liveTracker: LiveTrackingService;
export default LiveTrackingService;
