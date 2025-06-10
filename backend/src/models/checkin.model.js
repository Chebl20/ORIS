const mongoose = require('mongoose');

const checkinSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  tasks: [
    {
      id: Number,
      completed: Boolean,
      points: Number
    }
  ],
  pointsEarned: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Checkin', checkinSchema); 