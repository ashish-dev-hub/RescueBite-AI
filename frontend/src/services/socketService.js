/**
 * @file socketService.js
 * @description Frontend Socket.IO Client Service for Live Courier & Delivery Tracking
 */

import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.activeRoom = null;
    this.listeners = new Map();
  }

  /**
   * Determine the backend socket server URL based on the current environment.
   */
  getSocketUrl() {
    // 1. Explicit environment variable if defined
    if (import.meta.env?.VITE_SOCKET_URL) {
      return import.meta.env.VITE_SOCKET_URL;
    }
    if (import.meta.env?.VITE_API_URL) {
      try {
        const parsed = new URL(import.meta.env.VITE_API_URL);
        return parsed.origin;
      } catch {
        // Ignore fallback
      }
    }

    // 2. Local development fallback to port 5000
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:5000';
      }
      return window.location.origin;
    }

    return 'http://localhost:5000';
  }

  /**
   * Connect to Socket.IO server.
   */
  connect() {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    const socketUrl = this.getSocketUrl();

    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
      timeout: 10000,
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log(`[Socket.IO Client] Connected to ${socketUrl} with ID: ${this.socket.id}`);
      // Re-join active room if connection dropped and restored
      if (this.activeRoom) {
        this.socket.emit('join_delivery', this.activeRoom);
      }
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[Socket.IO Client] Connection warning:', err.message);
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO Client] Disconnected: ${reason}`);
    });

    return this.socket;
  }

  /**
   * Join an active delivery room for an allocation.
   * @param {string} allocationId 
   * @param {Object} [meta]
   */
  joinDeliveryRoom(allocationId, meta = {}) {
    if (!allocationId) return;
    this.connect();

    this.activeRoom = {
      allocationId,
      role: meta.role || 'observer',
      userName: meta.userName || 'Anonymous',
    };

    this.socket.emit('join_delivery', this.activeRoom);
  }

  /**
   * Leave a delivery room.
   * @param {string} allocationId 
   */
  leaveDeliveryRoom(allocationId) {
    if (!this.socket || !allocationId) return;

    this.socket.emit('leave_delivery', { allocationId });
    if (this.activeRoom?.allocationId === allocationId) {
      this.activeRoom = null;
    }
  }

  /**
   * Broadcast courier location update.
   * @param {Object} payload 
   * @param {string} payload.allocationId
   * @param {{ lat: number, lng: number, accuracy?: number, heading?: number, speed?: number }} payload.coords
   * @param {number} [payload.progressPercent]
   * @param {string} [payload.status]
   */
  sendCourierLocation(payload) {
    if (!this.socket) {
      this.connect();
    }
    this.socket.emit('courier_location_update', payload);
  }

  /**
   * Broadcast a delivery status update (e.g. 'picked_up', 'in_transit', 'delivered')
   */
  sendDeliveryStatus(payload) {
    if (!this.socket) {
      this.connect();
    }
    this.socket.emit('delivery_status_update', payload);
  }

  /**
   * Listen for incoming courier location updates.
   * @param {Function} callback 
   */
  onCourierLocationUpdate(callback) {
    this.connect();
    this.socket.on('courier_location_changed', callback);
  }

  /**
   * Stop listening for courier location updates.
   * @param {Function} callback 
   */
  offCourierLocationUpdate(callback) {
    if (this.socket) {
      this.socket.off('courier_location_changed', callback);
    }
  }

  /**
   * Listen for delivery status transitions.
   * @param {Function} callback 
   */
  onDeliveryStatusUpdate(callback) {
    this.connect();
    this.socket.on('delivery_status_changed', callback);
  }

  /**
   * Stop listening for delivery status transitions.
   * @param {Function} callback 
   */
  offDeliveryStatusUpdate(callback) {
    if (this.socket) {
      this.socket.off('delivery_status_changed', callback);
    }
  }

  /**
   * Disconnect socket client completely.
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.activeRoom = null;
    }
  }
}

export const socketService = new SocketService();
export default socketService;

