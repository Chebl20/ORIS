const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { adminAuth } = require('../middlewares/auth.middleware');

// Validation middleware
const userValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required'),
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email'),
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Invalid role')
];

// Routes
router.get('/users', adminAuth, adminController.getAllUsers);
router.get('/users/:id', adminAuth, adminController.getUserById);
router.post('/users', adminAuth, userValidation, adminController.createUser);
router.patch('/users/:id', adminAuth, userValidation, adminController.updateUser);
router.delete('/users/:id', adminAuth, adminController.deleteUser);
router.get('/stats', adminAuth, adminController.getStats);

module.exports = router; 