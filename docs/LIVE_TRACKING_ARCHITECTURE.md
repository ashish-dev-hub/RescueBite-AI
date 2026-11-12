# RescueBite AI: Real-Time Live Delivery Tracking Architecture

This document details the end-to-end architecture of the **Live Courier & Delivery Tracking System** built using the 5 core open-source technologies: **OpenStreetMap (OSM)**, **Leaflet.js**, **OSRM (Open Source Routing Machine)**, **Nominatim**, and **Socket.IO**.

---

## 1. System Architecture Overview

```
                                      ┌────────────────────────────────────────┐
                                      │        OpenStreetMap Tile CDN          │
                                      │ (Cartographic Street & Satellite Maps) │
                                      └───────────────────▲────────────────────┘
                                                          │ Tile Requests
┌─────────────────────────┐          ┌────────────────────┴───────────────────┐          ┌─────────────────────────┐
│     Courier / Driver    │          │               React 19                 │          │      NGO / Shelter      │
│     Mobile Browser      │          │       LiveTrackingMap (Leaflet)        │          │        Dashboard        │
└────────────┬────────────┘          └────────────────────▲───────────────────┘          └────────────▲────────────┘
             │                                            │                                           │
             │ High-Acc GPS                               │ Real-Time Marker &                        │ Live Delivery
             │ (Accuracy <= 30m)                          │ Polyline Updates                          │ Room Stream
             │                                            │                                           │
             ▼                                            ▼                                           │
┌─────────────────────────┐          ┌────────────────────────────────────────┐                       │
│    liveTracker Service  │─────────▶│           Socket.IO Gateway            │───────────────────────┘
│  (Haversine & Debounce) │          │ (Node.js Server: deliverySocket.js)    │
└────────────┬────────────┘          └────────────────────▲───────────────────┘
             │                                            │
             ├───────────────────────┐                    │
             ▼                       ▼                    │
┌─────────────────────────┐ ┌─────────────────┐           │
│      OSRM Driving       │ │    Nominatim    │           │
│    Route & Geometry     │ │ Reverse Geocode │           │
│ (Road Polyline GeoJSON) │ │ (Rate-Limited)  │           │
└─────────────────────────┘ └─────────────────┘           │
                                                          │ Status Change Sync
                                             ┌────────────┴────────────┐
                                             │  allocationController   │
                                             │ (REST State Machine)    │
                                             └─────────────────────────┘
```

---

## 2. Technology Stack & Role Matrix

| Technology | License / Source | Architectural Role in RescueBite AI |
| :--- | :--- | :--- |
| **OpenStreetMap (OSM)** | Open Data (ODbL) | High-resolution global cartographic map tiles rendered inside Leaflet without API keys or usage fees. |
| **Leaflet.js** | Open Source (BSD) | Frontend interactive map canvas: renders custom animated SVG courier markers, donor/shelter pins, and driving polylines. |
| **OSRM** | Open Source (BSD) | Live road routing engine: returns exact road driving distance (km), travel duration (mins), and GeoJSON route coordinates. |
| **Nominatim** | Open Source (ODbL) | Address geocoder: converts typed addresses to lat/long and reverse geocodes coordinates to street names with rate-limiting. |
| **Socket.IO** | Open Source (MIT) | Bidirectional WebSocket transport: streams real-time courier coordinates and status changes with room-level isolation. |

---

## 3. Real-Time Socket.IO Protocol & Rooms

### Room Isolation Pattern:
Clients join a specific room for their consignment:
`delivery:${allocationId}`

### Event Dictionary:

1. **`join_delivery`** (Client → Server)
   - Payload: `{ allocationId: string, role: string, userName: string }`
   - Behavior: Adds socket connection to the allocation room and immediately returns the latest cached courier location.

2. **`courier_location_update`** (Courier/Sim → Server)
   - Payload: `{ allocationId: string, coords: { lat, lng, heading, speed, accuracy }, progressPercent, status }`
   - Behavior: Enriches and caches last known position, then broadcasts to the room.

3. **`courier_location_changed`** (Server → All Room Observers)
   - Payload: Enriched coordinate payload with timestamp.

4. **`delivery_status_update`** (REST Controller / Client → Server)
   - Payload: `{ allocationId: string, status: 'picked_up' | 'in_transit' | 'delivered', note: string }`
   - Behavior: Broadcasts `delivery_status_changed` to update badges and UI modals in real time.

---

## 4. Anti-Jitter & Rate-Limiting Rules

1. **GPS Noise Filter**:
   - Discards any reading with `accuracy > 30 meters`.
2. **Haversine Distance Threshold**:
   - Suppresses micro-movements $< 15$ meters to prevent map pin drift when stationary.
3. **Nominatim Compliance**:
   - Throttled with a 3.5-second debounce window and strict 1 req/sec spacing with a custom `User-Agent`.
4. **OSRM Coordinate Order**:
   - Formatted strictly as `/{lon},{lat};{destLon},{destLat}` as per GeoJSON specification.

---

## 5. Testing & Verification Modes

Inside [`LiveDeliveryModal.jsx`](file:///c:/Users/ashis/OneDrive/Desktop/RescueBite%20AI/frontend/src/components/LiveDeliveryModal.jsx):

- **Simulate Courier Transit**:
  Iterates through the genuine OSRM road waypoints, computing realistic heading angles and broadcasting coordinates over Socket.IO every 1.4 seconds.
- **Broadcast Live Device GPS**:
  Uses the browser's `navigator.geolocation.watchPosition` to transmit real phone/laptop movements over Socket.IO to any observing Coordinator or NGO screen.
