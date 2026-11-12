/**
 * @file LiveDeliveryModal.jsx
 * @description Real-Time Live Delivery Tracking Modal with Leaflet, OSM, OSRM, and Socket.IO
 */

import React, { useEffect, useState, useRef } from 'react';
import { X, Navigation, Play, Square, Truck, RefreshCw } from 'lucide-react';
import LiveTrackingMap from './LiveTrackingMap';
import locationService from '../services/locationService';
import socketService from '../services/socketService';
import { liveTracker } from '../services/liveTrackingService';

/**
 * Computes deterministic, distinct geographical coordinates from an object ID
 * to ensure two different deliveries never collapse into the exact same coordinates.
 */
function getDeterministicOffsetCoords(id, baseCoord, multiplier = 1) {
  if (!id) return baseCoord;
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const latOffset = (((Math.abs(hash) % 100) - 50) * 0.0006) * multiplier;
  const lngOffset = ((((Math.abs(hash >> 3)) % 100) - 50) * 0.0006) * multiplier;
  return {
    lat: Number((baseCoord.lat + latOffset).toFixed(6)),
    lng: Number((baseCoord.lng + lngOffset).toFixed(6)),
  };
}

export default function LiveDeliveryModal({
  allocation,
  isOpen,
  onClose,
  currentUser = null,
}) {
  const [donorCoords, setDonorCoords] = useState(null);
  const [ngoCoords, setNgoCoords] = useState(null);
  const [courierCoords, setCourierCoords] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [routeMetrics, setRouteMetrics] = useState({ distanceKm: null, durationMins: null });
  const [courierHeading, setCourierHeading] = useState(0);
  const [courierSpeed, setCourierSpeed] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isBroadcastingGps, setIsBroadcastingGps] = useState(false);
  const [status, setStatus] = useState('in_transit');
  const [loadingRoute, setLoadingRoute] = useState(true);

  const simulationIntervalRef = useRef(null);

  // Extract, dynamically geocode, and resolve distinct donor & NGO coordinates
  useEffect(() => {
    if (!isOpen || !allocation) return;

    let isMounted = true;
    setLoadingRoute(true);
    setStatus(allocation.status || 'in_transit');

    async function resolveCoordinatesAndRoute() {
      // 1. Resolve Donor Coordinates
      let donorFinal = null;
      const rawDonorLoc =
        allocation.donationId?.location?.coordinates ||
        allocation.donationId?.donorId?.location?.coordinates;

      if (rawDonorLoc?.lat && rawDonorLoc?.lng && (rawDonorLoc.lat !== 0 || rawDonorLoc.lng !== 0)) {
        donorFinal = { lat: rawDonorLoc.lat, lng: rawDonorLoc.lng };
      } else {
        const donorAddress =
          allocation.donationId?.location?.address ||
          allocation.donationId?.donorOrg ||
          '';

        if (donorAddress && donorAddress.trim().length > 3) {
          const geocoded = await locationService.forwardGeocode(donorAddress);
          if (geocoded?.lat && geocoded?.lng) {
            donorFinal = { lat: geocoded.lat, lng: geocoded.lng };
          }
        }
      }

      // Fallback with distinct deterministic offset per consignment ID
      if (!donorFinal) {
        donorFinal = getDeterministicOffsetCoords(
          allocation._id || allocation.donationId?._id,
          { lat: 28.6315, lng: 77.2167 }, // Central Delhi base
          1
        );
      }

      // 2. Resolve NGO Shelter Coordinates
      let ngoFinal = null;
      const rawNgoLoc =
        allocation.ngoId?.location?.coordinates ||
        allocation.demandId?.location?.coordinates;

      if (rawNgoLoc?.lat && rawNgoLoc?.lng && (rawNgoLoc.lat !== 0 || rawNgoLoc.lng !== 0)) {
        ngoFinal = { lat: rawNgoLoc.lat, lng: rawNgoLoc.lng };
      } else {
        const ngoAddress =
          allocation.demandId?.location?.address ||
          allocation.ngoId?.location?.address ||
          '';

        if (ngoAddress && ngoAddress.trim().length > 3) {
          const geocoded = await locationService.forwardGeocode(ngoAddress);
          if (geocoded?.lat && geocoded?.lng) {
            ngoFinal = { lat: geocoded.lat, lng: geocoded.lng };
          }
        }
      }

      // Fallback with distinct deterministic offset per NGO / Allocation ID
      if (!ngoFinal) {
        ngoFinal = getDeterministicOffsetCoords(
          allocation.demandId?._id || allocation.ngoId?._id || allocation._id,
          { lat: 28.6540, lng: 77.2340 }, // North/Old Delhi base
          -1.5
        );
      }

      if (!isMounted) return;

      setDonorCoords(donorFinal);
      setNgoCoords(ngoFinal);
      setCourierCoords(donorFinal);

      // 3. Fetch Road Driving Geometry via OSRM
      try {
        const res = await locationService.getDrivingRoute(donorFinal, ngoFinal, true);
        if (!isMounted) return;

        if (res?.coordinates && res.coordinates.length > 0) {
          setRouteCoordinates(res.coordinates);
        }
        setRouteMetrics({
          distanceKm: res.distanceKm,
          durationMins: res.durationMins,
        });
      } catch (err) {
        console.warn('[LiveDeliveryModal] OSRM route fetch error:', err.message);
      } finally {
        if (isMounted) setLoadingRoute(false);
      }
    }

    resolveCoordinatesAndRoute();

    // Join Socket.IO delivery room
    const allocationId = allocation._id;
    socketService.joinDeliveryRoom(allocationId, {
      role: currentUser?.role || 'observer',
      userName: currentUser?.name || 'RescueBite Member',
    });

    const handleCourierUpdate = (payload) => {
      if (payload?.coords?.lat && payload?.coords?.lng) {
        setCourierCoords(payload.coords);
        if (payload.coords.heading) setCourierHeading(payload.coords.heading);
        if (payload.coords.speed) setCourierSpeed(payload.coords.speed);
        if (payload.status) setStatus(payload.status);
      }
    };

    socketService.onCourierLocationUpdate(handleCourierUpdate);

    return () => {
      isMounted = false;
      socketService.offCourierLocationUpdate(handleCourierUpdate);
      socketService.leaveDeliveryRoom(allocationId);
      stopSimulation();
      stopGpsBroadcast();
    };
  }, [isOpen, allocation]);

  // Realistic Waypoint Simulation along actual OSRM road polyline
  const startSimulation = () => {
    if (!routeCoordinates || routeCoordinates.length < 2) return;
    setIsSimulating(true);
    stopGpsBroadcast();

    let stepIndex = 0;
    const totalSteps = routeCoordinates.length;

    simulationIntervalRef.current = setInterval(() => {
      if (stepIndex >= totalSteps) {
        setIsSimulating(false);
        clearInterval(simulationIntervalRef.current);
        setStatus('delivered');
        try {
          socketService.sendDeliveryStatus({
            allocationId: allocation._id,
            status: 'delivered',
            note: 'Consignment successfully delivered to shelter.',
          });
        } catch {
          // Graceful fallback for offline / serverless
        }
        return;
      }

      const currentPoint = routeCoordinates[stepIndex];
      const nextPoint = stepIndex + 1 < totalSteps ? routeCoordinates[stepIndex + 1] : currentPoint;

      const dLat = nextPoint[0] - currentPoint[0];
      const dLng = nextPoint[1] - currentPoint[1];
      const headingDeg = Math.round((Math.atan2(dLng, dLat) * 180) / Math.PI + 360) % 360;

      const coords = {
        lat: currentPoint[0],
        lng: currentPoint[1],
        heading: headingDeg,
        speed: 32,
      };

      setCourierCoords(coords);
      setCourierHeading(headingDeg);
      setCourierSpeed(32);
      setStatus('in_transit');

      try {
        socketService.sendCourierLocation({
          allocationId: allocation._id,
          coords,
          progressPercent: Math.round((stepIndex / totalSteps) * 100),
          status: stepIndex === totalSteps - 1 ? 'delivered' : 'in_transit',
        });
      } catch {
        // Safe for offline / serverless
      }

      if (ngoCoords) {
        const remainingKm = Math.max(
          0.1,
          Number((((totalSteps - stepIndex) / totalSteps) * (routeMetrics.distanceKm || 3)).toFixed(1))
        );
        const remainingMins = Math.max(1, Math.round((remainingKm / 32) * 60));
        setRouteMetrics({ distanceKm: remainingKm, durationMins: remainingMins });
      }

      stepIndex += 1;
    }, 1200);
  };

  const stopSimulation = () => {
    setIsSimulating(false);
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
  };

  // Broadcast real device GPS via watchPosition & liveTracker
  const startGpsBroadcast = () => {
    if (!ngoCoords) return;
    stopSimulation();
    setIsBroadcastingGps(true);

    liveTracker.startTracking(
      ngoCoords,
      (payload) => {
        setCourierCoords(payload.coords);
        if (payload.route?.distanceKm) {
          setRouteMetrics({
            distanceKm: payload.route.distanceKm,
            durationMin: payload.route.durationMin,
          });
        }
        try {
          socketService.sendCourierLocation({
            allocationId: allocation._id,
            coords: payload.coords,
            status: 'in_transit',
          });
        } catch {
          // Safe for offline / serverless
        }
      },
      (err) => {
        console.warn('[LiveDeliveryModal] Real GPS broadcast warning:', err.message);
      }
    );
  };

  const stopGpsBroadcast = () => {
    setIsBroadcastingGps(false);
    liveTracker.stopTracking();
  };

  if (!isOpen || !allocation) return null;

  const donorName = allocation.donationId?.donorName || allocation.donationId?.donorOrg || 'Donor Kitchen';
  const ngoName = allocation.ngoId?.organization || allocation.ngoId?.name || 'Partner Shelter';
  const foodName = allocation.donationId?.foodName || 'Surplus Food Consignment';
  const portions = allocation.approvedMeals || allocation.recommendedMeals || 40;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '840px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#F8FAFC',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: '#ECFDF5',
                color: '#065F46',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Truck size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>
                Live Delivery Route & Transit Tracking
              </h3>
              <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748B' }}>
                {foodName} • {portions} Meals • Real-time Leaflet & OSRM
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close Tracking Modal"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px 18px 18px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Live Leaflet Map Component */}
          <div>
            {loadingRoute ? (
              <div
                style={{
                  height: '270px',
                  borderRadius: '12px',
                  background: '#F1F5F9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: '8px',
                  color: '#64748B',
                  fontSize: '0.85rem',
                }}
              >
                <RefreshCw size={24} style={{ animation: 'spin 1.5s linear infinite' }} />
                <span>Calculating OSRM road geometry & geocoding locations...</span>
              </div>
            ) : (
              <LiveTrackingMap
                donorCoords={donorCoords}
                donorName={donorName}
                ngoCoords={ngoCoords}
                ngoName={ngoName}
                courierCoords={courierCoords}
                routeCoordinates={routeCoordinates}
                distanceKm={routeMetrics.distanceKm}
                durationMin={routeMetrics.durationMins}
                courierHeading={courierHeading}
                courierSpeed={courierSpeed}
                status={status}
                height="270px"
              />
            )}
          </div>

          {/* Origin & Destination Addresses */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '10px',
              background: '#F8FAFC',
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669', marginTop: '5px' }} />
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
                  Pickup From (Donor)
                </span>
                <p style={{ margin: 0, fontSize: '0.84rem', fontWeight: 600, color: '#1E293B' }}>{donorName}</p>
                <small style={{ color: '#64748B', fontSize: '0.74rem' }}>
                  {allocation.donationId?.location?.address || 'Connaught Place Hub'}
                </small>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EA580C', marginTop: '5px' }} />
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
                  Deliver To (Shelter)
                </span>
                <p style={{ margin: 0, fontSize: '0.84rem', fontWeight: 600, color: '#1E293B' }}>{ngoName}</p>
                <small style={{ color: '#64748B', fontSize: '0.74rem' }}>
                  {allocation.demandId?.location?.address || allocation.ngoId?.location?.address || 'Community Center'}
                </small>
              </div>
            </div>
          </div>

          {/* Interactive Simulation & Live Broadcast Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              paddingTop: '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {!isSimulating ? (
                <button
                  onClick={startSimulation}
                  disabled={loadingRoute || isBroadcastingGps}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#065F46',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: loadingRoute || isBroadcastingGps ? 'not-allowed' : 'pointer',
                    opacity: loadingRoute || isBroadcastingGps ? 0.6 : 1,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Play size={14} fill="#FFFFFF" />
                  Simulate Courier Transit
                </button>
              ) : (
                <button
                  onClick={stopSimulation}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#DC2626',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  <Square size={14} fill="#FFFFFF" />
                  Stop Simulation
                </button>
              )}

              {!isBroadcastingGps ? (
                <button
                  onClick={startGpsBroadcast}
                  disabled={isSimulating || loadingRoute}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#FFFFFF',
                    color: '#065F46',
                    border: '1.5px solid #065F46',
                    padding: '7px 13px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: isSimulating || loadingRoute ? 'not-allowed' : 'pointer',
                    opacity: isSimulating || loadingRoute ? 0.5 : 1,
                  }}
                >
                  <Navigation size={14} />
                  Broadcast Live Device GPS
                </button>
              ) : (
                <button
                  onClick={stopGpsBroadcast}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#FEF2F2',
                    color: '#DC2626',
                    border: '1.5px solid #DC2626',
                    padding: '7px 13px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  <Square size={14} />
                  Stop GPS Broadcast
                </button>
              )}
            </div>

            <div style={{ fontSize: '0.76rem', color: '#64748B' }}>
              {isSimulating && (
                <span style={{ color: '#059669', fontWeight: 600 }}>
                  🟢 Moving courier along real road waypoints...
                </span>
              )}
              {isBroadcastingGps && (
                <span style={{ color: '#0284C7', fontWeight: 600 }}>
                  🔵 Transmitting hardware GPS coordinates...
                </span>
              )}
              {!isSimulating && !isBroadcastingGps && (
                <span>📡 Click &apos;Simulate Courier Transit&apos; to watch the vehicle drive!</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
