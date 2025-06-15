const express = require('express');
const router = express.Router();
const riskReportController = require('../controllers/risk-report.controller');
const { auth, adminAuth } = require('../middlewares/auth.middleware');

// Rotas para relatórios e estatísticas

// GET /reports/risks-summary - Resumo geral de riscos
router.get('/risks-summary', auth, riskReportController.getRisksSummary);

// GET /reports/risks-by-location - Quantidade de riscos por área/localização
router.get('/risks-by-location', auth, riskReportController.getRisksByLocation);

// GET /reports/risks-by-category - Quantidade de riscos por categoria
router.get('/risks-by-category', auth, riskReportController.getRisksByCategory);

// GET /reports/average-resolution-time - Tempo médio de resolução
router.get('/average-resolution-time', auth, riskReportController.getAverageResolutionTime);

// GET /reports/action-plan-compliance - % de planos de ação tratados dentro do prazo
router.get('/action-plan-compliance', auth, riskReportController.getActionPlanComplianceRate);

// GET /reports/monthly-evolution - Evolução mensal de riscos
router.get('/monthly-evolution', auth, riskReportController.getMonthlyRiskEvolution);

module.exports = router;