const { validationResult } = require('express-validator');
const User = require('../models/user.model');

// Get user profile
const getProfile = async (req, res) => {
  try {
    res.json(req.user.getPublicProfile());
  } catch (error) {
    res.status(500).json({ error: 'Error fetching profile' });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updates = Object.keys(req.body);
    const allowedUpdates = ['name', 'healthData', 'privacySettings'];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({ error: 'Invalid updates' });
    }

    updates.forEach(update => {
      req.user[update] = req.body[update];
    });

    await req.user.save();
    res.json(req.user.getPublicProfile());
  } catch (error) {
    res.status(500).json({ error: 'Error updating profile' });
  }
};

// Get user health data
const getHealthData = async (req, res) => {
  try {
    res.json({
      healthData: req.user.healthData,
      score: req.user.score
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching health data' });
  }
};

// Update health data
const updateHealthData = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { weight, height, bloodPressure, lastCheckup } = req.body;

    if (weight) req.user.healthData.weight = weight;
    if (height) req.user.healthData.height = height;
    if (bloodPressure) req.user.healthData.bloodPressure = bloodPressure;
    if (lastCheckup) req.user.healthData.lastCheckup = lastCheckup;

    await req.user.save();
    res.json(req.user.healthData);
  } catch (error) {
    res.status(500).json({ error: 'Error updating health data' });
  }
};

// Update privacy settings
const updatePrivacySettings = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { shareHealthData, shareActivity } = req.body;

    if (typeof shareHealthData === 'boolean') {
      req.user.privacySettings.shareHealthData = shareHealthData;
    }
    if (typeof shareActivity === 'boolean') {
      req.user.privacySettings.shareActivity = shareActivity;
    }

    await req.user.save();
    res.json(req.user.privacySettings);
  } catch (error) {
    res.status(500).json({ error: 'Error updating privacy settings' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getHealthData,
  updateHealthData,
  updatePrivacySettings
}; 