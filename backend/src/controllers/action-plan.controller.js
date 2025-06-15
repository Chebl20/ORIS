const { validationResult } = require('express-validator');
const ActionPlan = require('../models/action-plan.model');
const RiskReport = require('../models/risk-report.model');
const User = require('../models/user.model');
const supabase = require('../lib/supabase');
const socketIO = require('../socket');
const path = require('path');

// Função auxiliar para upload de arquivos para o Supabase
async function uploadToSupabase(file) {
  const bucket = process.env.SUPABASE_BUCKET || 'oris';
  const ext = path.extname(file.originalname);
  const fileName = `action-plans/${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;

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

// Criar um novo plano de ação
const createActionPlan = async (req, res) => {
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

    // Verificar se o risco existe
    const riskReport = await RiskReport.findById(req.body.riskId);
    if (!riskReport) {
      return res.status(404).json({
        success: false,
        message: "Registro de risco não encontrado"
      });
    }

    // Processar uploads de arquivos
    let evidenceFiles = [];
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(file => uploadToSupabase(file));
      evidenceFiles = await Promise.all(uploadPromises);
    }

    // Criar o plano de ação
    const actionPlan = new ActionPlan({
      riskId: req.body.riskId,
      responsible: req.body.responsible,
      description: req.body.description,
      deadline: new Date(req.body.deadline),
      status: req.body.status || 'Pendente',
      evidenceFiles
    });

    await actionPlan.save();

    // Atualizar o status do risco para "Em Tratamento" se estiver "Aberto"
    if (riskReport.status === 'Aberto') {
      await RiskReport.findByIdAndUpdate(
        req.body.riskId,
        { 
          status: 'Em Tratamento',
          $push: { 
            historyLogs: {
              status: 'Em Tratamento',
              updatedBy: req.user._id,
              comment: 'Status alterado automaticamente após criação de plano de ação',
              timestamp: new Date()
            }
          }
        }
      );
    }

    return res.status(201).json({
      success: true,
      message: "Plano de ação criado com sucesso",
      data: actionPlan
    });
  } catch (error) {
    console.error('Erro ao criar plano de ação:', error);
    return res.status(500).json({
      success: false,
      message: "Erro ao criar plano de ação",
      error: error.message
    });
  }
};

// Obter todos os planos de ação com filtros
const getAllActionPlans = async (req, res) => {
  try {
    const { 
      riskId, 
      responsible, 
      status, 
      startDate, 
      endDate,
      deadlineStart,
      deadlineEnd,
      page = 1, 
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Construir filtro
    const filter = {};
    
    if (riskId) filter.riskId = riskId;
    if (responsible) filter.responsible = responsible;
    if (status) filter.status = status;
    
    // Filtro de data de criação
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Filtro de data de prazo
    if (deadlineStart || deadlineEnd) {
      filter.deadline = {};
      if (deadlineStart) filter.deadline.$gte = new Date(deadlineStart);
      if (deadlineEnd) filter.deadline.$lte = new Date(deadlineEnd);
    }

    // Configurar ordenação
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calcular paginação
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Executar consulta com população de dados relacionados
    const actionPlans = await ActionPlan.find(filter)
      .populate('riskId', 'title category priority status')
      .populate('responsible', 'name email department')
      .populate({
        path: 'historyLogs.updatedBy',
        select: 'name email'
      })
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    // Contar total de registros para paginação
    const total = await ActionPlan.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: actionPlans,
      pagination: {
        total,
        page: parseInt(page),
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar planos de ação:', error);
    return res.status(500).json({
      success: false,
      message: "Erro ao buscar planos de ação",
      error: error.message
    });
  }
};

// Obter um plano de ação específico por ID
const getActionPlanById = async (req, res) => {
  try {
    const actionPlanId = req.params.id;

    const actionPlan = await ActionPlan.findById(actionPlanId)
      .populate('riskId', 'title description category location priority status')
      .populate('responsible', 'name email department position')
      .populate({
        path: 'historyLogs.updatedBy',
        select: 'name email'
      });

    if (!actionPlan) {
      return res.status(404).json({
        success: false,
        message: "Plano de ação não encontrado"
      });
    }

    return res.status(200).json({
      success: true,
      data: actionPlan
    });
  } catch (error) {
    console.error('Erro ao buscar plano de ação:', error);
    return res.status(500).json({
      success: false,
      message: "Erro ao buscar plano de ação",
      error: error.message
    });
  }
};

// Atualizar um plano de ação
const updateActionPlan = async (req, res) => {
  try {
    const actionPlanId = req.params.id;
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

    // Verificar se o plano de ação existe
    const actionPlan = await ActionPlan.findById(actionPlanId);
    if (!actionPlan) {
      return res.status(404).json({
        success: false,
        message: "Plano de ação não encontrado"
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
    if (req.body.responsible) updateData.responsible = req.body.responsible;
    if (req.body.description) updateData.description = req.body.description;
    if (req.body.deadline) updateData.deadline = new Date(req.body.deadline);

    // Verificar se o status está sendo alterado
    const statusChanged = req.body.status && req.body.status !== actionPlan.status;
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

      // Se o status for alterado para "Concluído", verificar se todos os planos de ação do risco estão concluídos
      if (req.body.status === 'Concluído') {
        const riskId = actionPlan.riskId;
        
        // Atualizar o plano de ação primeiro
        await ActionPlan.findByIdAndUpdate(actionPlanId, updateData, { new: true });
        
        // Verificar se todos os planos de ação estão concluídos
        const pendingActionPlans = await ActionPlan.countDocuments({
          riskId: riskId,
          status: { $ne: 'Concluído' },
          _id: { $ne: actionPlanId } // Excluir o plano atual da contagem
        });
        
        // Se não houver planos pendentes, atualizar o status do risco para "Resolvido"
        if (pendingActionPlans === 0) {
          await RiskReport.findByIdAndUpdate(
            riskId,
            { 
              status: 'Resolvido',
              $push: { 
                historyLogs: {
                  status: 'Resolvido',
                  updatedBy: userId,
                  comment: 'Status alterado automaticamente após conclusão de todos os planos de ação',
                  timestamp: new Date()
                }
              }
            }
          );
        }
        
        // Buscar o plano atualizado com os dados populados
        const updatedActionPlan = await ActionPlan.findById(actionPlanId)
          .populate('riskId', 'title category priority status')
          .populate('responsible', 'name email')
          .populate({
            path: 'historyLogs.updatedBy',
            select: 'name email'
          });
          
        return res.status(200).json({
          success: true,
          message: "Plano de ação atualizado com sucesso",
          data: updatedActionPlan
        });
      }
    }

    // Adicionar novas evidências, se houver
    if (newEvidenceFiles.length > 0) {
      if (!updateData.$push) updateData.$push = {};
      updateData.$push.evidenceFiles = { $each: newEvidenceFiles };
    }

    // Atualizar o plano de ação
    const updatedActionPlan = await ActionPlan.findByIdAndUpdate(
      actionPlanId,
      updateData,
      { new: true, runValidators: true }
    ).populate('riskId', 'title category priority status')
      .populate('responsible', 'name email')
      .populate({
        path: 'historyLogs.updatedBy',
        select: 'name email'
      });

    return res.status(200).json({
      success: true,
      message: "Plano de ação atualizado com sucesso",
      data: updatedActionPlan
    });
  } catch (error) {
    console.error('Erro ao atualizar plano de ação:', error);
    return res.status(500).json({
      success: false,
      message: "Erro ao atualizar plano de ação",
      error: error.message
    });
  }
};

// Verificar planos de ação com prazo vencido
const checkOverduePlans = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Buscar planos de ação com prazo vencido e status não concluído
    const overduePlans = await ActionPlan.find({
      deadline: { $lt: today },
      status: { $ne: 'Concluído' }
    }).populate('riskId', 'title')
      .populate('responsible', '_id name email');

    if (overduePlans.length > 0) {
      const io = socketIO.getIO();
      
      // Notificar responsáveis e administradores
      overduePlans.forEach(plan => {
        // Notificar o responsável pelo plano
        if (plan.responsible) {
          io.to(plan.responsible._id.toString()).emit('actionPlanOverdue', {
            planId: plan._id,
            riskId: plan.riskId._id,
            riskTitle: plan.riskId.title,
            description: plan.description,
            deadline: plan.deadline
          });
        }
        
        // Notificar administradores
        User.find({ role: 'admin' }).select('_id').then(admins => {
          admins.forEach(admin => {
            io.to(admin._id.toString()).emit('actionPlanOverdue', {
              planId: plan._id,
              riskId: plan.riskId._id,
              riskTitle: plan.riskId.title,
              description: plan.description,
              deadline: plan.deadline,
              responsible: plan.responsible ? {
                id: plan.responsible._id,
                name: plan.responsible.name,
                email: plan.responsible.email
              } : null
            });
          });
        });
      });
    }

    return overduePlans;
  } catch (error) {
    console.error('Erro ao verificar planos de ação vencidos:', error);
    throw error;
  }
};

module.exports = {
  createActionPlan,
  getAllActionPlans,
  getActionPlanById,
  updateActionPlan,
  checkOverduePlans
};