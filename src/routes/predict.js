//src/routes/predict.js

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

// Predição de próximos resultados
router.post('/', validateApiKey, async (req, res) => {
  try {
    const { 
      lotteryType, 
      history, 
      count = 3,
      method = 'smart'
    } = req.body;

    if (!history || !Array.isArray(history)) {
      return res.status(400).json({
        success: false,
        error: 'Histórico é obrigatório'
      });
    }

    // Analisar histórico
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

    // Análise para predição
    const analysis = ai.analyzeHistory(history, config);

    // Gerar jogos baseados na análise
    const predictions = [];
    for (let i = 0; i < count; i++) {
      const game = ai._generateSmartGame(config, analysis);
      predictions.push(game);
    }

    // Calcular confiança da predição
    const confidence = Math.min(100, Math.round(
      (analysis.hot.length / config.count) * 30 + 
      (analysis.totalDraws > 100 ? 30 : analysis.totalDraws / 100 * 30) +
      20
    ));

    res.json({
      success: true,
      lotteryType,
      predictions,
      confidence,
      analysis: {
        totalDraws: analysis.totalDraws,
        hotNumbers: analysis.hot.map(h => h.num),
        coldNumbers: analysis.cold.map(c => c.num),
        mostFrequent: analysis.mostFrequent,
        leastFrequent: analysis.leastFrequent
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro na predição:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao fazer predição'
    });
  }
});

module.exports = router;
