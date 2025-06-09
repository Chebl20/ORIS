const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  healthData: {
    weight: Number,
    height: Number,
    bloodPressure: {
      systolic: Number,
      diastolic: Number
    },
    lastCheckup: Date
  },
  score: {
    type: Number,
    default: 0
  },
  privacySettings: {
    shareHealthData: {
      type: Boolean,
      default: false
    },
    shareActivity: {
      type: Boolean,
      default: false
    }
  },
  refreshToken: String,
  lastLogin: Date
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to get public profile
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.refreshToken;
  return userObject;
};

const User = mongoose.model('User', userSchema);

module.exports = User; 