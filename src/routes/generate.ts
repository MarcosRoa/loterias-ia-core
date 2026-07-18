// ============================================
// CAMINHO: src/routes/generate.ts
// ============================================
// ROTA DE GERAÇÃO DE JOGOS - NORMALIZADA (FINAL)
// ============================================

import express from 'express';
import { validateApiKey, validateLotteryType, validateCount, validateMethod } from '../middleware/auth';
import { orchestrator } from '../ai';

const router = express.Router();

router.post(
  '/',
  validateApiKey,
  validateLotteryType,
  validateCount,
  validateMethod,
  async (req, res) => {
    try {
      // ============================================
      // 🔥 EXTRAIR DADOS (COM NORMALIZAÇÃO)
      // ============================================
      
      // ✅ Loteria (já padronizado pelo middleware)
      const lottery = req.body.lotteryType ?? req.body.lottery;
      
      // ✅ Quantidade (já padronizado pelo middleware)
      const count = req.body.count ?? req.body.quantity ?? 1;
      
      // ✅ Método (já padronizado pelo middleware)
      const method = req.body.method ?? req.body.mode ?? 'hybrid';
      
      // ✅ Period (normaliza filters.periodo)
      const period = req.body.period ?? req.body.filters?.periodo ?? 'all';
      
      // ✅ Dispersao (normaliza filters.dispersao)
      const dispersao = req.body.dispersao ?? req.body.filters?.dispersao ?? 15;
      
      const {
        uid,
        extraNumbers,
        dados,
        dadosExtras,
        filters,
        isPro = false
      } = req.body;

      console.log(`📥 /api/generate - Normalizado:`, {
        lottery,
        count,
        method,
        period,
        dispersao,
        uid,
        extraNumbers,
        dadosLength: dados?.length || 0,
        filters
      });

      // ============================================
      // 🔥 CHAMAR ORQUESTRADOR
      // ============================================
      const result = await orchestrator.generate({
        lotteryType: lottery,
        count: count,
        method: method,
        userId: uid,
        isPro: isPro,
        // ✅ O Railway carrega os CSVs internamente
        // history é apenas um fallback (se enviado)
        history: dados || [],
        extraNumbers: extraNumbers || 0,
        period: period,
        dispersao: dispersao,
        filters: filters || {},
        dadosExtras: dadosExtras || []
      });

      // ============================================
      // 🔥 RESPOSTA
      // ============================================
      if (!result.success) {
        return res.status(400).json(result);
      }

      console.log(`✅ ${result.count} jogos gerados para ${result.lotteryType}`);

      res.json({
        success: true,
        games: result.games || [],
        creditsSpent: result.creditsSpent || 0,
        creditsRemaining: result.creditsRemaining || 0,
        mode: result.method,
        engineName: result.engineName || 'IA',
        confidence: result.confidence || 0,
        explanation: result.explanation || [],
        iaUsed: result.iaUsed || false,
        totalHistorico: result.totalHistorico || 0,
        isPro: isPro
      });

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
