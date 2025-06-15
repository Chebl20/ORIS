const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const actionPlanController = require('../controllers/action-plan.controller');
const { auth, adminAuth } = require('../middlewares/auth.middleware');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Validação para criação e atualização de planos de ação
const actionPlanValidation = [
  body('riskId')
    .notEmpty()
    .withMessage('ID do risco é obrigatório')
    .isMongoId()
    .withMessage('ID do risco inválido'),
  body('responsible')
    .notEmpty()
    .withMessage('Responsável é obrigatório')
    .isMongoId()
    .withMessage('ID do responsável inválido'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Descrição é obrigatória')
    .isLength({ min: 10 })
    .withMessage('Descrição deve ter pelo menos 10 caracteres'),
  body('deadline')
    .notEmpty()
    .withMessage('Prazo é obrigatório')
    .isISO8601()
    .withMessage('Data de prazo inválida')
];

// Validação para atualização de status
const statusUpdateValidation = [
  body('status')
    .isIn(['Pendente', 'Em Andamento', 'Concluído'])
    .withMessage('Status inválido'),
  body('comment')
    .optional()
    .trim()
    .isLength({ min: 3 })
    .withMessage('Comentário deve ter pelo menos 3 caracteres')
];

// Rotas para planos de ação

// POST /action-plans - Criar novo plano de ação
router.post(
  '/',
  auth,
  upload.array('evidenceFiles', 5), // Máximo de 5 arquivos
  actionPlanValidation,
  actionPlanController.createActionPlan
);

// GET /action-plans - Listar todos os planos de ação (com filtros)
router.get('/', auth, actionPlanController.getAllActionPlans);

// GET /action-plans/:id - Detalhe de um plano de ação
router.get('/:id', auth, actionPlanController.getActionPlanById);

// PUT /action-plans/:id - Atualizar informações de um plano de ação
router.put(
  '/:id',
  auth,
  upload.array('evidenceFiles', 5),
  [...actionPlanValidation.map(validator => validator.optional()), ...statusUpdateValidation],
  actionPlanController.updateActionPlan
);

module.exports = router;