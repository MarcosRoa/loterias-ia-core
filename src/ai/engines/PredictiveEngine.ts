// ============================================
// CAMINHO: src/ai/engines/PredictiveEngine.ts
// DATA CRIAÇÃO: 2026-01-20
// STATUS: ⏳ PENDENTE APROVAÇÃO
// VERSÃO: 2.1.0 (VERSÃO REVISADA)
// ============================================
// 
// SEÇÃO 1: IMPORTS
// SEÇÃO 2: PREDICTIVE ENGINE
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
import { PatternAnalyzer } from '../analysis/PatternAnalyzer';
import { ConfidenceCalculator } from '../evaluation/ConfidenceCalculator';
import { ScoreItem } from '../types';

// ============================================
// SEÇÃO 2: PREDICTIVE ENGINE
// ============================================

/**
 * Motor de IA Preditiva ⭐ PRO
 * 
 * Responsabilidade:
 * - Detectar padrões históricos
 * - Tentar prever os próximos números
 * - Foco em tendências e repetições
 * 
 * Fluxo:
 * 1. Obtém dados de frequência, atraso e padrões
 * 2. Calcula score com ênfase em padrões (determinístico)
 * 3. Chama selecionarNumeros() da BaseEngine
 * 4. Retorna jogos com explicações
 * 
 * Características:
 * - Exclusivo para assinantes PRO
 * - Requer mínimo de 30 concursos
 * - Ênfase em padrões detectados
 * - Score é determinístico (não depende de seed)
 * 
 * @throws Error se dados forem insuficientes ou dependências não inicializadas
 * 
 * @example
 * ```typescript
 * const engine = new PredictiveEngine(dados, config, true, extras);
 * const result = engine.gerarJogos(5, 12345);
 * ```
 */
export class PredictiveEngine extends BaseEngine {
    /**
     * Calculadora de confiança
     */
    private confidenceCalc: ConfidenceCalculator;

    /**
     * Número mínimo de concursos para operar
     */
    private readonly MIN_DRAWS = 30;

    /**
     * Pesos para o cálculo do score
     * 
     * A Predictive Engine dá ênfase a padrões:
     * - Padrão: 50% (principal fator)
     * - Frequência: 25%
     * - Atraso: 25%
     */
    private weights = {
        padrao: 0.50,
        frequencia: 0.25,
        atraso: 0.25
    };

    /**
     * Número de padrões a considerar
     */
    private topPatternsCount: number = 10;

    /**
     * Quantos números gerar por padrão
     */
    private numbersPerPattern: number = 5;

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
        this.validarPro();
    }

    // ============================================
    // SEÇÃO 3: MÉTODO GERAR JOGOS
    // ============================================

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
        // ============================================
        // VALIDAÇÕES EXPLÍCITAS - SEM FALLBACK
        // ============================================
        this.validarPro();
        this.validarContexto();
        this.validarQuantidade(quantidade);
        this.validarDadosSuficientes();

        // ============================================
        // PARÂMETROS
        // ============================================
        if (params.topPatternsCount !== undefined) {
            this.topPatternsCount = params.topPatternsCount;
        }
        if (params.numbersPerPattern !== undefined) {
            this.numbersPerPattern = params.numbersPerPattern;
        }

        // ============================================
        // OBTÉM ANALISADORES COM VALIDAÇÃO
        // ============================================
        const frequency = this.obterFrequency();
        const delay = this.obterDelay();
        const patterns = this.obterPatterns();

        // ============================================
        // CALCULA SCORES (DETERMINÍSTICO - SEM SEED)
        // ============================================
        const scores = this.calcularScores(frequency, delay, patterns);

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
                '🔮 Baseado em padrões históricos',
                '📊 Predição de tendências'
            ]);
            
            jogos.push(jogo);
            jogosGerados.push(numeros);
        }

        // ============================================
        // CALCULA CONFIANÇA
        // ============================================
        const confianca = this.confidenceCalc.calcularCompleta(
            this.dados,
            ['frequencia', 'atraso', 'padroes']
        );

        return {
            games: jogos,
            confidence: Math.min(confianca.confianca + 5, 85),
            engineName: this.getNome(),
            explanation: [
                `🔮 ${this.dados.length} concursos analisados`,
                `🎯 Confiança: ${(confianca.confianca + 5).toFixed(0)}%`,
                `📊 ${this.topPatternsCount} padrões detectados`
            ]
        };
    }

    // ============================================
    // SEÇÃO 4: CÁLCULO DE SCORES
    // ============================================

    /**
     * Calcula scores preditivos para todos os números
     * 
     * ⚠️ Este método é DETERMINÍSTICO.
     * A mesma entrada produz a mesma saída.
     * A aleatoriedade é introduzida apenas na seleção.
     * 
     * @param frequency - Analisador de frequência
     * @param delay - Analisador de atraso
     * @param patterns - Analisador de padrões
     * @returns Lista de scores
     */
    private calcularScores(
        frequency: FrequencyAnalyzer,
        delay: DelayAnalyzer,
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
            
            // Score de padrão: 0.9 se está nos padrões, 0.1 caso contrário
            const padraoScore = padroesNumeros.has(i) ? 0.9 : 0.1;

            // Aplica pesos (soma = 1)
            const score = (
                padraoScore * this.weights.padrao +
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
                '[PredictiveEngine] Dados históricos não carregados.'
            );
        }
    }

    /**
     * Valida se o usuário tem permissão PRO
     */
    private validarPro(): void {
        if (!this.isPro) {
            throw new Error(
                '[PredictiveEngine] Motor exclusivo para assinantes PRO.'
            );
        }
    }

    /**
     * Valida contexto antes de gerar jogos
     */
    private validarContexto(): void {
        if (!this.context) {
            throw new Error(
                '[PredictiveEngine] StatisticsContext não foi inicializado. ' +
                `Dados disponíveis: ${this.dados?.length || 0} concursos.`
            );
        }
    }

    /**
     * Valida quantidade de dados (mínimo 30 concursos)
     */
    private validarDadosSuficientes(): void {
        if (this.dados.length < this.MIN_DRAWS) {
            throw new Error(
                `[PredictiveEngine] Dados insuficientes: ${this.dados.length} concursos. ` +
                `Mínimo esperado: ${this.MIN_DRAWS} concursos para predição confiável.`
            );
        }
    }

    /**
     * Valida quantidade de jogos
     */
    private validarQuantidade(quantidade: number): void {
        if (quantidade <= 0) {
            throw new Error(
                `[PredictiveEngine] Quantidade inválida: ${quantidade}. ` +
                'Deve ser maior que 0.'
            );
        }

        if (quantidade > 100) {
            throw new Error(
                `[PredictiveEngine] Quantidade excede o limite: ${quantidade}. ` +
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
                '[PredictiveEngine] StatisticsContext indisponível ao obter FrequencyAnalyzer.'
            );
        }

        if (!this.context.frequency) {
            throw new Error(
                '[PredictiveEngine] FrequencyAnalyzer não foi inicializado.'
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
                '[PredictiveEngine] StatisticsContext indisponível ao obter DelayAnalyzer.'
            );
        }

        if (!this.context.delay) {
            throw new Error(
                '[PredictiveEngine] DelayAnalyzer não foi inicializado.'
            );
        }

        return this.context.delay;
    }

    /**
     * Obtém PatternAnalyzer com validação
     */
    private obterPatterns(): PatternAnalyzer {
        if (!this.context) {
            throw new Error(
                '[PredictiveEngine] StatisticsContext indisponível ao obter PatternAnalyzer.'
            );
        }

        if (!this.context.patterns) {
            throw new Error(
                '[PredictiveEngine] PatternAnalyzer não foi inicializado.'
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
                `[PredictiveEngine] Soma dos pesos é ${soma.toFixed(3)}, esperado 1.`
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
     * Define quantos padrões considerar
     */
    setTopPatternsCount(count: number): void {
        if (count < 1) {
            throw new Error(
                `[PredictiveEngine] Número de padrões inválido: ${count}. Deve ser >= 1.`
            );
        }
        this.topPatternsCount = count;
    }

    /**
     * Define quantos números gerar por padrão
     */
    setNumbersPerPattern(count: number): void {
        if (count < 1) {
            throw new Error(
                `[PredictiveEngine] Números por padrão inválido: ${count}. Deve ser >= 1.`
            );
        }
        this.numbersPerPattern = count;
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

export { PredictiveEngine };
export default PredictiveEngine;
