const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const config = require('../config/config');
const User = require('../models/user.model');

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user._id },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );

  const refreshToken = jwt.sign(
    { id: user._id },
    config.JWT_REFRESH_SECRET,
    { expiresIn: config.JWT_REFRESH_EXPIRES_IN }
  );

  return { accessToken, refreshToken };
};

const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Validate role if provided
    if (role && !['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be either "user" or "admin"' });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      role: role || 'user' // Default to 'user' if no role provided
    });

    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();

    res.status(201).json({
      user: user.getPublicProfile(),
      accessToken,
      refreshToken
    });
  } catch (error) {
    res.status(500).json({ error: 'Error creating user' });
  }
};

const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Update user
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    res.json({
      user: user.getPublicProfile(),
      accessToken,
      refreshToken
    });
  } catch (error) {
    res.status(500).json({ error: 'Error logging in' });
  }
};

const refresh = async (req, res) => {
  try {
    const { accessToken, refreshToken } = generateTokens(req.user);

    // Update user's refresh token
    req.user.refreshToken = refreshToken;
    await req.user.save();

    res.json({
      accessToken,
      refreshToken
    });
  } catch (error) {
    res.status(500).json({ error: 'Error refreshing token' });
  }
};

const logout = async (req, res) => {
  try {
    req.user.refreshToken = null;
    await req.user.save();
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error logging out' });
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout
}; 