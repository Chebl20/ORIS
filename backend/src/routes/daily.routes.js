const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const dailyController = require('../controllers/daily.controller');
const { auth } = require('../middlewares/auth.middleware');

// Validation middleware
const checkInValidation = [
  body('tasks')
    .isArray()
    .withMessage('Tasks must be an array'),
  body('tasks.*.id')
    .isInt()
    .withMessage('Invalid task ID'),
  body('tasks.*.completed')
    .isBoolean()
    .withMessage('Task completion status must be a boolean')
];

// Routes
router.get('/tasks', auth, dailyController.getDailyPills);
router.post('/checkin', auth, checkInValidation, dailyController.completeCheckIn);
router.get('/score', auth, dailyController.getUserScore);
router.get('/leaderboard', auth, dailyController.getLeaderboard);
router.get('/checkin/history', auth, dailyController.getCheckinHistory);
// router.get('/pills/daily', auth, dailyController.getDailyPills);

module.exports = router; 