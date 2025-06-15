const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { auth, refreshToken } = require('../middlewares/auth.middleware');

// Validation middleware
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Nome é obrigatório'),
  body('email').isEmail().withMessage('Por favor, insira um e-mail válido'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('A senha deve ter pelo menos 6 caracteres'),
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('O papel deve ser "user" ou "admin"'),
  body('birthDate')
    .isISO8601()
    .withMessage('Data de nascimento inválida. Use o formato YYYY-MM-DD')
    .toDate(),
  body('phone')
    .notEmpty()
    .withMessage('Telefone é obrigatório'),
  body('gender')
    .isIn(['masculino', 'feminino', 'outro'])
    .withMessage('Gênero deve ser "masculino", "feminino" ou "outro"'),
  body('company')
    .optional()
    .isString()
    .withMessage('Empresa deve ser um texto'),
  body('department')
    .optional()
    .isString()
    .withMessage('Departamento deve ser um texto'),
  body('position')
    .optional()
    .isString()
    .withMessage('Cargo deve ser um texto')
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
router.post('/reset-password', authController.resetPassword);

module.exports = router; 