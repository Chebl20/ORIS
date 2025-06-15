const mongoose = require('mongoose');
const { Schema } = mongoose;

// Subdocumento para attachments
const attachmentSchema = new Schema({
  url:  { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  type: { type: String, required: true, trim: true }
}, { _id: false });

const reportSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false  // pode ser anônimo
  },
  type: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  impact: {
    type: String,
    required: true,
    trim: true
  },
  attachments: {
    type: [attachmentSchema],
    default: []
  },
  status: {
    type: String,
    enum: ['pendente', 'em_analise', 'em_andamento', 'resolvido', 'fechado'],
    default: 'pendente',
    trim: true
  }
}, {
  timestamps: true
});

// Indexes para consultas eficientes
reportSchema.index({ userId: 1, createdAt: -1 });
reportSchema.index({ status: 1, type: 1 });
reportSchema.index({ location: 1 });

module.exports = mongoose.model('Report', reportSchema);
