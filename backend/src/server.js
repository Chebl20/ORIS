require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const config = require('./config/config');
const routes = require('./routes');
const { handleUploadError } = require('./middlewares/upload.middleware');

// Create Express app
const app = express();

// Ensure uploads directory exists
const ensureUploadDir = () => {
  const uploadDir = config.UPLOAD_PATH;
  
  if (!fs.existsSync(uploadDir)) {
    try {
      fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
      console.log(`Created uploads directory at: ${uploadDir}`);
    } catch (error) {
      console.error('Error creating uploads directory:', error);
      process.exit(1);
    }
  }
};

// Middleware
app.use(cors({
  origin: config.CORS_ORIGIN,
  credentials: true
}));

// Body parsing middleware - IMPORTANT: These must come before routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug middleware to log request body
app.use((req, res, next) => {
  console.log('Request Body:', req.body);
  next();
});

// Create uploads directory
ensureUploadDir();

// Serve static files from uploads directory
app.use('/uploads', express.static(config.UPLOAD_PATH));

// Routes
app.use('/api', routes);

// Error handling middleware
app.use(handleUploadError);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Connect to MongoDB
mongoose.connect(config.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    // Start server
    app.listen(config.PORT, () => {
      console.log(`Server is running on port ${config.PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

module.exports = app; 