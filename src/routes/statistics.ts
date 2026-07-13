// ============================================
// CAMINHO: src/routes/statistics.ts
// ============================================
// ROTA /api/statistics
// ============================================

import { Request, Response } from 'express';
import { StatisticsService } from '../statistics';

const statisticsService = new StatisticsService();

export async function handleStatistics(req: Request, res: Response) {
    try {
        const { lottery, period = 'all' } = req.query;

        if (!lottery || typeof lottery !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Parâmetro "lottery" é obrigatório'
            });
        }

        console.log(`📊 /api/statistics chamado: lottery=${lottery}, period=${period}`);

        const result = await statisticsService.getStatistics(lottery, period as string);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json(result);

    } catch (error) {
        console.error('❌ Erro em /api/statistics:', error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao calcular estatísticas'
        });
    }
}
