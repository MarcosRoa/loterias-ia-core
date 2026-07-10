//src/routes/analyze.ts

import express from 'express';
import { validateApiKey } from '../middleware/auth';
import { orchestrator } from '../ai';

const router = express.Router();

router.post(
  '/',
  validateApiKey,
  async (req, res) => {
    try {
      const { lotteryType, history } = req.body;

      if (!history || !Array.isArray(history) || history.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Histórico de resultados é obrigatório'
        });
      }

      const result = await orchestrator.analyze({
        lotteryType,
        history
      });

      res.json(result);
    } catch (error: any) {
      console.error('❌ Erro na análise:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao analisar dados'
      });
    }
  }
);

export default router;
