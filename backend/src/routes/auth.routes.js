const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { auth, refreshToken } = require('../middlewares/auth.middleware');

// Validation middleware
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Role must be either "user" or "admin"')
];

const loginValidation = [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

// Routes
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.post('/refresh', refreshToken, authController.refresh);
router.post('/logout', auth, authController.logout);

module.exports = router; 