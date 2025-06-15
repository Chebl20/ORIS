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
    
    // Handle risk report notifications
    socket.on('riskReportCreated', async (data) => {
      try {
        const { riskId, title, priority } = data;
        
        // Emit to admins if it's a critical risk
        if (priority === 'Crítica') {
          // Find all admin users
          const User = require('../models/user.model');
          const admins = await User.find({ role: 'admin' }).select('_id');
          
          // Notify each admin
          admins.forEach(admin => {
            io.to(admin._id.toString()).emit('newCriticalRisk', {
              riskId,
              title,
              priority,
              createdAt: new Date()
            });
          });
        }
      } catch (error) {
        console.error('Error handling risk report notification:', error);
      }
    });
    
    // Handle risk status update notifications
    socket.on('riskStatusUpdated', async (data) => {
      try {
        const { riskId, title, status, priority } = data;
        
        // Notify the user who is assigned to the risk
        if (data.assignedTo) {
          io.to(data.assignedTo.toString()).emit('riskStatusChanged', {
            riskId,
            title,
            status,
            updatedAt: new Date()
          });
        }
        
        // Notify admins if risk was reclassified as critical
        if (priority === 'Crítica' && data.priorityChanged) {
          const User = require('../models/user.model');
          const admins = await User.find({ role: 'admin' }).select('_id');
          
          admins.forEach(admin => {
            io.to(admin._id.toString()).emit('riskReclassifiedAsCritical', {
              riskId,
              title,
              priority,
              updatedAt: new Date()
            });
          });
        }
      } catch (error) {
        console.error('Error handling risk status update notification:', error);
      }
    });
    
    // Handle action plan deadline notifications
    socket.on('actionPlanDeadlineApproaching', async (data) => {
      try {
        const { planId, riskId, riskTitle, deadline, responsible } = data;
        
        // Notify the responsible person
        if (responsible) {
          io.to(responsible.toString()).emit('actionPlanDeadlineWarning', {
            planId,
            riskId,
            riskTitle,
            deadline,
            daysRemaining: data.daysRemaining
          });
        }
      } catch (error) {
        console.error('Error handling action plan deadline notification:', error);
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