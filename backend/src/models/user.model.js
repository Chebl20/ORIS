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
  birthDate: {
    type: Date,
    required: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  company: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  position: {
    type: String,
    required: true,
    trim: true
  },
  gender: {
    type: String,
    enum: ['masculino', 'feminino', 'outro'],
    required: true
  },
  healthData: {
    weight: Number,
    height: Number,
    bloodPressure: {
      systolic: Number,
      diastolic: Number
    },
    lastCheckup: Date,
    sleepQuality: {
      type: String,
      enum: ['excelente', 'boa', 'regular', 'precária'],
      default: 'boa'
    },
    mood: {
      type: String,
      enum: ['excelente', 'bom', 'instável', 'ruim'],
      default: 'bom'
    },
    fluSymptoms: {
      type: Boolean,
      default: false
    }
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
  const user = this.toObject();
  
  // Calcular idade a partir da data de nascimento
  const calculateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  // Calcular IMC
  const weight = user.healthData?.weight;
  const height = user.healthData?.height;
  let imc = null;
  
  if (weight && height && height > 0) {
    imc = Number((weight / (height * height)).toFixed(2));
  }

  // Construir o objeto de perfil público
  const publicProfile = {
    id: user._id,
    nome: user.name,
    idade: user.birthDate ? calculateAge(user.birthDate) : null,
    genero: user.gender,
    dataNascimento: user.birthDate ? new Date(user.birthDate).toISOString().split('T')[0] : null,
    pilulasOris: user.score || 0,
    peso: user.healthData?.weight || null,
    altura: user.healthData?.height || null,
    qualidadeSono: user.healthData?.sleepQuality || 'boa',
    humor: user.healthData?.mood || 'bom',
    teveSintomasGripais: user.healthData?.fluSymptoms || false,
    setor: user.department || null,
    empresa: user.company || null,
    cargo: user.position || null
  };

  // Remover campos sensíveis
  delete user.password;
  delete user.refreshToken;
  delete user.__v;
  delete user.createdAt;
  delete user.updatedAt;
  delete user.privacySettings;
  
  return publicProfile;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
