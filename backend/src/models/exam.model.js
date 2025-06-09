const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['blood', 'urine', 'xray', 'mri', 'ct', 'other']
  },
  file: {
    url: {
      type: String,
      required: true
    },
    originalName: String,
    mimeType: String,
    size: Number
  },
  description: {
    type: String,
    trim: true
  },
  performedAt: {
    type: Date,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  results: {
    type: String,
    trim: true
  },
  doctorNotes: {
    type: String,
    trim: true
  },
  isExpired: {
    type: Boolean,
    default: false
  },
  notificationSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient querying
examSchema.index({ userId: 1, performedAt: -1 });
examSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Method to check if exam is expired
examSchema.methods.checkExpiration = function() {
  const now = new Date();
  this.isExpired = now > this.expiresAt;
  return this.isExpired;
};

// Static method to find expired exams
examSchema.statics.findExpiredExams = function() {
  return this.find({
    expiresAt: { $lt: new Date() },
    isExpired: false
  });
};

const Exam = mongoose.model('Exam', examSchema);

module.exports = Exam; 