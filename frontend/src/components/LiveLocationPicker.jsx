import React, { useState } from 'react';
import { MapPin, Navigation, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import locationService from '../services/locationService';

/**
 * LiveLocationPicker Component
 * Allows donors, shelters, and coordinators to fetch real GPS coordinates
 * and automatically resolve them to a street address via OpenStreetMap Nominatim.
 */
export default function LiveLocationPicker({
  onLocationDetected,
  currentCoordinates = null,
  compact = false,
  disabled = false,
}) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', message: string, coords?: { lat, lng } }

  const handleDetectLocation = async (e) => {
    if (e) e.preventDefault();
    if (disabled || loading) return;

    setLoading(true);
    setStatus(null);

    try {
      // 1. Fetch live GPS coordinates from the device / browser
      const coords = await locationService.getCurrentPosition();

      // 2. Reverse geocode coordinates to street address via OpenStreetMap
      const geoResult = await locationService.reverseGeocode(coords.lat, coords.lng);

      setStatus({
        type: 'success',
        message: 'Live GPS detected via OpenStreetMap',
        coords: { lat: coords.lat, lng: coords.lng },
        accuracy: coords.accuracy,
      });

      if (onLocationDetected) {
        onLocationDetected({
          address: geoResult.address,
          city: geoResult.city,
          state: geoResult.state,
          postalCode: geoResult.postalCode,
          coordinates: { lat: coords.lat, lng: coords.lng },
          displayName: geoResult.displayName,
        });
      }
    } catch (err) {
      setStatus({
        type: 'error',
        message: err.message || 'Failed to detect live location',
      });
    } finally {
      setLoading(false);
    }
  };

  const coords = status?.coords || currentCoordinates;
  const hasValidCoords = coords && coords.lat && coords.lng && (coords.lat !== 0 || coords.lng !== 0);

  return (
    <div style={{ marginTop: '0.45rem', marginBottom: '0.45rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={handleDetectLocation}
          disabled={disabled || loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: compact ? '0.35rem 0.65rem' : '0.45rem 0.85rem',
            fontSize: '0.78rem',
            fontWeight: 700,
            borderRadius: 'var(--radius-btn-sm, 8px)',
            border: '1px solid var(--color-network-green, #1F6F43)',
            backgroundColor: loading ? '#F3F9F5' : '#FFFDF9',
            color: 'var(--color-network-green, #1F6F43)',
            cursor: disabled || loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
          title="Detect live GPS coordinates and resolve physical address via OpenStreetMap"
        >
          {loading ? (
            <>
              <Loader2 size={13} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
              <span>Detecting Live GPS...</span>
            </>
          ) : (
            <>
              <Navigation size={13} color="var(--color-network-green, #1F6F43)" />
              <span>Use Live GPS Location</span>
            </>
          )}
        </button>

        {hasValidCoords && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.74rem',
              fontWeight: 600,
              color: 'var(--color-forest-green, #1F6F43)',
              backgroundColor: 'var(--color-soft-mint, #EAF5F0)',
              border: '1px solid var(--color-soft-mint-border, #C4E3D4)',
              borderRadius: '9999px',
              padding: '0.2rem 0.55rem',
            }}
          >
            <CheckCircle2 size={12} color="var(--color-forest-green, #1F6F43)" />
            <span>GPS: {Number(coords.lat).toFixed(4)}°, {Number(coords.lng).toFixed(4)}°</span>
            {status?.accuracy && (
              <span style={{ fontSize: '0.68rem', color: '#685B52' }}>(&plusmn;{status.accuracy}m)</span>
            )}
          </span>
        )}
      </div>

      {status?.type === 'error' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.74rem',
            color: 'var(--color-terracotta, #C44824)',
            marginTop: '0.35rem',
          }}
        >
          <AlertCircle size={13} color="var(--color-terracotta, #C44824)" />
          <span>{status.message}</span>
        </div>
      )}
    </div>
  );
}
