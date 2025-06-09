const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const User = require('../models/user.model');

let io;

const initializeSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: config.FRONTEND_URL,
      methods: ['GET', 'POST']
    }
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, config.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user._id}`);

    // Join user's room for private messages
    socket.join(socket.user._id.toString());

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user._id}`);
    });

    // Handle exam status updates
    socket.on('examStatusUpdate', async (data) => {
      try {
        const { examId, status } = data;
        // Emit to specific user
        io.to(socket.user._id.toString()).emit('examStatusChanged', {
          examId,
          status,
          updatedAt: new Date()
        });
      } catch (error) {
        console.error('Error handling exam status update:', error);
      }
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

module.exports = {
  initializeSocket,
  getIO
}; 