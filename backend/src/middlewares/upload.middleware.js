const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');

// Ensure uploads directory exists with proper permissions
const ensureUploadDir = () => {
  const uploadDir = config.UPLOAD_PATH;
  
  if (!fs.existsSync(uploadDir)) {
    try {
      fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
      console.log(`Created uploads directory at: ${uploadDir}`);
    } catch (error) {
      console.error('Error creating uploads directory:', error);
      throw new Error('Failed to create uploads directory');
    }
  }

  // Ensure directory is writable
  try {
    fs.accessSync(uploadDir, fs.constants.W_OK);
  } catch (error) {
    console.error('Uploads directory is not writable:', error);
    throw new Error('Uploads directory is not writable');
  }
};

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      ensureUploadDir();
      cb(null, config.UPLOAD_PATH);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    try {
      // Create a unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      const filename = file.fieldname + '-' + uniqueSuffix + ext;
      
      // Ensure the full path is valid
      const fullPath = path.join(config.UPLOAD_PATH, filename);
      
      cb(null, filename);
    } catch (error) {
      cb(error);
    }
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = config.ALLOWED_FILE_TYPES;

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.MAX_FILE_SIZE // 5MB
  },
  fileFilter: fileFilter
});

// Error handling middleware
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: `File too large. Maximum size is ${config.MAX_FILE_SIZE / (1024 * 1024)}MB.`
      });
    }
    return res.status(400).json({
      error: err.message
    });
  } else if (err) {
    return res.status(400).json({
      error: err.message
    });
  }
  next();
};

module.exports = {
  upload,
  handleUploadError
}; 