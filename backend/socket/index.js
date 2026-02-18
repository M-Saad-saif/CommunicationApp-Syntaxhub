const { Server } = require('socket.io');
const { verifySocketToken } = require('../middleware/auth');

// Track active rooms: roomId -> Map<socketId, { userId, username, peerId }>
const activeRooms = new Map();

const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: false,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authenticate every socket connection
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));

    const decoded = verifySocketToken(token);
    if (!decoded) return next(new Error('Invalid or expired token'));

    socket.userId = decoded.id;
    next();
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (user: ${socket.userId})`);

    // ─── ROOM MANAGEMENT ───────────────────────────────────────────────────────

    socket.on('room:join', ({ roomId, username }) => {
      socket.join(roomId);

      if (!activeRooms.has(roomId)) {
        activeRooms.set(roomId, new Map());
      }

      const roomPeers = activeRooms.get(roomId);
      roomPeers.set(socket.id, { userId: socket.userId, username, socketId: socket.id });

      // Notify the joining peer of all existing peers
      const existingPeers = [...roomPeers.entries()]
        .filter(([id]) => id !== socket.id)
        .map(([, peer]) => peer);

      socket.emit('room:existing-peers', { peers: existingPeers });

      // Notify existing peers that someone new joined
      socket.to(roomId).emit('room:peer-joined', {
        socketId: socket.id,
        userId: socket.userId,
        username,
      });

      console.log(`User ${username} joined room ${roomId}. Peers: ${roomPeers.size}`);
    });

    socket.on('room:leave', ({ roomId }) => {
      handlePeerLeave(socket, roomId, io);
    });

    // ─── WEBRTC SIGNALING ──────────────────────────────────────────────────────

    // Forward WebRTC offer to a specific peer
    socket.on('webrtc:offer', ({ targetSocketId, offer, fromSocketId, username }) => {
      io.to(targetSocketId).emit('webrtc:offer', {
        offer,
        fromSocketId: socket.id,
        username,
      });
    });

    // Forward WebRTC answer to a specific peer
    socket.on('webrtc:answer', ({ targetSocketId, answer }) => {
      io.to(targetSocketId).emit('webrtc:answer', {
        answer,
        fromSocketId: socket.id,
      });
    });

    // Forward ICE candidates to a specific peer
    socket.on('webrtc:ice-candidate', ({ targetSocketId, candidate }) => {
      io.to(targetSocketId).emit('webrtc:ice-candidate', {
        candidate,
        fromSocketId: socket.id,
      });
    });

    // Notify peers that screen sharing started/stopped
    socket.on('webrtc:screen-share', ({ roomId, isSharing }) => {
      socket.to(roomId).emit('webrtc:screen-share', {
        fromSocketId: socket.id,
        isSharing,
      });
    });

    // ─── WHITEBOARD ────────────────────────────────────────────────────────────

    // Broadcast a draw event to the entire room
    socket.on('whiteboard:draw', ({ roomId, event }) => {
      socket.to(roomId).emit('whiteboard:draw', { event });
    });

    // Broadcast whiteboard clear to entire room
    socket.on('whiteboard:clear', ({ roomId }) => {
      socket.to(roomId).emit('whiteboard:clear');
    });

    // Sync full whiteboard state to a newly joined user
    socket.on('whiteboard:request-state', ({ roomId }) => {
      socket.to(roomId).emit('whiteboard:send-state-request', {
        requestingSocketId: socket.id,
      });
    });

    socket.on('whiteboard:send-state', ({ targetSocketId, state }) => {
      io.to(targetSocketId).emit('whiteboard:state', { state });
    });

    // ─── FILE SHARING ──────────────────────────────────────────────────────────

    socket.on('file:shared', ({ roomId, file, username }) => {
      socket.to(roomId).emit('file:shared', { file, username });
    });

    // ─── CHAT ──────────────────────────────────────────────────────────────────

    socket.on('chat:message', ({ roomId, message, username }) => {
      const payload = {
        id: `${socket.id}-${Date.now()}`,
        message,
        username,
        userId: socket.userId,
        timestamp: new Date().toISOString(),
      };
      io.to(roomId).emit('chat:message', payload);
    });

    // ─── MEDIA STATE ───────────────────────────────────────────────────────────

    socket.on('media:toggle', ({ roomId, type, enabled }) => {
      socket.to(roomId).emit('media:toggle', {
        fromSocketId: socket.id,
        type,
        enabled,
      });
    });

    // ─── DISCONNECT ────────────────────────────────────────────────────────────

    socket.on('disconnecting', () => {
      for (const roomId of socket.rooms) {
        if (roomId !== socket.id) {
          handlePeerLeave(socket, roomId, io);
        }
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });

    socket.on('error', (err) => {
      console.error(`Socket error (${socket.id}):`, err.message);
    });
  });

  return io;
};

function handlePeerLeave(socket, roomId, io) {
  const roomPeers = activeRooms.get(roomId);
  if (roomPeers) {
    roomPeers.delete(socket.id);
    if (roomPeers.size === 0) {
      activeRooms.delete(roomId);
    }
  }

  socket.to(roomId).emit('room:peer-left', { socketId: socket.id });
  socket.leave(roomId);
  console.log(`Socket ${socket.id} left room ${roomId}`);
}

module.exports = { initSocket };
