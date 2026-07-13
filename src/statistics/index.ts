// ============================================
// CAMINHO: src/statistics/index.ts
// ============================================
// PONTO DE ENTRADA PARA ESTATÍSTICAS
// ============================================

import { StatisticsEngine } from './StatisticsEngine';
import type { StatisticsResult } from './models/StatisticsResult';

export class StatisticsService {
    private engine: StatisticsEngine;

    constructor() {
        this.engine = new StatisticsEngine();
    }

    async getStatistics(lottery: string, period: string = 'all'): Promise<StatisticsResult> {
        return await this.engine.calculate(lottery, period);
    }
}
