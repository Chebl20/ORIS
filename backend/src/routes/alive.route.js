const express = require('express');
const router = express.Router();

// Rota para verificar se a API está online
router.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'success',
    message: 'API is alive and running'
  });
});

module.exports = router;