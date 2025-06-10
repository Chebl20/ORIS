const mongoose = require('mongoose');

const pillSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  points: { type: Number, default: 0 }
});

module.exports = mongoose.model('Pill', pillSchema); 