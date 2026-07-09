//src/routes/predict.ts

import express from 'express';
import { validateApiKey } from '../middleware/auth';
import { IAOrchestrator } from '../ai';

const router = express.Router();

router.post(
  '/',
  validateApiKey,
  async (req, res) => {
    try {
      const { lotteryType, history, count = 3 } = req.body;

      if (!history || !Array.isArray(history) || history.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Histórico é obrigatório'
        });
      }

      const result = await IAOrchestrator.predict({
        lotteryType,
        history,
        count
      });

      res.json(result);
    } catch (error: any) {
      console.error('❌ Erro na predição:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao fazer predição'
      });
    }
  }
);

export default router;
