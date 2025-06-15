const { validationResult } = require('express-validator');
const RiskReport = require('../models/risk-report.model');
const ActionPlan = require('../models/action-plan.model');
const User = require('../models/user.model');
const supabase = require('../lib/supabase');
const socketIO = require('../socket');
const path = require('path');

// Função auxiliar para upload de arquivos para o Supabase
async function uploadToSupabase(file) {
  const bucket = process.env.SUPABASE_BUCKET || 'oris';
  const ext = path.extname(file.originalname);
  const fileName = `risks/${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;

  const fileBuffer = file.buffer;

  const { data, error } = await supabase.storage.from(bucket).upload(fileName, fileBuffer, {
    contentType: file.mimetype,
    upsert: false
  });
  
  if (error) throw error;

  const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(fileName);

  return {
    url: publicUrlData.publicUrl,
    name: file.originalname,
    type: file.mimetype
  };
}

// Criar um novo registro de risco
const createRiskReport = async (req, res) => {
  try {
    // Verificar autenticação do usuário
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Usuário não autenticado"
      });
    }

    // Validar dados de entrada
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Erro de validação",
        errors: errors.array()
      });
    }

    // Processar uploads de arquivos
    let evidenceFiles = [];
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(file => uploadToSupabase(file));
      evidenceFiles = await Promise.all(uploadPromises);
    }

    // Criar o registro de risco
    const riskReport = new RiskReport({
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      location: req.body.location,
      priority: req.body.priority,
      reporter: req.user._id,
      evidenceFiles
    });

    // Atribuir responsável se fornecido
    if (req.body.assignedTo) {
      riskReport.assignedTo = req.body.assignedTo;
    }

    await riskReport.save();

    // Notificar administradores via Socket.IO se for um risco crítico
    if (riskReport.priority === 'Crítica') {
      try {
        const io = socketIO.getIO();
        const admins = await User.find({ role: 'admin' }).select('_id');
        
        admins.forEach(admin => {
          io.to(admin._id.toString()).emit('newCriticalRisk', {
            riskId: riskReport._id,
            title: riskReport.title,
            priority: riskReport.priority,
            createdAt: riskReport.createdAt
          });
        });
      } catch (socketError) {
        console.error('Erro ao enviar notificação via Socket.IO:', socketError);
      }
    }

    return res.status(201).json({
      success: true,
      message: "Registro de risco criado com sucesso",
      data: riskReport
    });
  } catch (error) {
    console.error('Erro ao criar registro de risco:', error);
    return res.status(500).json({
      success: false,
      message: "Erro ao criar registro de risco",
      error: error.message
    });
  }
};

// Obter todos os registros de risco com filtros
const getAllRiskReports = async (req, res) => {
  try {
    const { 
      status, 
      priority, 
      category, 
      location, 
      startDate, 
      endDate,
      reporter,
      assignedTo,
      page = 1, 
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Construir filtro
    const filter = {};
    
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (location) filter.location = location;
    if (reporter) filter.reporter = reporter;
    if (assignedTo) filter.assignedTo = assignedTo;
    
    // Filtro de data
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Configurar ordenação
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calcular paginação
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Executar consulta com população de dados relacionados
    const riskReports = await RiskReport.find(filter)
      .populate('reporter', 'name email')
      .populate('assignedTo', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    // Contar total de registros para paginação
    const total = await RiskReport.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: riskReports,
      pagination: {
        total,
        page: parseInt(page),
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar registros de risco:', error);
    return res.status(500).json({
      success: false,
      message: "Erro ao buscar registros de risco",
      error: error.message
    });
  }
};

// Obter um registro de risco específico por ID
const getRiskReportById = async (req, res) => {
  try {
    const riskId = req.params.id;

    const riskReport = await RiskReport.findById(riskId)
      .populate('reporter', 'name email department position')
      .populate('assignedTo', 'name email department position')
      .populate({
        path: 'historyLogs.updatedBy',
        select: 'name email'
      });

    if (!riskReport) {
      return res.status(404).json({
        success: false,
        message: "Registro de risco não encontrado"
      });
    }

    // Buscar planos de ação associados a este risco
    const actionPlans = await ActionPlan.find({ riskId: riskId })
      .populate('responsible', 'name email department position')
      .populate({
        path: 'historyLogs.updatedBy',
        select: 'name email'
      });

    return res.status(200).json({
      success: true,
      data: {
        riskReport,
        actionPlans
      }
    });
  } catch (error) {
    console.error('Erro ao buscar registro de risco:', error);
    return res.status(500).json({
      success: false,
      message: "Erro ao buscar registro de risco",
      error: error.message
    });
  }
};

// Atualizar um registro de risco
const updateRiskReport = async (req, res) => {
  try {
    const riskId = req.params.id;
    const userId = req.user._id;

    // Validar dados de entrada
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Erro de validação",
        errors: errors.array()
      });
    }

    // Verificar se o registro existe
    const riskReport = await RiskReport.findById(riskId);
    if (!riskReport) {
      return res.status(404).json({
        success: false,
        message: "Registro de risco não encontrado"
      });
    }

    // Processar uploads de novos arquivos
    let newEvidenceFiles = [];
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(file => uploadToSupabase(file));
      newEvidenceFiles = await Promise.all(uploadPromises);
    }

    // Preparar dados para atualização
    const updateData = {};
    
    // Campos básicos que podem ser atualizados
    if (req.body.title) updateData.title = req.body.title;
    if (req.body.description) updateData.description = req.body.description;
    if (req.body.category) updateData.category = req.body.category;
    if (req.body.location) updateData.location = req.body.location;
    if (req.body.priority) updateData.priority = req.body.priority;
    if (req.body.assignedTo) updateData.assignedTo = req.body.assignedTo;

    // Verificar se o status está sendo alterado
    const statusChanged = req.body.status && req.body.status !== riskReport.status;
    if (statusChanged) {
      updateData.status = req.body.status;
      
      // Adicionar entrada no histórico de alterações
      const historyLog = {
        status: req.body.status,
        updatedBy: userId,
        comment: req.body.comment || `Status alterado para ${req.body.status}`,
        timestamp: new Date()
      };
      
      updateData.$push = { historyLogs: historyLog };
    }

    // Adicionar novas evidências, se houver
    if (newEvidenceFiles.length > 0) {
      if (!updateData.$push) updateData.$push = {};
      updateData.$push.evidenceFiles = { $each: newEvidenceFiles };
    }

    // Atualizar o registro
    const updatedRiskReport = await RiskReport.findByIdAndUpdate(
      riskId,
      updateData,
      { new: true, runValidators: true }
    ).populate('reporter', 'name email')
      .populate('assignedTo', 'name email')
      .populate({
        path: 'historyLogs.updatedBy',
        select: 'name email'
      });

    // Notificar via Socket.IO se o risco for reclassificado como crítico
    if (req.body.priority === 'Crítica' && riskReport.priority !== 'Crítica') {
      try {
        const io = socketIO.getIO();
        const admins = await User.find({ role: 'admin' }).select('_id');
        
        admins.forEach(admin => {
          io.to(admin._id.toString()).emit('riskReclassifiedAsCritical', {
            riskId: updatedRiskReport._id,
            title: updatedRiskReport.title,
            priority: updatedRiskReport.priority,
            updatedAt: updatedRiskReport.updatedAt
          });
        });
      } catch (socketError) {
        console.error('Erro ao enviar notificação via Socket.IO:', socketError);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Registro de risco atualizado com sucesso",
      data: updatedRiskReport
    });
  } catch (error) {
    console.error('Erro ao atualizar registro de risco:', error);
    return res.status(500).json({
      success: false,
      message: "Erro ao atualizar registro de risco",
      error: error.message
    });
  }
};

// Excluir um registro de risco
const deleteRiskReport = async (req, res) => {
  try {
    const riskId = req.params.id;

    // Verificar se o registro existe
    const riskReport = await RiskReport.findById(riskId);
    if (!riskReport) {
      return res.status(404).json({
        success: false,
        message: "Registro de risco não encontrado"
      });
    }

    // Verificar se existem planos de ação associados
    const actionPlansCount = await ActionPlan.countDocuments({ riskId: riskId });
    if (actionPlansCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Não é possível excluir o registro pois existem planos de ação associados"
      });
    }

    // Excluir o registro
    await RiskReport.findByIdAndDelete(riskId);

    return res.status(200).json({
      success: true,
      message: "Registro de risco excluído com sucesso"
    });
  } catch (error) {
    console.error('Erro ao excluir registro de risco:', error);
    return res.status(500).json({
      success: false,
      message: "Erro ao excluir registro de risco",
      error: error.message
    });
  }
};

module.exports = {
  createRiskReport,
  getAllRiskReports,
  getRiskReportById,
  updateRiskReport,
  deleteRiskReport
};