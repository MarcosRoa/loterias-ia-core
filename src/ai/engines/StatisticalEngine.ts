// ============================================
// CAMINHO: src/ai/engines/StatisticalEngine.ts
// ============================================
// IA ESTATÍSTICA - Análise de frequência, atraso e dispersão
// ============================================

import { BaseEngine, EngineResult, JogoGerado, EngineConfig } from './BaseEngine';
import { FrequencyAnalyzer } from '../analysis/FrequencyAnalyzer';
import { DelayAnalyzer } from '../analysis/DelayAnalyzer';
import { DispersionAnalyzer } from '../analysis/DispersionAnalyzer';
import { ConfidenceCalculator } from '../evaluation/ConfidenceCalculator';

export class StatisticalEngine extends BaseEngine {
    private confidenceCalc: ConfidenceCalculator;

    constructor(dados: number[][], config: EngineConfig) {
        super(dados, config);
        this.confidenceCalc = new ConfidenceCalculator();
    }

    getNome(): string {
        return '📊 IA Estatística';
    }

    getDescricao(): string {
        return 'Analisa frequência, atraso e dispersão dos números';
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

        dispersion.setWindowSize(dispersao);

        for (let i = 0; i < quantidade; i++) {
            const numeros = this.gerarNumerosEstatisticos(
                frequency,
                delay,
                dispersion,
                seed + i
            );
            
            const jogo = this.criarJogo(numeros, seed + i, [
                '📊 Baseado em frequência e atraso',
                `📈 Dispersão: ${dispersao} concursos`
            ]);
            
            jogos.push(jogo);
        }

        const confianca = this.confidenceCalc.calcularCompleta(
            this.dados,
            ['frequencia', 'atraso', 'dispersao']
        );

        return {
            games: jogos,
            confidence: confianca.confianca,
            engineName: this.getNome(),
            explanation: [
                `📊 Baseado em ${this.dados.length} concursos`,
                `🎯 Confiança: ${confianca.confianca.toFixed(0)}%`,
                `📈 ${confianca.fatores.quantidadeConcursos.toFixed(0)}% dados disponíveis`
            ]
        };
    }

    private gerarNumerosEstatisticos(
        frequency: FrequencyAnalyzer,
        delay: DelayAnalyzer,
        dispersion: DispersionAnalyzer,
        seed: number
    ): number[] {
        const quantidade = this.config.numerosPadrao;
        const min = this.config.incluirZero ? 0 : 1;
        const max = this.config.maxNumero;
        const numeros = new Set<number>();
        const scores: { numero: number; score: number }[] = [];

        for (let i = min; i <= max; i++) {
            const freqScore = frequency.getFrequenciaNormalizada(i);
            const delayScore = delay.getAtrasoNormalizado(i);
            let score = freqScore * 0.5 + delayScore * 0.5;
            
            score = dispersion.aplicarPenalidade(i, score);
            
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
