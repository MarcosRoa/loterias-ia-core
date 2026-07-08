src/routes/generate.js

const express = require('express');
const router = express.Router();
const LotteryAI = require('../ai/LotteryAI');

const ai = new LotteryAI();

// Middleware para validar API Key
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

// Rota principal de geração
router.post('/', validateApiKey, async (req, res) => {
  try {
    const { 
      lotteryType, 
      count = 1, 
      method = 'frequency',
      options = {},
      hotNumbers = [],
      coldNumbers = [],
      patterns = [],
      history = []
    } = req.body;

    // Validar loteria
    const validLotteries = ['megasena', 'quina', 'lotofacil', 'lotomania', 
                           'duplasena', 'timemania', 'milionaria', 
                           'diadesorte', 'supersete'];
    
    if (!validLotteries.includes(lotteryType)) {
      return res.status(400).json({
        success: false,
        error: `Loteria inválida. Use: ${validLotteries.join(', ')}`
      });
    }

    let result;

    // Escolher método
    switch (method) {
      case 'frequency':
        result = ai.generateByFrequency(lotteryType, count, options);
        break;
      case 'hotcold':
        result = ai.generateByHotCold(lotteryType, count, hotNumbers, coldNumbers);
        break;
      case 'pattern':
        result = ai.generateByPattern(lotteryType, count, patterns);
        break;
      case 'smart':
        result = ai.generateSmart(lotteryType, count, history);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Método inválido. Use: frequency, hotcold, pattern, smart`
        });
    }

    res.json(result);
  } catch (error) {
    console.error('Erro na geração:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao gerar jogos'
    });
  }
});

// Rota para obter configurações da loteria
router.get('/config/:lotteryType', validateApiKey, (req, res) => {
  try {
    const { lotteryType } = req.params;
    const configs = {
      megasena: { max: 60, count: 6, nome: 'Mega-Sena' },
      quina: { max: 80, count: 5, nome: 'Quina' },
      lotofacil: { max: 25, count: 15, nome: 'Lotofácil' },
      lotomania: { max: 99, count: 20, nome: 'Lotomania' },
      duplasena: { max: 50, count: 6, nome: 'Dupla Sena' },
      timemania: { max: 80, count: 7, nome: 'Timemania' },
      milionaria: { max: 50, count: 6, nome: '+Milionária' },
      diadesorte: { max: 31, count: 7, nome: 'Dia de Sorte' },
      supersete: { max: 9, count: 7, nome: 'Super Sete' }
    };

    const config = configs[lotteryType];
    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Loteria não encontrada'
      });
    }

    res.json({
      success: true,
      config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
