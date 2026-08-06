// ============================================
// CAMINHO: src/ai/engines/AggressiveEngine.ts
// DATA CRIAÇÃO: 2026-01-20
// STATUS: ⏳ PENDENTE APROVAÇÃO
// VERSÃO: 1.0.0
// ============================================
// 
// SEÇÃO 1: IMPORTS
// SEÇÃO 2: AGGRESSIVE ENGINE
// SEÇÃO 3: MÉTODO GERAR JOGOS
// SEÇÃO 4: CÁLCULO DE SCORES
// SEÇÃO 5: EXPORTS
// ============================================

// ============================================
// SEÇÃO 1: IMPORTS
// ============================================

import {
    BaseEngine,
    EngineConfig,
    EngineExtras,
    EngineResult,
    JogoGerado
} from './BaseEngine';

import { FrequencyAnalyzer } from '../analysis/FrequencyAnalyzer';
import { DelayAnalyzer } from '../analysis/DelayAnalyzer';
import { ProbabilityAnalyzer } from '../analysis/ProbabilityAnalyzer';
import { PatternAnalyzer } from '../analysis/PatternAnalyzer';
import { ConfidenceCalculator } from '../evaluation/ConfidenceCalculator';
import { ScoreItem } from '../types';

// ============================================
// SEÇÃO 2: AGGRESSIVE ENGINE
// ============================================

/**
 * Motor de IA Agressiva
 * 
 * Responsabilidade:
 * - Focar em padrões e probabilidades
 * - Buscar tendências emergentes
 * - Priorizar números com maior potencial preditivo
 * - Abordagem mais arriscada e exploratória
 * 
 * Fluxo:
 * 1. Obtém dados de múltiplos analisadores
 * 2. Calcula score com ênfase em padrões e probabilidades
 * 3. Chama selecionarNumeros() da BaseEngine
 * 4. Retorna jogos com explicações
 * 
 * Características:
 * - Maior peso em padrões (40%)
 * - Maior peso em probabilidade (30%)
 * - Menor peso em frequência e atraso
 * - Abordagem agressiva e exploratória
 * 
 * @throws Error se dados forem insuficientes ou dependências não inicializadas
 * 
 * @example
 * ```typescript
 * const engine = new AggressiveEngine(dados, config, isPro, extras);
 * const result = engine.gerarJogos(5, 12345);
 * ```
 */
export class AggressiveEngine extends BaseEngine {
    /**
     * Calculadora de confiança
     */
    private confidenceCalc: ConfidenceCalculator;

    /**
     * Número mínimo de concursos para operar
     */
    private readonly MIN_DRAWS = 25;

    /**
     * Pesos para o cálculo do score
     * 
     * A Aggressive Engine dá ênfase a padrões e probabilidades:
     * - Padrão: 40% (principal fator)
     * - Probabilidade: 30%
     * - Frequência: 20%
     * - Atraso: 10%
     */
    private weights = {
        padrao: 0.40,
        probabilidade: 0.30,
        frequencia: 0.20,
        atraso: 0.10
    };

    /**
     * Quantos números gerar por padrão
     */
    private numbersPerPattern: number = 5;

    /**
     * Quantos padrões considerar
     */
    private topPatternsCount: number = 8;

    constructor(
        dados: number[][],
        config: EngineConfig,
        isPro: boolean = false,
        extras?: EngineExtras
    ) {
        super(dados, config, isPro, extras);
        this.confidenceCalc = new ConfidenceCalculator();
        
        // Validação inicial
        this.validarDependencias();
    }

    // ============================================
    // SEÇÃO 3: MÉTODO GERAR JOGOS
    // ============================================

    getNome(): string {
        return '🔥 IA Agressiva';
    }

    getDescricao(): string {
        return 'Foca em padrões e probabilidades, busca tendências emergentes';
    }

    gerarJogos(quantidade: number, seed: number, params: any = {}): EngineResult {
        // ============================================
        // VALIDAÇÕES EXPLÍCITAS - SEM FALLBACK
        // ============================================
        this.validarContexto();
        this.validarQuantidade(quantidade);
        this.validarDadosSuficientes();

        // ============================================
        // PARÂMETROS
        // ============================================
        if (params.numbersPerPattern !== undefined) {
            this.numbersPerPattern = params.numbersPerPattern;
        }
        if (params.topPatternsCount !== undefined) {
            this.topPatternsCount = params.topPatternsCount;
        }

        // ============================================
        // OBTÉM ANALISADORES COM VALIDAÇÃO
        // ============================================
        const frequency = this.obterFrequency();
        const delay = this.obterDelay();
        const probability = this.obterProbability();
        const patterns = this.obterPatterns();

        // ============================================
        // CALCULA SCORES (DETERMINÍSTICO - SEM SEED)
        // ============================================
        const scores = this.calcularScores(
            frequency,
            delay,
            probability,
            patterns
        );

        // ============================================
        // GERA SEEDS DETERMINÍSTICAS
        // ============================================
        const seeds = this.gerarSeeds(quantidade, seed);

        // ============================================
        // GERA JOGOS
        // ============================================
        const jogos: JogoGerado[] = [];
        let jogosGerados: number[][] = [];

        for (let i = 0; i < quantidade; i++) {
            // Seleciona números usando a nova arquitetura
            const numeros = this.selecionarNumeros(
                scores,
                this.config.numerosPadrao,
                seeds[i],
                jogosGerados
            );

            // Cria o jogo
            const jogo = this.criarJogo(numeros, seeds[i], [
                '🔥 Baseado em padrões e probabilidades',
                '📊 Foco em tendências emergentes'
            ]);
            
            jogos.push(jogo);
            jogosGerados.push(numeros);
        }

        // ============================================
        // CALCULA CONFIANÇA
        // ============================================
        const confianca = this.confidenceCalc.calcularCompleta(
            this.dados,
            ['frequencia', 'atraso', 'probabilidade', 'padroes']
        );

        return {
            games: jogos,
            confidence: confianca.confianca,
            engineName: this.getNome(),
            explanation: [
                `🔥 ${this.dados.length} concursos analisados`,
                `🎯 Confiança: ${confianca.confianca.toFixed(0)}%`,
                `📊 ${this.topPatternsCount} padrões detectados`
            ]
        };
    }

    // ============================================
    // SEÇÃO 4: CÁLCULO DE SCORES
    // ============================================

    /**
     * Calcula scores agressivos para todos os números
     * 
     * ⚠️ Este método é DETERMINÍSTICO.
     * A mesma entrada produz a mesma saída.
     * A aleatoriedade é introduzida apenas na seleção.
     * 
     * @param frequency - Analisador de frequência
     * @param delay - Analisador de atraso
     * @param probability - Analisador de probabilidade
     * @param patterns - Analisador de padrões
     * @returns Lista de scores
     */
    private calcularScores(
        frequency: FrequencyAnalyzer,
        delay: DelayAnalyzer,
        probability: ProbabilityAnalyzer,
        patterns: PatternAnalyzer
    ): ScoreItem[] {
        const min = this.config.incluirZero ? 0 : 1;
        const max = this.config.maxNumero;
        const scores: ScoreItem[] = [];

        // ============================================
        // OBTÉM NÚMEROS DOS MELHORES PADRÕES
        // ============================================
        const melhoresPadroes = patterns.getMelhoresPadroes(this.topPatternsCount);
        const padroesNumeros = new Set<number>();
        
        for (const padrao of melhoresPadroes) {
            const nums = patterns.gerarNumerosPorPadrao(
                padrao,
                this.numbersPerPattern,
                max
            );
            for (const n of nums) {
                padroesNumeros.add(n);
            }
        }

        // ============================================
        // CALCULA SCORE PARA CADA NÚMERO
        // ============================================
        for (let i = min; i <= max; i++) {
            // Obtém valores normalizados (0-1)
            const freqScore = frequency.getFrequenciaNormalizada(i) / 100;
            const delayScore = delay.getAtrasoNormalizado(i) / 100;
            const probScore = probability.getProbabilidade(i) * 2; // Ajuste para escala 0-1
            const padraoScore = padroesNumeros.has(i) ? 0.9 : 0.1;

            // Aplica pesos (soma = 1)
            const score = (
                padraoScore * this.weights.padrao +
                probScore * this.weights.probabilidade +
                freqScore * this.weights.frequencia +
                delayScore * this.weights.atraso
            );

            scores.push({
                numero: i,
                score: Math.max(0, Math.min(1, score)) // Garante [0, 1]
            });
        }

        return scores;
    }

    // ============================================
    // MÉTODOS DE VALIDAÇÃO
    // ============================================

    /**
     * Valida dependências no construtor
     */
    private validarDependencias(): void {
        if (!this.dados) {
            throw new Error(
                '[AggressiveEngine] Dados históricos não carregados.'
            );
        }
    }

    /**
     * Valida contexto antes de gerar jogos
     */
    private validarContexto(): void {
        if (!this.context) {
            throw new Error(
                '[AggressiveEngine] StatisticsContext não foi inicializado. ' +
                `Dados disponíveis: ${this.dados?.length || 0} concursos.`
            );
        }
    }

    /**
     * Valida quantidade de dados (mínimo 25 concursos)
     */
    private validarDadosSuficientes(): void {
        if (this.dados.length < this.MIN_DRAWS) {
            throw new Error(
                `[AggressiveEngine] Dados insuficientes: ${this.dados.length} concursos. ` +
                `Mínimo esperado: ${this.MIN_DRAWS} concursos para análise agressiva.`
            );
        }
    }

    /**
     * Valida quantidade de jogos
     */
    private validarQuantidade(quantidade: number): void {
        if (quantidade <= 0) {
            throw new Error(
                `[AggressiveEngine] Quantidade inválida: ${quantidade}. ` +
                'Deve ser maior que 0.'
            );
        }

        if (quantidade > 100) {
            throw new Error(
                `[AggressiveEngine] Quantidade excede o limite: ${quantidade}. ` +
                'Máximo permitido: 100 jogos por chamada.'
            );
        }
    }

    // ============================================
    // MÉTODOS DE OBTENÇÃO DE ANALISADORES
    // ============================================

    /**
     * Obtém FrequencyAnalyzer com validação
     */
    private obterFrequency(): FrequencyAnalyzer {
        if (!this.context) {
            throw new Error(
                '[AggressiveEngine] StatisticsContext indisponível ao obter FrequencyAnalyzer.'
            );
        }

        if (!this.context.frequency) {
            throw new Error(
                '[AggressiveEngine] FrequencyAnalyzer não foi inicializado.'
            );
        }

        return this.context.frequency;
    }

    /**
     * Obtém DelayAnalyzer com validação
     */
    private obterDelay(): DelayAnalyzer {
        if (!this.context) {
            throw new Error(
                '[AggressiveEngine] StatisticsContext indisponível ao obter DelayAnalyzer.'
            );
        }

        if (!this.context.delay) {
            throw new Error(
                '[AggressiveEngine] DelayAnalyzer não foi inicializado.'
            );
        }

        return this.context.delay;
    }

    /**
     * Obtém ProbabilityAnalyzer com validação
     */
    private obterProbability(): ProbabilityAnalyzer {
        if (!this.context) {
            throw new Error(
                '[AggressiveEngine] StatisticsContext indisponível ao obter ProbabilityAnalyzer.'
            );
        }

        if (!this.context.probability) {
            throw new Error(
                '[AggressiveEngine] ProbabilityAnalyzer não foi inicializado.'
            );
        }

        return this.context.probability;
    }

    /**
     * Obtém PatternAnalyzer com validação
     */
    private obterPatterns(): PatternAnalyzer {
        if (!this.context) {
            throw new Error(
                '[AggressiveEngine] StatisticsContext indisponível ao obter PatternAnalyzer.'
            );
        }

        if (!this.context.patterns) {
            throw new Error(
                '[AggressiveEngine] PatternAnalyzer não foi inicializado.'
            );
        }

        return this.context.patterns;
    }

    // ============================================
    // MÉTODOS DE CONFIGURAÇÃO
    // ============================================

    /**
     * Atualiza os pesos do score
     * 
     * Nota: A soma dos pesos deve ser 1
     */
    setWeights(weights: Partial<typeof this.weights>): void {
        const novosPesos = {
            ...this.weights,
            ...weights
        };

        // Valida soma dos pesos
        const soma = Object.values(novosPesos).reduce((acc, val) => acc + val, 0);
        if (Math.abs(soma - 1) > 0.001) {
            throw new Error(
                `[AggressiveEngine] Soma dos pesos é ${soma.toFixed(3)}, esperado 1.`
            );
        }

        this.weights = novosPesos;
    }

    /**
     * Obtém os pesos atuais
     */
    getWeights(): typeof this.weights {
        return { ...this.weights };
    }

    /**
     * Define quantos números gerar por padrão
     */
    setNumbersPerPattern(count: number): void {
        if (count < 1) {
            throw new Error(
                `[AggressiveEngine] Números por padrão inválido: ${count}. Deve ser >= 1.`
            );
        }
        this.numbersPerPattern = count;
    }

    /**
     * Define quantos padrões considerar
     */
    setTopPatternsCount(count: number): void {
        if (count < 1) {
            throw new Error(
                `[AggressiveEngine] Número de padrões inválido: ${count}. Deve ser >= 1.`
            );
        }
        this.topPatternsCount = count;
    }

    /**
     * Valida se os pesos são válidos
     */
    validarPesos(): boolean {
        const soma = Object.values(this.weights).reduce((acc, val) => acc + val, 0);
        return Math.abs(soma - 1) < 0.001;
    }
}

// ============================================
// SEÇÃO 5: EXPORTS
// ============================================

export { AggressiveEngine };
export default AggressiveEngine;
