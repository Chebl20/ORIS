const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { auth, adminAuth } = require('../middlewares/auth.middleware');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Validation middleware
const reportValidation = [
  body('type')
    .isIn(['logistico', 'estrutural', 'sugestao', 'reclamacao'])
    .withMessage('Invalid report type'),
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 20 })
    .withMessage('Description must be at least 20 characters long'),
  body('location')
    .trim()
    .notEmpty()
    .withMessage('Location is required'),
  body('impact')
    .isIn(['baixo', 'medio', 'alto', 'critico'])
    .withMessage('Invalid impact level'),
  body('priority')
    .optional()
    .isIn(['baixa', 'media', 'alta', 'critica'])
    .withMessage('Invalid priority level'),
  body('affectedAreas')
    .optional()
    .isArray()
    .withMessage('Affected areas must be an array')
];

const commentValidation = [
  body('text')
    .trim()
    .notEmpty()
    .withMessage('Comment text is required')
    .isLength({ min: 5 })
    .withMessage('Comment must be at least 5 characters long')
];

const resolutionValidation = [
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Resolution description is required')
    .isLength({ min: 20 })
    .withMessage('Resolution description must be at least 20 characters long')
];

// Routes
router.post('/upload', auth, upload.single('foto'), reportValidation, reportController.createReport);
router.get('/reports', auth, reportController.getReports);
router.get('/stats', adminAuth, reportController.getReportStats);
router.get('/report/:id', auth, reportController.getReportById);
router.patch('/report/:id', auth, reportValidation, reportController.updateReport);
router.post('/report/:id/comments', auth, commentValidation, reportController.addComment);
router.post('/report/:id/resolve', adminAuth, resolutionValidation, reportController.resolveReport);

module.exports = router; 