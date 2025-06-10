const { validationResult } = require('express-validator');
const User = require('../models/user.model');
const Pill = require('../models/pill.model');

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
    if (!Array.isArray(tasks)) {
      return res.status(400).json({ error: 'Tasks must be an array' });
    }

    let totalPoints = 0;

    // Buscar pontos das tasks completadas no banco
    for (const task of tasks) {
      if (task.completed === true) {
        // Busca a pill pelo campo id (não _id)
        const pill = await Pill.findOne({ id: task.id });
        if (pill && typeof pill.points === 'number') {
          totalPoints += pill.points;
        }
      }
    }

    req.user.score = Number(req.user.score || 0) + totalPoints;
    await req.user.save();

    res.json({
      message: 'Check-in completed successfully',
      pointsEarned: totalPoints,
      totalScore: req.user.score
    });
  } catch (error) {
    console.error('Erro no check-in:', error);
    res.status(500).json({
      error: 'Error completing check-in',
      details: error.message
    });
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

// Função utilitária de shuffle determinístico
function seededShuffle(array, seed) {
  let m = array.length, t, i;
  let s = seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  while (m) {
    i = Math.floor(Math.abs(Math.sin(s++)) * m--);
    t = array[m];
    array[m] = array[i];
    array[i] = t;
  }
  return array;
}

// Buscar 3 pílulas diárias aleatórias e fixas por usuário e dia
const getDailyPills = async (req, res) => {
  try {
    const allPills = await Pill.find();
    if (allPills.length < 3) {
      return res.status(400).json({ error: 'Not enough pills in the database' });
    }
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const seed = `${req.user._id}-${dateStr}`;
    const shuffled = seededShuffle([...allPills], seed);
    const dailyPills = shuffled.slice(0, 3);
    res.json(dailyPills);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching daily pills' });
  }
};

module.exports = {
  getDailyTasks,
  completeCheckIn,
  getUserScore,
  getLeaderboard,
  getDailyPills
}; 