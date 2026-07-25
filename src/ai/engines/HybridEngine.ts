// ============================================
// CAMINHO: src/ai/engines/HybridEngine.ts
// ============================================
// IA HÍBRIDA - Combina estatística, probabilidade e tendência
// ============================================

import { BaseEngine, EngineResult, JogoGerado, EngineConfig } from './BaseEngine';
import { FrequencyAnalyzer } from '../analysis/FrequencyAnalyzer';
import { DelayAnalyzer } from '../analysis/DelayAnalyzer';
import { DispersionAnalyzer } from '../analysis/DispersionAnalyzer';
import { ProbabilityAnalyzer } from '../analysis/ProbabilityAnalyzer';
import { PatternAnalyzer } from '../analysis/PatternAnalyzer';
import { ConfidenceCalculator } from '../evaluation/ConfidenceCalculator';

export class HybridEngine extends BaseEngine {
    private confidenceCalc: ConfidenceCalculator;

    constructor(dados: number[][], config: EngineConfig) {
        super(dados, config);
        this.confidenceCalc = new ConfidenceCalculator();
    }

    getNome(): string {
        return '🧠 IA Híbrida ⭐ RECOMENDADO';
    }

    getDescricao(): string {
        return 'Combina estatística, probabilidade e tendência';
    }

    gerarJogos(quantidade: number, seed: number, params: any = {}): EngineResult {
        const jogos: JogoGerado[] = [];
        const dispersao = params.dispersao || 15;

        if (!this.context || this.dados.length < 10) {
            for (let i = 0; i < quantidade; i++) {
                const numeros = this.gerarAleatorio(this.config.numerosPadrao, seed + i);
                const jogo = this.criarJogo(numeros, seed + i);
                jogos.push(jogo);
            }

            return {
                games: jogos,
                confidence: 30,
                engineName: this.getNome(),
                explanation: ['⚠️ Poucos dados históricos, usando aleatório']
            };
        }

        const frequency = this.context.frequency;
        const delay = this.context.delay;
        const dispersion = this.context.dispersion;
        const probability = this.context.probability;
        const patterns = this.context.patterns;

        dispersion.setWindowSize(dispersao);

        for (let i = 0; i < quantidade; i++) {
            const numeros = this.gerarNumerosHibridos(
                frequency,
                delay,
                dispersion,
                probability,
                patterns,
                seed + i
            );
            
            const jogo = this.criarJogo(numeros, seed + i, [
                '🧠 Combina 4 técnicas diferentes',
                '📊 Estatística + Probabilidade + Tendência'
            ]);
            
            jogos.push(jogo);
        }

        const confianca = this.confidenceCalc.calcularCompleta(
            this.dados,
            ['frequencia', 'atraso', 'dispersao', 'probabilidade', 'padroes']
        );

        return {
            games: jogos,
            confidence: confianca.confianca,
            engineName: this.getNome(),
            explanation: [
                `🧠 ${this.dados.length} concursos analisados`,
                `🎯 Confiança: ${confianca.confianca.toFixed(0)}%`,
                `📊 ${confianca.fatores.qualidadeEstatistica.toFixed(0)}% qualidade estatística`
            ]
        };
    }

    private gerarNumerosHibridos(
        frequency: FrequencyAnalyzer,
        delay: DelayAnalyzer,
        dispersion: DispersionAnalyzer,
        probability: ProbabilityAnalyzer,
        patterns: PatternAnalyzer,
        seed: number
    ): number[] {
        const quantidade = this.config.numerosPadrao;
        const min = this.config.incluirZero ? 0 : 1;
        const max = this.config.maxNumero;
        const numeros = new Set<number>();
        const scores: { numero: number; score: number }[] = [];

        const pesos = {
            frequencia: 0.30,
            atraso: 0.20,
            probabilidade: 0.25,
            padrao: 0.15,
            dispersao: 0.10
        };

        const melhoresPadroes = patterns.getMelhoresPadroes(5);
        const padroesNumeros = new Set<number>();
        for (const padrao of melhoresPadroes) {
            const nums = patterns.gerarNumerosPorPadrao(padrao, 3, max);
            for (const n of nums) {
                padroesNumeros.add(n);
            }
        }

        for (let i = min; i <= max; i++) {
            const freqScore = frequency.getFrequenciaNormalizada(i) / 100;
            const delayScore = delay.getAtrasoNormalizado(i) / 100;
            const probScore = probability.getProbabilidade(i) * 2;
            const padraoScore = padroesNumeros.has(i) ? 0.8 : 0.2;

            let score = (
                freqScore * pesos.frequencia +
                delayScore * pesos.atraso +
                probScore * pesos.probabilidade +
                padraoScore * pesos.padrao
            );

            score = dispersion.aplicarPenalidade(i, score * 100) / 100;

            scores.push({ numero: i, score });
        }

        scores.sort((a, b) => b.score - a.score);

        for (const item of scores) {
            if (numeros.size >= quantidade) break;
            numeros.add(item.numero);
        }

        while (numeros.size < quantidade) {
            const num = this.random.nextInt(min, max, seed + numeros.size);
            numeros.add(num);
        }

        return Array.from(numeros).sort((a, b) => a - b);
    }
}
