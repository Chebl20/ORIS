const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { auth } = require('../middlewares/auth.middleware');

// Validation middleware
const healthDataValidation = [
  body('weight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Weight must be a positive number'),
  body('height')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Height must be a positive number'),
  body('bloodPressure.systolic')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Systolic pressure must be a positive number'),
  body('bloodPressure.diastolic')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Diastolic pressure must be a positive number'),
  body('lastCheckup')
    .optional()
    .isISO8601()
    .withMessage('Invalid checkup date')
];

const privacySettingsValidation = [
  body('shareHealthData')
    .optional()
    .isBoolean()
    .withMessage('shareHealthData must be a boolean'),
  body('shareActivity')
    .optional()
    .isBoolean()
    .withMessage('shareActivity must be a boolean')
];

// Routes
router.get('/profile', auth, userController.getProfile);
router.patch('/profile', auth, userController.updateProfile);
router.get('/health', auth, userController.getHealthData);
router.patch('/health', auth, healthDataValidation, userController.updateHealthData);
router.patch('/privacy', auth, privacySettingsValidation, userController.updatePrivacySettings);

module.exports = router; 