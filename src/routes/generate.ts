// ============================================
// CAMINHO: src/routes/generate.ts
// ============================================
// ROTA DE GERAÇÃO DE JOGOS - CORRIGIDA
// AGORA ACEITA OS MESMOS NOMES DO FRONTEND
// ============================================

import express from 'express';
import { validateApiKey, validateLotteryType, validateCount } from '../middleware/auth';
import { orchestrator } from '../ai';

const router = express.Router();

router.post(
  '/',
  validateApiKey,
  validateLotteryType,
  validateCount,
  async (req, res) => {
    try {
      // ============================================
      // 🔥 RECEBER OS MESMOS NOMES DO FRONTEND
      // ============================================
      const { 
        lottery,           // ← frontend envia 'lottery'
        quantity,          // ← frontend envia 'quantity'
        mode,              // ← frontend envia 'mode'
        uid,               // ← frontend envia 'uid'
        extraNumbers,      // ← frontend envia 'extraNumbers'
        period,            // ← frontend envia 'period'
        dispersao,         // ← frontend envia 'dispersao'
        dados,             // ← frontend envia 'dados'
        dadosExtras,       // ← frontend envia 'dadosExtras'
        filters,           // ← frontend envia 'filters'
        isPro = false
      } = req.body;

      console.log(`📥 /api/generate - Recebido:`, {
        lottery,
        quantity,
        mode,
        uid,
        extraNumbers,
        period,
        dispersao,
        dadosLength: dados?.length || 0
      });

      // ============================================
      // 🔥 MAPEAR PARA O QUE O ORQUESTRADOR ESPERA
      // ============================================
      const result = await orchestrator.generate({
        lotteryType: lottery,           // ← lottery → lotteryType
        count: quantity,                // ← quantity → count
        method: mode || 'hybrid',       // ← mode → method
        userId: uid,                    // ← uid → userId
        isPro: isPro,
        history: dados || [],           // ← dados → history
        extraNumbers: extraNumbers || 0,
        period: period || 'all',
        dispersao: dispersao || 15,
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
