/**
 * @file LiveTrackingMap.jsx
 * @description Production Interactive Leaflet Map for Real-Time Courier & Delivery Tracking
 * 
 * Powered by:
 * - OpenStreetMap (OSM) Cartographic Tiles
 * - Leaflet.js Interactive Canvas
 * - OSRM Road Geometry Polyline
 * - Socket.IO Live Coordinate Streaming
 */

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Compass, MapPin, Store, Building2, RotateCw } from 'lucide-react';

/**
 * Creates custom Leaflet HTML DivIcons with inline SVGs for zero broken-asset issues in Vite
 */
const createCustomMarkerIcon = (type, heading = 0) => {
  if (type === 'courier') {
    return L.divIcon({
      className: 'rescuebite-courier-marker',
      html: `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(16, 185, 129, 0.25); animation: pulse-ring 2s infinite ease-out;"></div>
          <div style="position: relative; width: 34px; height: 34px; border-radius: 50%; background: #064E3B; border: 3px solid #10B981; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; transform: rotate(${heading}deg); transition: transform 0.4s ease;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
            </svg>
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });
  }

  if (type === 'donor') {
    return L.divIcon({
      className: 'rescuebite-donor-marker',
      html: `
        <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
          <div style="width: 34px; height: 34px; border-radius: 50%; background: #065F46; border: 2.5px solid #FFFFFF; box-shadow: 0 3px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A7F3D0" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path>
              <path d="M7 2v20"></path>
              <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path>
            </svg>
          </div>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });
  }

  // NGO / Shelter Icon
  return L.divIcon({
    className: 'rescuebite-ngo-marker',
    html: `
      <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
        <div style="width: 34px; height: 34px; border-radius: 50%; background: #9A3412; border: 2.5px solid #FFFFFF; box-shadow: 0 3px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FED7AA" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 21h18"></path>
            <path d="M19 21v-4"></path>
            <path d="M19 13v-2"></path>
            <path d="M19 7V4a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v17"></path>
          </svg>
        </div>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
};

export default function LiveTrackingMap({
  donorCoords,
  donorName = 'Donor Kitchen',
  ngoCoords,
  ngoName = 'Receiving Shelter',
  courierCoords,
  routeCoordinates = [],
  distanceKm = null,
  durationMin = null,
  courierHeading = 0,
  courierSpeed = 0,
  status = 'in_transit',
  height = '420px',
  interactive = true,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({ donor: null, ngo: null, courier: null });
  const polylineRef = useRef({ casing: null, main: null });
  const [isFollowingCourier, setIsFollowingCourier] = useState(true);

  // Initialize Leaflet Map Instance
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Fallback center: Donor or NGO or New Delhi coordinates
    const initialCenter = donorCoords?.lat
      ? [donorCoords.lat, donorCoords.lng]
      : ngoCoords?.lat
      ? [ngoCoords.lat, ngoCoords.lng]
      : [28.6139, 77.2090];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 13,
      zoomControl: interactive,
      dragging: interactive,
      scrollWheelZoom: interactive ? 'center' : false,
    });

    // Add OpenStreetMap Cartographic Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map);

    mapInstanceRef.current = map;

    // User drag pauses auto-lock
    map.on('dragstart', () => setIsFollowingCourier(false));

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Donor & NGO Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // 1. Donor Marker
    if (donorCoords?.lat && donorCoords?.lng) {
      const donorLatLng = [donorCoords.lat, donorCoords.lng];
      if (!markersRef.current.donor) {
        markersRef.current.donor = L.marker(donorLatLng, {
          icon: createCustomMarkerIcon('donor'),
        })
          .addTo(map)
          .bindPopup(`<strong>${donorName}</strong><br/>Pickup Hub`);
      } else {
        markersRef.current.donor.setLatLng(donorLatLng);
      }
    }

    // 2. NGO Marker
    if (ngoCoords?.lat && ngoCoords?.lng) {
      const ngoLatLng = [ngoCoords.lat, ngoCoords.lng];
      if (!markersRef.current.ngo) {
        markersRef.current.ngo = L.marker(ngoLatLng, {
          icon: createCustomMarkerIcon('ngo'),
        })
          .addTo(map)
          .bindPopup(`<strong>${ngoName}</strong><br/>Delivery Destination`);
      } else {
        markersRef.current.ngo.setLatLng(ngoLatLng);
      }
    }
  }, [donorCoords?.lat, donorCoords?.lng, ngoCoords?.lat, ngoCoords?.lng, donorName, ngoName]);

  // Update Live Courier Marker & Auto-pan
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (courierCoords?.lat && courierCoords?.lng) {
      const courierLatLng = [courierCoords.lat, courierCoords.lng];

      if (!markersRef.current.courier) {
        markersRef.current.courier = L.marker(courierLatLng, {
          icon: createCustomMarkerIcon('courier', courierHeading),
          zIndexOffset: 1000,
        })
          .addTo(map)
          .bindPopup(`<strong>Courier in Transit</strong><br/>Heading: ${courierHeading}°`);
      } else {
        markersRef.current.courier.setLatLng(courierLatLng);
        markersRef.current.courier.setIcon(createCustomMarkerIcon('courier', courierHeading));
      }

      if (isFollowingCourier) {
        map.panTo(courierLatLng, { animate: true, duration: 0.8 });
      }
    }
  }, [courierCoords?.lat, courierCoords?.lng, courierHeading, isFollowingCourier]);

  // Render & Update OSRM Driving Polyline on OpenStreetMap
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (Array.isArray(routeCoordinates) && routeCoordinates.length > 1) {
      // Remove old polylines if exist
      if (polylineRef.current.casing) map.removeLayer(polylineRef.current.casing);
      if (polylineRef.current.main) map.removeLayer(polylineRef.current.main);

      // Casing for contrast
      polylineRef.current.casing = L.polyline(routeCoordinates, {
        color: '#064E3B',
        weight: 7,
        opacity: 0.4,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // Main driving route line
      polylineRef.current.main = L.polyline(routeCoordinates, {
        color: '#10B981',
        weight: 4.5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // Fit bounds initially to display complete corridor
      const bounds = L.latLngBounds(routeCoordinates);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [routeCoordinates]);

  const handleRecenter = () => {
    setIsFollowingCourier(true);
    const map = mapInstanceRef.current;
    if (!map) return;

    if (courierCoords?.lat && courierCoords?.lng) {
      map.setView([courierCoords.lat, courierCoords.lng], 15, { animate: true });
    } else if (donorCoords?.lat && ngoCoords?.lat) {
      const bounds = L.latLngBounds([
        [donorCoords.lat, donorCoords.lng],
        [ngoCoords.lat, ngoCoords.lng],
      ]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height, borderRadius: '14px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
      {/* Map Container */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Floating HUD: Live Status, Distance & ETA */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          zIndex: 1000,
          background: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(8px)',
          borderRadius: '10px',
          padding: '8px 14px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '0.82rem',
          fontWeight: 600,
          color: '#1E293B',
          border: '1px solid rgba(226, 232, 240, 0.8)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: status === 'delivered' ? '#10B981' : '#F59E0B',
              boxShadow: '0 0 8px currentColor',
            }}
          />
          <span style={{ textTransform: 'capitalize' }}>
            {status === 'delivered' ? 'Delivered' : 'Live Transit'}
          </span>
        </div>

        {distanceKm !== null && (
          <div style={{ borderLeft: '1px solid #CBD5E1', paddingLeft: '10px' }}>
            <span>🚗 {distanceKm} km remaining</span>
          </div>
        )}

        {durationMin !== null && (
          <div style={{ borderLeft: '1px solid #CBD5E1', paddingLeft: '10px' }}>
            <span>⏱️ ETA: ~{durationMin} mins</span>
          </div>
        )}
      </div>

      {/* Re-center / Follow Courier Button */}
      <button
        onClick={handleRecenter}
        title="Re-center on Courier"
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '12px',
          zIndex: 1000,
          background: isFollowingCourier ? '#065F46' : '#FFFFFF',
          color: isFollowingCourier ? '#FFFFFF' : '#065F46',
          border: '1px solid #D1D5DB',
          borderRadius: '50%',
          width: '38px',
          height: '38px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 3px 10px rgba(0,0,0,0.18)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        <Navigation size={18} />
      </button>

      {/* Inline styles for pulse animation */}
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.6); opacity: 0.9; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .leaflet-container {
          font-family: inherit;
        }
      `}</style>
    </div>
  );
}

