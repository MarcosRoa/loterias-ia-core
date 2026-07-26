// ============================================
// CAMINHO: src/ai/engines/PredictiveEngine.ts
// ============================================

import { BaseEngine, EngineConfig, EngineExtras, EngineResult, JogoGerado } from './BaseEngine';
import { PatternAnalyzer } from '../analysis/PatternAnalyzer';
import { FrequencyAnalyzer } from '../analysis/FrequencyAnalyzer';
import { DelayAnalyzer } from '../analysis/DelayAnalyzer';
import { ConfidenceCalculator } from '../evaluation/ConfidenceCalculator';

export class PredictiveEngine extends BaseEngine {
    private confidenceCalc: ConfidenceCalculator;

    // ✅ ÚNICA MODIFICAÇÃO: CONSTRUTOR COM 4 ARGUMENTOS
    constructor(
        dados: number[][],
        config: EngineConfig,
        isPro: boolean = false,
        extras?: EngineExtras
    ) {
        super(dados, config, isPro, extras);
        this.confidenceCalc = new ConfidenceCalculator();
    }

    getNome(): string {
        return '🔮 IA Preditiva ⭐ PRO';
    }

    getDescricao(): string {
        return 'Detecta padrões e tenta prever os próximos números';
    }

    isDisponivel(): boolean {
        return this.isPro;
    }

    gerarJogos(quantidade: number, seed: number, params: any = {}): EngineResult {
        const jogos: JogoGerado[] = [];

        if (!this.isPro) {
            return {
                games: [],
                confidence: 0,
                engineName: this.getNome(),
                explanation: ['⭐ Exclusivo para assinantes PRO']
            };
        }

        if (!this.context || this.dados.length < 30) {
            for (let i = 0; i < quantidade; i++) {
                const numeros = this.gerarAleatorio(this.config.numerosPadrao, seed + i);
                const jogo = this.criarJogo(numeros, seed + i);
                jogos.push(jogo);
            }

            return {
                games: jogos,
                confidence: 20,
                engineName: this.getNome(),
                explanation: ['🔮 Dados insuficientes para predição']
            };
        }

        const patterns = this.context.patterns;
        const frequency = this.context.frequency;
        const delay = this.context.delay;

        for (let i = 0; i < quantidade; i++) {
            const numeros = this.gerarNumerosPreditivos(
                patterns,
                frequency,
                delay,
                seed + i
            );
            
            const jogo = this.criarJogo(numeros, seed + i, [
                '🔮 Baseado em padrões históricos',
                '📊 Predição de tendências'
            ]);
            
            jogos.push(jogo);
        }

        const confianca = this.confidenceCalc.calcularCompleta(
            this.dados,
            ['frequencia', 'padroes']
        );

        return {
            games: jogos,
            confidence: Math.min(confianca.confianca + 5, 85),
            engineName: this.getNome(),
            explanation: [
                `🔮 ${this.dados.length} concursos analisados`,
                `🎯 Confiança: ${confianca.confianca.toFixed(0)}%`,
                `📊 ${patterns.getMelhoresPadroes(5).length} padrões detectados`
            ]
        };
    }

    private gerarNumerosPreditivos(
        patterns: PatternAnalyzer,
        frequency: FrequencyAnalyzer,
        delay: DelayAnalyzer,
        seed: number
    ): number[] {
        const quantidade = this.config.numerosPadrao;
        const min = this.config.incluirZero ? 0 : 1;
        const max = this.config.maxNumero;
        const numeros = new Set<number>();

        const melhoresPadroes = patterns.getMelhoresPadroes(10);
        const padroesNumeros = new Set<number>();
        for (const padrao of melhoresPadroes) {
            const nums = patterns.gerarNumerosPorPadrao(padrao, 5, max);
            for (const n of nums) {
                padroesNumeros.add(n);
            }
        }

        const scores: { numero: number; score: number }[] = [];

        for (let i = min; i <= max; i++) {
            const freqScore = frequency.getFrequenciaNormalizada(i) / 100;
            const delayScore = delay.getAtrasoNormalizado(i) / 100;
            const padraoScore = padroesNumeros.has(i) ? 0.9 : 0.1;

            const score = (
                freqScore * 0.3 +
                delayScore * 0.2 +
                padraoScore * 0.5
            ) * 100;

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
