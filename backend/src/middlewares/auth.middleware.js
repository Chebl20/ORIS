const jwt = require('jsonwebtoken');
const config = require('../config/config');
const User = require('../models/user.model');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error();
    }

    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = await User.findOne({ _id: decoded.id });

    if (!user) {
      throw new Error();
    }

    req.token = token;
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Please authenticate.' });
  }
};

const adminAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admin only.' });
      }
      next();
    });
  } catch (error) {
    res.status(401).json({ error: 'Please authenticate.' });
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }

    const decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET);
    const user = await User.findOne({ _id: decoded.id, refreshToken });

    if (!user) {
      throw new Error('Invalid refresh token');
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

module.exports = {
  auth,
  adminAuth,
  refreshToken
}; 