const mongoose = require('mongoose');
const { Schema } = mongoose;

// Subdocumento para anexos/evidências
const evidenceFileSchema = new Schema({
  url:  { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  type: { type: String, required: true, trim: true }
}, { _id: false });

// Subdocumento para histórico de alterações (auditoria)
const historyLogSchema = new Schema({
  status: { 
    type: String, 
    enum: ['Pendente', 'Em Andamento', 'Concluído'],
    required: true 
  },
  updatedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  comment: { 
    type: String, 
    trim: true 
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
}, { _id: true });

const ActionPlanSchema = new Schema({
  riskId: {
    type: Schema.Types.ObjectId,
    ref: 'RiskReport',
    required: true
  },
  responsible: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  deadline: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Pendente', 'Em Andamento', 'Concluído'],
    default: 'Pendente',
    trim: true
  },
  evidenceFiles: {
    type: [evidenceFileSchema],
    default: []
  },
  historyLogs: {
    type: [historyLogSchema],
    default: []
  }
}, {
  timestamps: true
});

// Indexes para consultas eficientes
ActionPlanSchema.index({ riskId: 1 });
ActionPlanSchema.index({ responsible: 1 });
ActionPlanSchema.index({ status: 1 });
ActionPlanSchema.index({ deadline: 1 });

// Middleware para adicionar o primeiro log de histórico ao criar um novo plano de ação
ActionPlanSchema.pre('save', function(next) {
  if (this.isNew) {
    this.historyLogs.push({
      status: 'Pendente',
      updatedBy: this.responsible,
      comment: 'Plano de ação criado',
      timestamp: new Date()
    });
  }
  next();
});

module.exports = mongoose.model('ActionPlan', ActionPlanSchema);