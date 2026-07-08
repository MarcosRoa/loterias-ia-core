//src/routes/analyze.js

const express = require('express');
const router = express.Router();
const LotteryAI = require('../ai/LotteryAI');

const ai = new LotteryAI();

// Middleware de validação
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  if (!apiKey || apiKey !== process.env.API_SECRET_KEY) {
    return res.status(401).json({
      success: false,
      error: 'API Key inválida ou não fornecida'
    });
  }
  next();
};

// Análise de histórico
router.post('/', validateApiKey, async (req, res) => {
  try {
    const { lotteryType, history } = req.body;

    if (!history || !Array.isArray(history) || history.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Histórico de resultados é obrigatório'
      });
    }

    const configs = {
      megasena: { max: 60, count: 6 },
      quina: { max: 80, count: 5 },
      lotofacil: { max: 25, count: 15 },
      lotomania: { max: 99, count: 20 },
      duplasena: { max: 50, count: 6 },
      timemania: { max: 80, count: 7 },
      milionaria: { max: 50, count: 6 },
      diadesorte: { max: 31, count: 7 },
      supersete: { max: 9, count: 7 }
    };

    const config = configs[lotteryType];
    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Loteria inválida'
      });
    }

    const analysis = ai.analyzeHistory(history, config);

    res.json({
      success: true,
      lotteryType,
      analysis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro na análise:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao analisar dados'
    });
  }
});

module.exports = router;
