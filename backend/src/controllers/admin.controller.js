const { validationResult } = require('express-validator');
const User = require('../models/user.model');
const Exam = require('../models/exam.model');

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('-password -refreshToken')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message || "Internal server error"
    });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -refreshToken');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
      error: error.message || "Internal server error"
    });
  }
};

// Create user
const createUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const user = new User({
      name,
      email,
      password,
      role: role || 'user'
    });

    await user.save();
    res.status(201).json(user.getPublicProfile());
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create user",
      error: error.message || "Internal server error"
    });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updates = Object.keys(req.body);
    const allowedUpdates = ['name', 'email', 'role', 'healthData'];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({ error: 'Invalid updates' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    updates.forEach(update => {
      user[update] = req.body[update];
    });

    await user.save();
    res.json(user.getPublicProfile());
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update user",
      error: error.message || "Internal server error"
    });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete all user's exams
    await Exam.deleteMany({ userId: user._id });
    
    // Delete user
    await user.remove();

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete user",
      error: error.message || "Internal server error"
    });
  }
};

// Get system statistics
const getStats = async (req, res) => {
  try {
    // 🔧 Datas de referência
    const today = new Date();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const soon = new Date();
    soon.setDate(today.getDate() + 15);

    // 📊 Estatísticas gerais
    const totalUsers = await User.countDocuments({ role: 'user' });
    const recentUsers = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
    const activeUsers = await User.countDocuments({ lastLogin: { $gte: thirtyDaysAgo } });

    const totalExams = await Exam.countDocuments();
    const pendingExams = await Exam.countDocuments({ status: 'pending' });
    const expiredExams = await Exam.countDocuments({ isExpired: true });
    const expiringSoon = await Exam.countDocuments({
      expiresAt: { $gte: today, $lte: soon }
    });

    // 🧪 Exames por tipo
    const examsByType = await Exam.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    // 📋 Exames por status
    const examStatusCounts = await Exam.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // 🏆 Top usuários por score
    const topUsers = await User.find({ role: 'user' })
      .sort({ score: -1 })
      .limit(5)
      .select('name score');

    // ✅ Resposta final
    res.json({
      totalUsers,
      recentUsers,
      activeUsers,
      totalExams,
      pendingExams,
      expiredExams,
      expiringSoon,
      examsByType,
      examStatusCounts,
      topUsers
    });
  } catch (error) {
    console.error('Erro no relatório admin:', error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch statistics",
      error: error.message || "Internal server error"
    });
  }
};



module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getStats
}; 