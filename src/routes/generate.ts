//src/routes/generate.ts

import express from 'express';
import { validateApiKey, validateLotteryType, validateCount } from '../middleware/auth';
import { IAOrchestrator } from '../ai';

const router = express.Router();

router.post(
  '/',
  validateApiKey,
  validateLotteryType,
  validateCount,
  async (req, res) => {
    try {
      const { 
        lotteryType, 
        count = 1, 
        method = 'smart',
        userId = null,
        isPro = false,
        history = []
      } = req.body;

      const result = await IAOrchestrator.generate({
        lotteryType,
        count,
        method,
        userId,
        isPro,
        history
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error: any) {
      console.error('❌ Erro na geração:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao gerar jogos'
      });
    }
  }
);

export default router;
