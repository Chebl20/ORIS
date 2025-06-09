const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const examController = require('../controllers/exam.controller');
const { auth, adminAuth } = require('../middlewares/auth.middleware');

// Validation middleware
const examValidation = [
  body('type')
    .isIn(['blood', 'urine', 'xray', 'mri', 'ct', 'other'])
    .withMessage('Invalid exam type'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('performedAt')
    .notEmpty()
    .withMessage('Performed date is required')
    .custom((value) => {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid performed date format');
      }
      if (date > new Date()) {
        throw new Error('Performed date cannot be in the future');
      }
      return true;
    }),
  body('expiresAt')
    .notEmpty()
    .withMessage('Expiration date is required')
    .custom((value) => {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid expiration date format');
      }
      return true;
    })
    .custom((value, { req }) => {
      const performedDate = new Date(req.body.performedAt);
      const expirationDate = new Date(value);
      
      if (expirationDate <= performedDate) {
        throw new Error('Expiration date must be after performed date');
      }
      
      // Check if expiration date is not too far in the future (e.g., 5 years)
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 5);
      
      if (expirationDate > maxDate) {
        throw new Error('Expiration date cannot be more than 5 years in the future');
      }
      
      return true;
    })
];

const statusValidation = [
  body('status')
    .isIn(['pending', 'approved', 'rejected'])
    .withMessage('Invalid status'),
  body('results')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Results must be less than 1000 characters'),
  body('doctorNotes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Doctor notes must be less than 1000 characters')
];

// Routes
router.post('/upload', auth, examController.uploadExam);
router.get('/user', auth, examController.getUserExams);
router.get('/:id', auth, examController.getExam);
router.delete('/:id', auth, examController.deleteExam);
router.patch('/:id/status', adminAuth, statusValidation, examController.updateExamStatus);

module.exports = router; 