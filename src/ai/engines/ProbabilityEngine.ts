// ============================================
// CAMINHO: src/ai/engines/ProbabilityEngine.ts
// ============================================

import { BaseEngine, EngineConfig, EngineExtras, EngineResult, JogoGerado } from './BaseEngine';
import { ProbabilityAnalyzer } from '../analysis/ProbabilityAnalyzer';
import { FrequencyAnalyzer } from '../analysis/FrequencyAnalyzer';
import { ConfidenceCalculator } from '../evaluation/ConfidenceCalculator';

export class ProbabilityEngine extends BaseEngine {
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
        return '📈 IA Probabilística ⭐ PRO';
    }

    getDescricao(): string {
        return 'Distribuição binomial, entropia e variância';
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

        if (!this.context || this.dados.length < 20) {
            for (let i = 0; i < quantidade; i++) {
                const numeros = this.gerarAleatorio(this.config.numerosPadrao, seed + i);
                const jogo = this.criarJogo(numeros, seed + i);
                jogos.push(jogo);
            }

            return {
                games: jogos,
                confidence: 25,
                engineName: this.getNome(),
                explanation: ['📈 Dados insuficientes para probabilidade']
            };
        }

        const probability = this.context.probability;
        const frequency = this.context.frequency;

        for (let i = 0; i < quantidade; i++) {
            const numeros = this.gerarNumerosProbabilisticos(
                probability,
                frequency,
                seed + i
            );
            
            const jogo = this.criarJogo(numeros, seed + i, [
                '📈 Baseado em distribuição binomial',
                '📊 Entropia e variância calculadas'
            ]);
            
            jogos.push(jogo);
        }

        const confianca = this.confidenceCalc.calcularCompleta(
            this.dados,
            ['frequencia', 'probabilidade']
        );

        return {
            games: jogos,
            confidence: Math.min(confianca.confianca + 10, 90),
            engineName: this.getNome(),
            explanation: [
                `📈 ${this.dados.length} concursos analisados`,
                `🎯 Confiança: ${confianca.confianca.toFixed(0)}%`,
                `📊 Entropia: ${probability.getEntropia().toFixed(3)}`
            ]
        };
    }

    private gerarNumerosProbabilisticos(
        probability: ProbabilityAnalyzer,
        frequency: FrequencyAnalyzer,
        seed: number
    ): number[] {
        const quantidade = this.config.numerosPadrao;
        const min = this.config.incluirZero ? 0 : 1;
        const max = this.config.maxNumero;
        const numeros = new Set<number>();

        const scores: { numero: number; score: number }[] = [];

        for (let i = min; i <= max; i++) {
            const prob = probability.getProbabilidade(i);
            const freq = frequency.getFrequenciaNormalizada(i) / 100;
            const score = (prob * 0.6 + freq * 0.4) * 100;
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
