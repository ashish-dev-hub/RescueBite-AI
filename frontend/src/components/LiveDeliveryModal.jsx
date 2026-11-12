/**
 * @file LiveDeliveryModal.jsx
 * @description Real-Time Live Delivery Tracking Modal with Leaflet, OSM, OSRM, and Socket.IO
 */

import React, { useEffect, useState, useRef } from 'react';
import { X, Navigation, Play, Square, MapPin, Truck, CheckCircle2, AlertCircle, Compass } from 'lucide-react';
import LiveTrackingMap from './LiveTrackingMap';
import locationService from '../services/locationService';
import socketService from '../services/socketService';
import { liveTracker } from '../services/liveTrackingService';

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

  // Extract donor & NGO coordinates from allocation data
  useEffect(() => {
    if (!isOpen || !allocation) return;

    const donorLoc = allocation.donationId?.location?.coordinates || allocation.donationId?.donorId?.location?.coordinates;
    const ngoLoc = allocation.ngoId?.location?.coordinates;

    const validDonor = donorLoc?.lat && donorLoc?.lng && (donorLoc.lat !== 0 || donorLoc.lng !== 0)
      ? donorLoc
      : { lat: 28.6280, lng: 77.2180 }; // Fallback central pin if blank

    const validNgo = ngoLoc?.lat && ngoLoc?.lng && (ngoLoc.lat !== 0 || ngoLoc.lng !== 0)
      ? ngoLoc
      : { lat: 28.6500, lng: 77.2300 }; // Fallback shelter pin if blank

    setDonorCoords(validDonor);
    setNgoCoords(validNgo);
    setCourierCoords(validDonor); // Courier starts at donor pickup initially
    setStatus(allocation.status || 'in_transit');

    // Fetch full OSRM road geometry
    setLoadingRoute(true);
    locationService
      .getDrivingRoute(validDonor, validNgo, true)
      .then((res) => {
        if (res?.coordinates && res.coordinates.length > 0) {
          setRouteCoordinates(res.coordinates);
        }
        setRouteMetrics({
          distanceKm: res.distanceKm,
          durationMins: res.durationMins,
        });
      })
      .catch((err) => {
        console.warn('[LiveDeliveryModal] OSRM route fetch error:', err.message);
      })
      .finally(() => setLoadingRoute(false));

    // Join Socket.IO delivery room
    const allocationId = allocation._id;
    socketService.joinDeliveryRoom(allocationId, {
      role: currentUser?.role || 'observer',
      userName: currentUser?.name || 'RescueBite Member',
    });

    // Listen for incoming courier coordinates
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
        socketService.sendDeliveryStatus({
          allocationId: allocation._id,
          status: 'delivered',
          note: 'Consignment successfully delivered to shelter.',
        });
        return;
      }

      const currentPoint = routeCoordinates[stepIndex];
      const nextPoint = stepIndex + 1 < totalSteps ? routeCoordinates[stepIndex + 1] : currentPoint;

      // Calculate heading angle between successive waypoints
      const dLat = nextPoint[0] - currentPoint[0];
      const dLng = nextPoint[1] - currentPoint[1];
      const headingDeg = Math.round((Math.atan2(dLng, dLat) * 180) / Math.PI + 360) % 360;

      const coords = {
        lat: currentPoint[0],
        lng: currentPoint[1],
        heading: headingDeg,
        speed: 28, // km/h
      };

      setCourierCoords(coords);
      setCourierHeading(headingDeg);
      setCourierSpeed(28);

      // Broadcast over Socket.IO to all observers
      socketService.sendCourierLocation({
        allocationId: allocation._id,
        coords,
        progressPercent: Math.round((stepIndex / totalSteps) * 100),
        status: stepIndex === totalSteps - 1 ? 'delivered' : 'in_transit',
      });

      // Recalculate remaining distance to destination
      if (ngoCoords) {
        const remainingKm = Math.max(
          0.1,
          Number((((totalSteps - stepIndex) / totalSteps) * (routeMetrics.distanceKm || 3)).toFixed(1))
        );
        const remainingMins = Math.max(1, Math.round((remainingKm / 28) * 60));
        setRouteMetrics({ distanceKm: remainingKm, durationMins: remainingMins });
      }

      stepIndex += 1;
    }, 1400);
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
        // Broadcast to room via Socket.IO
        socketService.sendCourierLocation({
          allocationId: allocation._id,
          coords: payload.coords,
          status: 'in_transit',
        });
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
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '860px',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#F8FAFC',
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
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0F172A' }}>
                Live Delivery Route & Transit Tracking
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B' }}>
                {foodName} • {portions} Meals • Real-time Socket.IO & Leaflet
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
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

        {/* Live Leaflet Map Component */}
        <div style={{ padding: '16px 20px 8px 20px' }}>
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
            height="380px"
          />
        </div>

        {/* Transit Details & Real-Time Controls */}
        <div style={{ padding: '12px 20px 20px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Origin & Destination Bar */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              background: '#F8FAFC',
              padding: '12px 14px',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669' }} />
              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                  Pickup From (Donor)
                </span>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#1E293B' }}>{donorName}</p>
                <small style={{ color: '#64748B', fontSize: '0.75rem' }}>
                  {allocation.donationId?.location?.address || 'Kitchen Hub'}
                </small>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EA580C' }} />
              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                  Deliver To (Shelter)
                </span>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#1E293B' }}>{ngoName}</p>
                <small style={{ color: '#64748B', fontSize: '0.75rem' }}>
                  {allocation.ngoId?.location?.address || 'Community Kitchen'}
                </small>
              </div>
            </div>
          </div>

          {/* Action & Simulation Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                  disabled={isSimulating}
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
                    cursor: isSimulating ? 'not-allowed' : 'pointer',
                    opacity: isSimulating ? 0.5 : 1,
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

            <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
              {isSimulating && (
                <span style={{ color: '#059669', fontWeight: 600 }}>
                  🟢 Simulating live courier movement along OSRM road waypoints...
                </span>
              )}
              {isBroadcastingGps && (
                <span style={{ color: '#0284C7', fontWeight: 600 }}>
                  🔵 Broadcasting actual hardware GPS via Socket.IO...
                </span>
              )}
              {!isSimulating && !isBroadcastingGps && (
                <span>📡 Connected to Socket.IO live delivery room</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

