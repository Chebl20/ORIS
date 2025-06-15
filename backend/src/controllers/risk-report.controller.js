const RiskReport = require('../models/risk-report.model');
const ActionPlan = require('../models/action-plan.model');
const mongoose = require('mongoose');

// Resumo de riscos por área/localização
const getRisksByLocation = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Construir filtro de data
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Agregação para contar riscos por localização
    const risksByLocation = await RiskReport.aggregate([
      { $match: dateFilter },
      { $group: {
          _id: "$location",
          total: { $sum: 1 },
          abertos: {
            $sum: {
              $cond: [{ $eq: ["$status", "Aberto"] }, 1, 0]
            }
          },
          emTratamento: {
            $sum: {
              $cond: [{ $eq: ["$status", "Em Tratamento"] }, 1, 0]
            }
          },
          resolvidos: {
            $sum: {
              $cond: [{ $eq: ["$status", "Resolvido"] }, 1, 0]
            }
          },
          cancelados: {
            $sum: {
              $cond: [{ $eq: ["$status", "Cancelado"] }, 1, 0]
            }
          },
          criticos: {
            $sum: {
              $cond: [{ $eq: ["$priority", "Crítica"] }, 1, 0]
            }
          }
        }},
      { $project: {
          _id: 0,
          location: "$_id",
          total: 1,
          abertos: 1,
          emTratamento: 1,
          resolvidos: 1,
          cancelados: 1,
          criticos: 1
        }},
      { $sort: { total: -1 } }
    ]);

    return res.status(200).json({
      success: true,
      data: risksByLocation
    });
  } catch (error) {
    console.error('Erro ao gerar relatório de riscos por localização:', error);
    return res.status(500).json({
      success: false,
      message: "Erro ao gerar relatório",
      error: error.message
    });
  }
};

// Resumo de riscos por categoria
const getRisksByCategory = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Construir filtro de data
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Agregação para contar riscos por categoria
    const risksByCategory = await RiskReport.aggregate([
      { $match: dateFilter },
      { $group: {
          _id: "$category",
          total: { $sum: 1 },
          abertos: {
            $sum: {
              $cond: [{ $eq: ["$status", "Aberto"] }, 1, 0]
            }
          },
          emTratamento: {
            $sum: {
              $cond: [{ $eq: ["$status", "Em Tratamento"] }, 1, 0]
            }
          },
          resolvidos: {
            $sum: {
              $cond: [{ $eq: ["$status", "Resolvido"] }, 1, 0]
            }
          },
          cancelados: {
            $sum: {
              $cond: [{ $eq: ["$status", "Cancelado"] }, 1, 0]
            }
          }
        }},
      { $project: {
          _id: 0,
          category: "$_id",
          total: 1,
          abertos: 1,
          emTratamento: 1,
          resolvidos: 1,
          cancelados: 1
        }},
      { $sort: { total: -1 } }
    ]);

    return res.status(200).json({
      success: true,
      data: risksByCategory
    });
  } catch (error) {
    console.error('Erro ao gerar relatório de riscos por categoria:', error);
    return res.status(500).json({
      success: false,
      message: "Erro ao gerar relatório",
      error: error.message
    });
  }
};

// Tempo médio de resolução de riscos
const getAverageResolutionTime = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Construir filtro de data e status
    const filter = { status: 'Resolvido' };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Buscar riscos resolvidos
    const resolvedRisks = await RiskReport.find(filter);
    
    // Calcular tempo médio de resolução
    let totalResolutionTime = 0;
    let risksWithValidHistory = 0;
    
    resolvedRisks.forEach(risk => {
      // Encontrar o log de criação (primeiro log)
      const creationLog = risk.historyLogs[0];
      if (!creationLog) return;
      
      // Encontrar o log de resolução (status = Resolvido)
      const resolutionLog = risk.historyLogs.find(log => log.status === 'Resolvido');
      if (!resolutionLog) return;
      
      // Calcular diferença em dias
      const creationDate = new Date(creationLog.timestamp);
      const resolutionDate = new Date(resolutionLog.timestamp);
      const diffTime = Math.abs(resolutionDate - creationDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      totalResolutionTime += diffDays;
      risksWithValidHistory++;
    });
    
    const averageResolutionTime = risksWithValidHistory > 0 ? 
      totalResolutionTime / risksWithValidHistory : 0;

    return res.status(200).json({
      success: true,
      data: {
        averageResolutionTimeDays: averageResolutionTime,
        totalResolvedRisks: resolvedRisks.length,
        risksWithValidHistory
      }
    });
  } catch (error) {
    console.error('Erro ao calcular tempo médio de resolução:', error);
    return res.status(500).json({
      success: false,
      message: "Erro ao gerar relatório",
      error: error.message
    });
  }
};

// Percentual de planos de ação concluídos dentro do prazo
const getActionPlanComplianceRate = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Construir filtro de data e status
    const filter = { status: 'Concluído' };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Buscar planos de ação concluídos
    const completedPlans = await ActionPlan.find(filter);
    
    let onTimePlans = 0;
    let latePlans = 0;
    
    completedPlans.forEach(plan => {
      // Encontrar o log de conclusão
      const completionLog = plan.historyLogs.find(log => log.status === 'Concluído');
      if (!completionLog) return;
      
      const completionDate = new Date(completionLog.timestamp);
      const deadlineDate = new Date(plan.deadline);
      
      // Verificar se foi concluído dentro do prazo
      if (completionDate <= deadlineDate) {
        onTimePlans++;
      } else {
        latePlans++;
      }
    });
    
    const totalPlans = onTimePlans + latePlans;
    const complianceRate = totalPlans > 0 ? (onTimePlans / totalPlans) * 100 : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalCompletedPlans: totalPlans,
        onTimePlans,
        latePlans,
        complianceRatePercentage: complianceRate
      }
    });
  } catch (error) {
    console.error('Erro ao calcular taxa de conformidade de planos de ação:', error);
    return res.status(500).json({
      success: false,
      message: "Erro ao gerar relatório",
      error: error.message
    });
  }
};

// Evolução mensal de riscos
const getMonthlyRiskEvolution = async (req, res) => {
  try {
    const { year } = req.query;
    const selectedYear = year ? parseInt(year) : new Date().getFullYear();
    
    // Definir intervalo de datas para o ano selecionado
    const startDate = new Date(selectedYear, 0, 1); // 1º de janeiro
    const endDate = new Date(selectedYear, 11, 31, 23, 59, 59); // 31 de dezembro
    
    // Agregação para contar riscos por mês
    const monthlyRisks = await RiskReport.aggregate([
      { 
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 },
          resolved: {
            $sum: {
              $cond: [{ $eq: ["$status", "Resolvido"] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          month: "$_id",
          count: 1,
          resolved: 1
        }
      },
      { $sort: { month: 1 } }
    ]);
    
    // Preencher meses faltantes
    const result = [];
    for (let month = 1; month <= 12; month++) {
      const monthData = monthlyRisks.find(item => item.month === month);
      result.push({
        month,
        count: monthData ? monthData.count : 0,
        resolved: monthData ? monthData.resolved : 0
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        year: selectedYear,
        months: result
      }
    });
  } catch (error) {
    console.error('Erro ao gerar relatório de evolução mensal:', error);
    return res.status(500).json({
      success: false,
      message: "Erro ao gerar relatório",
      error: error.message
    });
  }
};

// Resumo geral de riscos
const getRisksSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Construir filtro de data
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Contagem total de riscos
    const totalRisks = await RiskReport.countDocuments(dateFilter);
    
    // Contagem por status
    const statusCounts = await RiskReport.aggregate([
      { $match: dateFilter },
      { $group: {
          _id: "$status",
          count: { $sum: 1 }
        }},
      { $project: {
          _id: 0,
          status: "$_id",
          count: 1
        }}
    ]);
    
    // Contagem por prioridade
    const priorityCounts = await RiskReport.aggregate([
      { $match: dateFilter },
      { $group: {
          _id: "$priority",
          count: { $sum: 1 }
        }},
      { $project: {
          _id: 0,
          priority: "$_id",
          count: 1
        }}
    ]);
    
    // Contagem por categoria
    const categoryCounts = await RiskReport.aggregate([
      { $match: dateFilter },
      { $group: {
          _id: "$category",
          count: { $sum: 1 }
        }},
      { $project: {
          _id: 0,
          category: "$_id",
          count: 1
        }}
    ]);
    
    // Contagem de planos de ação
    const actionPlanFilter = {};
    if (startDate || endDate) {
      actionPlanFilter.createdAt = {};
      if (startDate) actionPlanFilter.createdAt.$gte = new Date(startDate);
      if (endDate) actionPlanFilter.createdAt.$lte = new Date(endDate);
    }
    
    const totalActionPlans = await ActionPlan.countDocuments(actionPlanFilter);
    
    // Contagem de planos por status
    const actionPlanStatusCounts = await ActionPlan.aggregate([
      { $match: actionPlanFilter },
      { $group: {
          _id: "$status",
          count: { $sum: 1 }
        }},
      { $project: {
          _id: 0,
          status: "$_id",
          count: 1
        }}
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalRisks,
        byStatus: statusCounts,
        byPriority: priorityCounts,
        byCategory: categoryCounts,
        actionPlans: {
          total: totalActionPlans,
          byStatus: actionPlanStatusCounts
        }
      }
    });
  } catch (error) {
    console.error('Erro ao gerar resumo de riscos:', error);
    return res.status(500).json({
      success: false,
      message: "Erro ao gerar relatório",
      error: error.message
    });
  }
};

module.exports = {
  getRisksByLocation,
  getRisksByCategory,
  getAverageResolutionTime,
  getActionPlanComplianceRate,
  getMonthlyRiskEvolution,
  getRisksSummary
};