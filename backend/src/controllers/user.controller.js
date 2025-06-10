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
    console.error('Erro ao buscar dados de saúde:', error);
    res.status(500).json({ error: 'Error fetching health data' });
  }
};


// Update health data
const updateHealthData = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }

    const { weight, height, bloodPressure, lastCheckup } = req.body;
    const updates = {};
    const updatedFields = [];

    // Track which fields are being updated
    if (weight !== undefined) {
      req.user.healthData.weight = weight;
      updates.weight = weight;
      updatedFields.push('weight');
    }
    if (height !== undefined) {
      req.user.healthData.height = height;
      updates.height = height;
      updatedFields.push('height');
    }
    if (bloodPressure && typeof bloodPressure === 'string') {
      const [systolic, diastolic] = bloodPressure.split('/').map(Number);
      if (!isNaN(systolic) && !isNaN(diastolic)) {
        req.user.healthData.bloodPressure = { systolic, diastolic };
        updates.bloodPressure = { systolic, diastolic };
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
      updates.lastCheckup = lastCheckup;
      updatedFields.push('lastCheckup');
    }

    // Check if any fields were provided for update
    if (updatedFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid health data provided for update",
        availableFields: ["weight", "height", "bloodPressure", "lastCheckup"]
      });
    }

    // Save the updated user
    const updatedUser = await req.user.save();

    // Prepare response
    const response = {
      success: true,
      message: "Health data updated successfully",
      updatedFields,
      healthData: updatedUser.healthData,
      timestamp: new Date().toISOString()
    };

    res.json(response);

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
    res.status(500).json({ error: 'Error updating privacy settings' });
  }
};

const getUserDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const dashboard = {
      name: user.name,
      userCode: user._id.toString().slice(-10),
      orisPills: user.score || 0,
      pillOfTheDay: {
        available: true, // Lógica real pode ser implementada depois
        label: 'Disponível'
      },
      health: {
        sleep: {
          value: user.healthData?.sleep || 8,
          unit: 'h',
          lastUpdate: user.healthData?.lastCheckup || null
        },
        bpm: {
          value: user.healthData?.bpm || 95,
          lastUpdate: user.healthData?.lastCheckup || null
        },
        mood: {
          value: user.healthData?.mood || 'Contente',
          lastUpdate: user.healthData?.lastCheckup || null
        },
        bmi: {
          value: user.healthData?.bmi || 121,
          lastUpdate: user.healthData?.lastCheckup || null
        }
      }
    };
    res.json(dashboard);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar dashboard do usuário' });
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