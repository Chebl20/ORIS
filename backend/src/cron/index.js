const cron = require('node-cron');
const ActionPlan = require('../models/action-plan.model');
const User = require('../models/user.model');
const socketIO = require('../socket');
const actionPlanController = require('../controllers/action-plan.controller');
const riskReportController = require('../controllers/risk-report.controller');
const fs = require('fs').promises;
const path = require('path');
const supabase = require('../lib/supabase');

// Função para verificar planos de ação com prazo próximo do vencimento
async function checkUpcomingDeadlines() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Data limite para 3 dias a partir de hoje
    const deadlineLimit = new Date(today);
    deadlineLimit.setDate(today.getDate() + 3);
    
    // Buscar planos de ação com prazo próximo do vencimento e status não concluído
    const upcomingDeadlinePlans = await ActionPlan.find({
      deadline: { $gte: today, $lte: deadlineLimit },
      status: { $ne: 'Concluído' }
    }).populate('riskId', 'title')
      .populate('responsible', '_id name email');
    
    if (upcomingDeadlinePlans.length > 0) {
      const io = socketIO.getIO();
      
      // Notificar responsáveis
      upcomingDeadlinePlans.forEach(plan => {
        if (plan.responsible) {
          // Calcular dias restantes
          const deadlineDate = new Date(plan.deadline);
          const diffTime = Math.abs(deadlineDate - today);
          const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          // Emitir evento via Socket.IO
          io.to(plan.responsible._id.toString()).emit('actionPlanDeadlineWarning', {
            planId: plan._id,
            riskId: plan.riskId._id,
            riskTitle: plan.riskId.title,
            description: plan.description,
            deadline: plan.deadline,
            daysRemaining
          });
        }
      });
    }
    
    console.log(`[${new Date().toISOString()}] Verificação de prazos próximos concluída. ${upcomingDeadlinePlans.length} planos encontrados.`);
    return upcomingDeadlinePlans;
  } catch (error) {
    console.error('Erro ao verificar planos com prazo próximo:', error);
  }
}

// Função para verificar planos de ação com prazo vencido
async function checkOverduePlans() {
  try {
    const overduePlans = await actionPlanController.checkOverduePlans();
    console.log(`[${new Date().toISOString()}] Verificação de planos vencidos concluída. ${overduePlans.length} planos encontrados.`);
    return overduePlans;
  } catch (error) {
    console.error('Erro ao verificar planos vencidos:', error);
  }
}

// Função para gerar relatório mensal
async function generateMonthlyReport() {
  try {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    
    // Formatar nome do mês
    const monthName = lastMonth.toLocaleString('pt-BR', { month: 'long' });
    const year = lastMonth.getFullYear();
    
    // Definir período do relatório
    const startDate = lastMonth.toISOString().split('T')[0];
    const endDate = lastMonthEnd.toISOString().split('T')[0];
    
    // Obter dados para o relatório
    const risksByLocation = await getRisksByLocation(startDate, endDate);
    const risksByCategory = await getRisksByCategory(startDate, endDate);
    const averageResolutionTime = await getAverageResolutionTime(startDate, endDate);
    const actionPlanCompliance = await getActionPlanCompliance(startDate, endDate);
    const risksSummary = await getRisksSummary(startDate, endDate);
    
    // Criar objeto com todos os dados do relatório
    const reportData = {
      period: {
        month: monthName,
        year,
        startDate,
        endDate
      },
      summary: risksSummary,
      byLocation: risksByLocation,
      byCategory: risksByCategory,
      resolutionTime: averageResolutionTime,
      actionPlanCompliance,
      generatedAt: new Date().toISOString()
    };
    
    // Salvar relatório como JSON
    const reportFileName = `report_${year}_${lastMonth.getMonth() + 1}.json`;
    const reportsDir = path.join(process.cwd(), 'reports');
    
    // Criar diretório de relatórios se não existir
    try {
      await fs.mkdir(reportsDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    
    // Salvar arquivo localmente
    const reportPath = path.join(reportsDir, reportFileName);
    await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2));
    
    // Fazer upload para o Supabase
    const fileBuffer = await fs.readFile(reportPath);
    const bucket = process.env.SUPABASE_BUCKET || 'oris';
    const supabasePath = `reports/${reportFileName}`;
    
    const { data, error } = await supabase.storage.from(bucket).upload(supabasePath, fileBuffer, {
      contentType: 'application/json',
      upsert: true
    });
    
    if (error) throw error;
    
    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(supabasePath);
    
    console.log(`[${new Date().toISOString()}] Relatório mensal gerado com sucesso: ${publicUrlData.publicUrl}`);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Erro ao gerar relatório mensal:', error);
  }
}

// Funções auxiliares para obter dados para o relatório mensal
async function getRisksByLocation(startDate, endDate) {
  // Simulação da chamada ao controller
  const req = { query: { startDate, endDate } };
  const res = {
    status: () => res,
    json: (data) => data
  };
  
  const result = await riskReportController.getRisksByLocation(req, res);
  return result.data;
}

async function getRisksByCategory(startDate, endDate) {
  const req = { query: { startDate, endDate } };
  const res = {
    status: () => res,
    json: (data) => data
  };
  
  const result = await riskReportController.getRisksByCategory(req, res);
  return result.data;
}

async function getAverageResolutionTime(startDate, endDate) {
  const req = { query: { startDate, endDate } };
  const res = {
    status: () => res,
    json: (data) => data
  };
  
  const result = await riskReportController.getAverageResolutionTime(req, res);
  return result.data;
}

async function getActionPlanCompliance(startDate, endDate) {
  const req = { query: { startDate, endDate } };
  const res = {
    status: () => res,
    json: (data) => data
  };
  
  const result = await riskReportController.getActionPlanComplianceRate(req, res);
  return result.data;
}

async function getRisksSummary(startDate, endDate) {
  const req = { query: { startDate, endDate } };
  const res = {
    status: () => res,
    json: (data) => data
  };
  
  const result = await riskReportController.getRisksSummary(req, res);
  return result.data;
}

// Inicializar tarefas agendadas
function initCronJobs() {
  // Verificar planos de ação com prazo próximo do vencimento - todos os dias às 8h
  cron.schedule('0 8 * * *', async () => {
    console.log(`[${new Date().toISOString()}] Iniciando verificação de prazos próximos...`);
    await checkUpcomingDeadlines();
  });
  
  // Verificar planos de ação com prazo vencido - todos os dias às 8h
  cron.schedule('0 8 * * *', async () => {
    console.log(`[${new Date().toISOString()}] Iniciando verificação de planos vencidos...`);
    await checkOverduePlans();
  });
  
  // Gerar relatório mensal - no primeiro dia de cada mês às 3h da manhã
  cron.schedule('0 3 1 * *', async () => {
    console.log(`[${new Date().toISOString()}] Iniciando geração de relatório mensal...`);
    await generateMonthlyReport();
  });
  
  console.log('Tarefas agendadas inicializadas com sucesso.');
}

module.exports = {
  initCronJobs,
  checkUpcomingDeadlines,
  checkOverduePlans,
  generateMonthlyReport
};