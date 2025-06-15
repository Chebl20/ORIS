const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const riskController = require('../controllers/risk.controller');
const { auth, adminAuth } = require('../middlewares/auth.middleware');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Validação para criação e atualização de registros de risco
const riskValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Título é obrigatório')
    .isLength({ min: 5, max: 100 })
    .withMessage('Título deve ter entre 5 e 100 caracteres'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Descrição é obrigatória')
    .isLength({ min: 10 })
    .withMessage('Descrição deve ter pelo menos 10 caracteres'),
  body('category')
    .isIn(['Infraestrutura', 'Conduta', 'Ambiental', 'Outro'])
    .withMessage('Categoria inválida'),
  body('location')
    .trim()
    .notEmpty()
    .withMessage('Localização é obrigatória'),
  body('priority')
    .isIn(['Baixa', 'Média', 'Alta', 'Crítica'])
    .withMessage('Prioridade inválida')
];

// Validação para atualização de status
const statusUpdateValidation = [
  body('status')
    .isIn(['Aberto', 'Em Tratamento', 'Resolvido', 'Cancelado'])
    .withMessage('Status inválido'),
  body('comment')
    .optional()
    .trim()
    .isLength({ min: 3 })
    .withMessage('Comentário deve ter pelo menos 3 caracteres')
];

// Rotas para registros de risco

// POST /risks - Criar novo registro de risco
router.post(
  '/',
  auth,
  upload.array('evidenceFiles', 5), // Máximo de 5 arquivos
  riskValidation,
  riskController.createRiskReport
);

// GET /risks - Listar todos os riscos (com filtros)
router.get('/', auth, riskController.getAllRiskReports);

// GET /risks/:id - Detalhe de um risco
router.get('/:id', auth, riskController.getRiskReportById);

// PUT /risks/:id - Atualizar informações de um risco
router.put(
  '/:id',
  auth,
  upload.array('evidenceFiles', 5),
  [...riskValidation, ...statusUpdateValidation],
  riskController.updateRiskReport
);

// DELETE /risks/:id - Excluir um risco (casos de duplicidade)
router.delete('/:id', adminAuth, riskController.deleteRiskReport);

module.exports = router;