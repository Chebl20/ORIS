const { validationResult } = require('express-validator');
const User = require('../models/user.model');
const Pill = require('../models/pill.model');
const Checkin = require('../models/checkin.model');

// Get daily tasks
const getDailyTasks = async (req, res) => {
  try {
    const tasks = [
      { id: 1, title: 'Drink Water', description: 'Drink 8 glasses of water today', points: 10, completed: false },
      { id: 2, title: 'Exercise', description: '30 minutes of physical activity', points: 20, completed: false },
      { id: 3, title: 'Healthy Meal', description: 'Eat a balanced meal', points: 15, completed: false }
    ];
    res.json(tasks);
  } catch (error) {
    console.error('Erro ao buscar tarefas diárias:', error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch daily tasks",
      error: error.message || "Internal server error"
    });
  }
};

// Complete daily check-in
const completeCheckIn = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.warn('Validação falhou no check-in:', errors.array());
      return res.status(400).json({ error: 'Dados inválidos no check-in', details: errors.array() });
    }

    const { tasks } = req.body;
    if (!Array.isArray(tasks)) {
      return res.status(400).json({ error: 'O campo "tasks" deve ser um array' });
    }

    let totalPoints = 0;

    for (const task of tasks) {
      if (task.completed === true) {
        const pill = await Pill.findOne({ id: task.id });
        if (pill && typeof pill.points === 'number') {
          totalPoints += pill.points;
        }
      }
    }

    req.user.score = Number(req.user.score || 0) + totalPoints;
    await req.user.save();

    const checkinTasks = await Promise.all(tasks.map(async task => {
      const pill = await Pill.findOne({ id: task.id });
      return {
        id: task.id,
        completed: task.completed,
        points: pill ? pill.points : 0
      };
    }));

    await Checkin.create({
      userId: req.user._id,
      date: new Date(),
      tasks: checkinTasks,
      pointsEarned: totalPoints
    });

    res.json({
      message: 'Check-in realizado com sucesso',
      pointsEarned: totalPoints,
      totalScore: req.user.score
    });
  } catch (error) {
    console.error('Erro durante o check-in:', error);
    res.status(500).json({
      success: false,
      message: "Failed to complete check-in",
      error: error.message || "Internal server error"
    });
  }
};

// Get user's score
const getUserScore = async (req, res) => {
  try {
    const rank = await calculateRank(req.user._id);
    res.json({ score: req.user.score, rank });
  } catch (error) {
    console.error('Erro ao buscar pontuação do usuário:', error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user score",
      error: error.message || "Internal server error"
    });
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
    console.error('Erro ao buscar ranking:', error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch leaderboard",
      error: error.message || "Internal server error"
    });
  }
};

// Helper function to calculate user's rank
const calculateRank = async (userId) => {
  const user = await User.findById(userId);
  const usersWithHigherScore = await User.countDocuments({ score: { $gt: user.score } });
  return usersWithHigherScore + 1;
};

// Shuffle utilitário com seed
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

// Get daily pills
const getDailyPills = async (req, res) => {
  try {
    const allPills = await Pill.find();
    if (allPills.length < 3) {
      return res.status(400).json({ error: 'Pílulas insuficientes no banco de dados' });
    }
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const seed = `${req.user._id}-${dateStr}`;
    const shuffled = seededShuffle([...allPills], seed);
    const dailyPills = shuffled.slice(0, 3);
    res.json(dailyPills);
  } catch (error) {
    console.error('Erro ao buscar pílulas diárias:', error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch daily pills",
      error: error.message || "Internal server error"
    });
  }
};

// Get user check-in history
const getCheckinHistory = async (req, res) => {
  try {
    const history = await Checkin.find({ userId: req.user._id }).sort({ date: -1 });
    res.json(history);
  } catch (error) {
    console.error('Erro ao buscar histórico de check-ins:', error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch check-in history",
      error: error.message || "Internal server error"
    });
  }
};

module.exports = {
  getDailyTasks,
  completeCheckIn,
  getUserScore,
  getLeaderboard,
  getDailyPills,
  getCheckinHistory
};
