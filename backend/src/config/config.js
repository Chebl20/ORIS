require('dotenv').config();
const path = require('path');

module.exports = {
  // Server
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/oris',
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  
  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // File Upload
  UPLOAD_PATH: process.env.UPLOAD_PATH || path.join(process.cwd(), 'uploads'),
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
  ALLOWED_FILE_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg'
  ],
  
  // Frontend URL
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // Email (if needed)
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX || 100,
  
  // CORS configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  
  // Logging configuration
  LOG_LEVEL: process.env.LOG_LEVEL || 'info'
}; 