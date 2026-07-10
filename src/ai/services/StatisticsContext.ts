// ============================================
// CAMINHO: src/ai/services/StatisticsContext.ts
// ============================================
// Contexto compartilhado com todas as estatísticas pré-calculadas
// ============================================

import { FrequencyAnalyzer } from '../analysis/FrequencyAnalyzer';
import { DelayAnalyzer } from '../analysis/DelayAnalyzer';
import { DispersionAnalyzer } from '../analysis/DispersionAnalyzer';
import { PatternAnalyzer } from '../analysis/PatternAnalyzer';
import { ProbabilityAnalyzer } from '../analysis/ProbabilityAnalyzer';

export class StatisticsContext {
    public frequency: FrequencyAnalyzer;
    public delay: DelayAnalyzer;
    public dispersion: DispersionAnalyzer;
    public patterns: PatternAnalyzer;
    public probability: ProbabilityAnalyzer;

    private _dados: number[][];
    private _timestamp: number;

    constructor(dados: number[][]) {
        this._dados = dados;
        this._timestamp = Date.now();

        this.frequency = new FrequencyAnalyzer(dados);
        this.delay = new DelayAnalyzer(dados);
        this.dispersion = new DispersionAnalyzer(dados);
        this.patterns = new PatternAnalyzer(dados);
        this.probability = new ProbabilityAnalyzer(dados);
    }

    getDados(): number[][] {
        return this._dados;
    }

    getTimestamp(): number {
        return this._timestamp;
    }

    isAtualizado(novosDados: number[][]): boolean {
        if (novosDados.length !== this._dados.length) return false;
        for (let i = 0; i < novosDados.length; i++) {
            if (novosDados[i].length !== this._dados[i].length) return false;
            for (let j = 0; j < novosDados[i].length; j++) {
                if (novosDados[i][j] !== this._dados[i][j]) return false;
            }
        }
        return true;
    }
}
