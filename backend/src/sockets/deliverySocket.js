/**
 * @file deliverySocket.js
 * @description Real-time Socket.IO handler for courier tracking and live delivery updates.
 */

const { Server } = require('socket.io');

let io = null;

// In-memory cache of active courier positions per allocation
const activeCourierPositions = new Map();

/**
 * Initialize Socket.IO with an HTTP server instance.
 * @param {import('http').Server} server 
 * @param {Array<string>} [allowedOrigins] 
 */
function initDeliverySocket(server, allowedOrigins = []) {
  if (io) return io;

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        // Allow server-to-server, curl, mobile, or local requests with no origin
        if (!origin) return callback(null, true);

        const defaultOrigins = [
          'http://localhost:5173',
          'http://127.0.0.1:5173',
          'http://localhost:3000',
          'http://127.0.0.1:3000',
          'https://rescue-bite-ai.vercel.app',
          'https://rescuebite.vercel.app',
          ...allowedOrigins,
        ];

        const isAllowed =
          defaultOrigins.includes(origin) ||
          origin.startsWith('http://localhost:') ||
          origin.startsWith('http://127.0.0.1:') ||
          origin.includes('vercel.app') ||
          process.env.NODE_ENV !== 'production';

        if (isAllowed) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    /**
     * Client joins a delivery room to observe or broadcast tracking for an allocation.
     * Payload: { allocationId: string, role?: string, userName?: string }
     */
    socket.on('join_delivery', ({ allocationId, role, userName }) => {
      if (!allocationId) return;

      const roomName = `delivery:${allocationId}`;
      socket.join(roomName);
      console.log(`[Socket.IO] ${socket.id} (${userName || role || 'User'}) joined room: ${roomName}`);

      // Send the latest known courier position to the newly joined client immediately
      const cachedPosition = activeCourierPositions.get(allocationId);
      if (cachedPosition) {
        socket.emit('courier_location_changed', cachedPosition);
      }
    });

    /**
     * Client leaves a delivery room.
     */
    socket.on('leave_delivery', ({ allocationId }) => {
      if (!allocationId) return;
      const roomName = `delivery:${allocationId}`;
      socket.leave(roomName);
      console.log(`[Socket.IO] ${socket.id} left room: ${roomName}`);
    });

    /**
     * Courier or simulation broadcasts new coordinates.
     * Payload: {
     *   allocationId: string,
     *   coords: { lat: number, lng: number, accuracy?: number, heading?: number, speed?: number },
     *   progressPercent?: number,
     *   status?: string,
     *   timestamp?: number
     * }
     */
    socket.on('courier_location_update', (payload) => {
      const { allocationId, coords } = payload || {};
      if (!allocationId || !coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
        return;
      }

      const roomName = `delivery:${allocationId}`;
      const enrichedPayload = {
        allocationId,
        coords: {
          lat: Number(coords.lat.toFixed(6)),
          lng: Number(coords.lng.toFixed(6)),
          accuracy: coords.accuracy || 10,
          heading: coords.heading || 0,
          speed: coords.speed || 0,
        },
        progressPercent: payload.progressPercent || 0,
        status: payload.status || 'in_transit',
        updatedBy: socket.id,
        timestamp: payload.timestamp || Date.now(),
      };

      // Cache the last known position
      activeCourierPositions.set(allocationId, enrichedPayload);

      // Broadcast to everyone in the room (NGO, Donor, Coordinator) except sender (or to all if preferred)
      io.to(roomName).emit('courier_location_changed', enrichedPayload);
    });

    /**
     * Delivery Status Event (e.g., 'picked_up', 'arriving_soon', 'delivered')
     */
    socket.on('delivery_status_update', (payload) => {
      const { allocationId, status, note } = payload || {};
      if (!allocationId || !status) return;

      const roomName = `delivery:${allocationId}`;
      const statusPayload = {
        allocationId,
        status,
        note: note || '',
        timestamp: Date.now(),
      };

      io.to(roomName).emit('delivery_status_changed', statusPayload);

      if (status === 'delivered' || status === 'cancelled') {
        // Clean up cached location once delivery lifecycle terminates
        activeCourierPositions.delete(allocationId);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}

/**
 * Get the active Socket.IO server instance.
 */
function getIO() {
  return io;
}

module.exports = {
  initDeliverySocket,
  getIO,
};

