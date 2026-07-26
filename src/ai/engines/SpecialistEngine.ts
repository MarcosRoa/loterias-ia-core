// ============================================
// CAMINHO: src/ai/engines/SpecialistEngine.ts
// ============================================

import { BaseEngine, EngineConfig, EngineExtras, EngineResult, JogoGerado } from './BaseEngine';
import { FrequencyAnalyzer } from '../analysis/FrequencyAnalyzer';
import { DelayAnalyzer } from '../analysis/DelayAnalyzer';
import { DispersionAnalyzer } from '../analysis/DispersionAnalyzer';
import { PatternAnalyzer } from '../analysis/PatternAnalyzer';
import { ConfidenceCalculator } from '../evaluation/ConfidenceCalculator';
import { GameEvaluator } from '../evaluation/GameEvaluator';

export class SpecialistEngine extends BaseEngine {
    private confidenceCalc: ConfidenceCalculator;
    private evaluator: GameEvaluator;

    // ✅ ÚNICA MODIFICAÇÃO: CONSTRUTOR COM 4 ARGUMENTOS
    constructor(
        dados: number[][],
        config: EngineConfig,
        isPro: boolean = false,
        extras?: EngineExtras
    ) {
        super(dados, config, isPro, extras);
        this.confidenceCalc = new ConfidenceCalculator();
        this.evaluator = new GameEvaluator(config.maxNumero, config.numerosPadrao);
    }

    getNome(): string {
        return '🎯 IA Especialista';
    }

    getDescricao(): string {
        return 'Avalia e seleciona os melhores jogos';
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
        const patterns = this.context.patterns;

        dispersion.setWindowSize(dispersao);

        const candidatos = quantidade * 5;
        const candidatosList: { numeros: number[]; score: number }[] = [];

        for (let i = 0; i < candidatos; i++) {
            const numeros = this.gerarNumerosEspecialista(
                frequency,
                delay,
                dispersion,
                patterns,
                seed + i
            );
            
            const score = this.evaluator.avaliarJogo(numeros);
            candidatosList.push({ numeros, score: score.pontuacao || 0 });
        }

        candidatosList.sort((a, b) => b.score - a.score);
        const selecionados = candidatosList.slice(0, quantidade);

        for (const item of selecionados) {
            const jogo = this.criarJogo(item.numeros, seed, [
                '🎯 Selecionado entre múltiplos candidatos',
                `📊 Score: ${item.score.toFixed(0)}%`
            ]);
            jogos.push(jogo);
        }

        const confianca = this.confidenceCalc.calcularCompleta(
            this.dados,
            ['frequencia', 'atraso', 'dispersao', 'padroes']
        );

        return {
            games: jogos,
            confidence: confianca.confianca,
            engineName: this.getNome(),
            explanation: [
                `🎯 ${this.dados.length} concursos analisados`,
                `📊 ${candidatos} candidatos avaliados`,
                `🎯 Confiança: ${confianca.confianca.toFixed(0)}%`
            ]
        };
    }

    private gerarNumerosEspecialista(
        frequency: FrequencyAnalyzer,
        delay: DelayAnalyzer,
        dispersion: DispersionAnalyzer,
        patterns: PatternAnalyzer,
        seed: number
    ): number[] {
        const quantidade = this.config.numerosPadrao;
        const min = this.config.incluirZero ? 0 : 1;
        const max = this.config.maxNumero;
        const numeros = new Set<number>();
        const scores: { numero: number; score: number }[] = [];

        const melhoresPadroes = patterns.getMelhoresPadroes(3);
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
            const padraoScore = padroesNumeros.has(i) ? 0.9 : 0.1;

            const score = (
                freqScore * 0.4 +
                delayScore * 0.3 +
                padraoScore * 0.3
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
