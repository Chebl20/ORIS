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
    enum: ['Aberto', 'Em Tratamento', 'Resolvido', 'Cancelado'],
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

const RiskReportSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Infraestrutura', 'Conduta', 'Ambiental', 'Outro'],
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  priority: {
    type: String,
    enum: ['Baixa', 'Média', 'Alta', 'Crítica'],
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['Aberto', 'Em Tratamento', 'Resolvido', 'Cancelado'],
    default: 'Aberto',
    trim: true
  },
  reporter: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User'
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
RiskReportSchema.index({ reporter: 1, createdAt: -1 });
RiskReportSchema.index({ status: 1, priority: 1 });
RiskReportSchema.index({ category: 1 });
RiskReportSchema.index({ location: 1 });
RiskReportSchema.index({ assignedTo: 1 });

// Middleware para adicionar o primeiro log de histórico ao criar um novo relatório de risco
RiskReportSchema.pre('save', function(next) {
  if (this.isNew) {
    this.historyLogs.push({
      status: 'Aberto',
      updatedBy: this.reporter,
      comment: 'Registro de risco criado',
      timestamp: new Date()
    });
  }
  next();
});

module.exports = mongoose.model('RiskReport', RiskReportSchema);