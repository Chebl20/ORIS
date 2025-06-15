const { validationResult } = require('express-validator');
const User = require('../models/user.model');

// Get user profile
const getProfile = async (req, res) => {
  try {
    res.json(req.user.getPublicProfile());
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
      error: error.message || "Internal server error"
    });
  }
};

// Update user profile (agora incluindo empresa, setor e cargo)
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updates = Object.keys(req.body);
    const allowedUpdates = ['name', 'healthData', 'privacySettings', 'company', 'department', 'position'];
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
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message || "Internal server error"
    });
  }
};

// Get user health data
const getHealthData = async (req, res) => {
  try {
    const { weight, height, ...restHealthData } = req.user.healthData || {};

    let imc = null;

    if (typeof weight === 'number' && typeof height === 'number' && height > 0) {
      imc = Number((weight / (height * height)).toFixed(2));
    }

    res.json({
      healthData: {
        ...restHealthData,
        weight,
        height,
        imc
      },
      score: req.user.score
    });
  } catch (error) {
    console.error('Error fetching health data:', error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch health data",
      error: error.message || "Internal server error"
    });
  }
};

// Update health data
const updateHealthData = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }

    const { weight, height, bloodPressure, lastCheckup } = req.body;
    const updatedFields = [];

    if (weight !== undefined) {
      req.user.healthData.weight = weight;
      updatedFields.push('weight');
    }
    if (height !== undefined) {
      req.user.healthData.height = height;
      updatedFields.push('height');
    }
    if (bloodPressure && typeof bloodPressure === 'string') {
      const [systolic, diastolic] = bloodPressure.split('/').map(Number);
      if (!isNaN(systolic) && !isNaN(diastolic)) {
        req.user.healthData.bloodPressure = { systolic, diastolic };
        updatedFields.push('bloodPressure');
      } else {
        return res.status(400).json({
          success: false,
          message: "Invalid bloodPressure format. Expected '120/80'"
        });
      }
    }
    if (lastCheckup !== undefined) {
      req.user.healthData.lastCheckup = lastCheckup;
      updatedFields.push('lastCheckup');
    }

    if (updatedFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid health data provided for update",
        availableFields: ["weight", "height", "bloodPressure", "lastCheckup"]
      });
    }

    await req.user.save();

    res.json({
      success: true,
      message: "Health data updated successfully",
      updatedFields,
      healthData: req.user.healthData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating health data:', error);
    res.status(500).json({
      success: false,
      message: "Failed to update health data",
      error: error.message || "Internal server error"
    });
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
    console.error('Error updating privacy settings:', error);
    res.status(500).json({
      success: false,
      message: "Failed to update privacy settings",
      error: error.message || "Internal server error"
    });
  }
};

// Get user dashboard (incluindo setor, empresa e cargo)
const getUserDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    const today = new Date();
    const birthDate = new Date(user.birthDate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    const dashboard = {
      id: user._id.toString(),
      nome: user.name,
      idade: age,
      dataNascimento: user.birthDate.toISOString().split('T')[0],
      pilulasOris: user.score || 0,
      peso: user.healthData?.weight || null,
      altura: user.healthData?.height || null,
      qualidadeSono: user.healthData?.sleepQuality || 'boa',
      humor: user.healthData?.mood || 'bom',
      teveSintomasGripais: user.healthData?.fluSymptoms || false,
      setor: user.department,
      empresa: user.company,
      cargo: user.position
    };

    res.json(dashboard);
  } catch (error) {
    console.error('Error fetching user dashboard:', error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user dashboard",
      error: error.message || "Internal server error"
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getHealthData,
  updateHealthData,
  updatePrivacySettings,
  getUserDashboard
};
