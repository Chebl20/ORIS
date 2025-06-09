const { validationResult } = require('express-validator');
const User = require('../models/user.model');

// Get daily tasks
const getDailyTasks = async (req, res) => {
  try {
    // TODO: Implement task generation logic
    const tasks = [
      {
        id: 1,
        title: 'Drink Water',
        description: 'Drink 8 glasses of water today',
        points: 10,
        completed: false
      },
      {
        id: 2,
        title: 'Exercise',
        description: '30 minutes of physical activity',
        points: 20,
        completed: false
      },
      {
        id: 3,
        title: 'Healthy Meal',
        description: 'Eat a balanced meal',
        points: 15,
        completed: false
      }
    ];

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching daily tasks' });
  }
};

// Complete daily check-in
const completeCheckIn = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { tasks } = req.body;
    let totalPoints = 0;

    // Calculate points from completed tasks
    tasks.forEach(task => {
      if (task.completed) {
        totalPoints += task.points;
      }
    });

    // Update user's score
    req.user.score += totalPoints;
    await req.user.save();

    res.json({
      message: 'Check-in completed successfully',
      pointsEarned: totalPoints,
      totalScore: req.user.score
    });
  } catch (error) {
    res.status(500).json({ error: 'Error completing check-in' });
  }
};

// Get user's score
const getUserScore = async (req, res) => {
  try {
    res.json({
      score: req.user.score,
      rank: await calculateRank(req.user._id)
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching score' });
  }
};

// Get leaderboard
const getLeaderboard = async (req, res) => {
  try {
    const users = await User.find({})
      .select('name score')
      .sort({ score: -1 })
      .limit(10);

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching leaderboard' });
  }
};

// Helper function to calculate user's rank
const calculateRank = async (userId) => {
  const user = await User.findById(userId);
  const usersWithHigherScore = await User.countDocuments({
    score: { $gt: user.score }
  });
  return usersWithHigherScore + 1;
};

module.exports = {
  getDailyTasks,
  completeCheckIn,
  getUserScore,
  getLeaderboard
}; 