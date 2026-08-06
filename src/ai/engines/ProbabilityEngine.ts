// ============================================
// CAMINHO: src/ai/engines/ProbabilityEngine.ts
// DATA CRIAÇÃO: 2026-01-20
// STATUS: ⏳ PENDENTE APROVAÇÃO
// VERSÃO: 2.0.0 (COM NOVA ARQUITETURA)
// ============================================
// 
// SEÇÃO 1: IMPORTS
// SEÇÃO 2: PROBABILITY ENGINE
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
import { ProbabilityAnalyzer } from '../analysis/ProbabilityAnalyzer';
import { ConfidenceCalculator } from '../evaluation/ConfidenceCalculator';
import { ScoreItem } from '../types';

// ============================================
// SEÇÃO 2: PROBABILITY ENGINE
// ============================================

/**
 * Motor de IA Probabilística ⭐ PRO
 * 
 * Responsabilidade:
 * - Aplicar distribuição binomial
 * - Calcular entropia e variância
 * - Combinar probabilidade com frequência
 * 
 * Fluxo:
 * 1. Obtém dados de probabilidade e frequência
 * 2. Calcula score combinado (probabilidade + frequência)
 * 3. Chama selecionarNumeros() da BaseEngine
 * 4. Retorna jogos com explicações
 * 
 * Características:
 * - Exclusivo para assinantes PRO
 * - Requer mínimo de 20 concursos
 * - Base matemática sólida (binomial, entropia, variância)
 * 
 * @throws Error se dados forem insuficientes ou dependências não inicializadas
 * 
 * @example
 * ```typescript
 * const engine = new ProbabilityEngine(dados, config, true, extras);
 * const result = engine.gerarJogos(5, 12345);
 * ```
 */
export class ProbabilityEngine extends BaseEngine {
    /**
     * Calculadora de confiança
     */
    private confidenceCalc: ConfidenceCalculator;

    /**
     * Número mínimo de concursos para operar
     */
    private readonly MIN_DRAWS = 20;

    /**
     * Pesos para o cálculo do score
     * 
     * A Probability Engine combina:
     * - Probabilidade: 60% (binomial, entropia, variância)
     * - Frequência: 40% (histórico de aparições)
     */
    private weights = {
        probabilidade: 0.60,
        frequencia: 0.40
    };

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
        return '📈 IA Probabilística ⭐ PRO';
    }

    getDescricao(): string {
        return 'Distribuição binomial, entropia e variância';
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
        // OBTÉM ANALISADORES COM VALIDAÇÃO
        // ============================================
        const probability = this.obterProbability();
        const frequency = this.obterFrequency();

        // ============================================
        // CALCULA SCORES (DETERMINÍSTICO - SEM SEED)
        // ============================================
        const scores = this.calcularScores(probability, frequency);

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
                '📈 Baseado em distribuição binomial',
                '📊 Entropia e variância calculadas'
            ]);
            
            jogos.push(jogo);
            jogosGerados.push(numeros);
        }

        // ============================================
        // CALCULA CONFIANÇA
        // ============================================
        const confianca = this.confidenceCalc.calcularCompleta(
            this.dados,
            ['frequencia', 'probabilidade']
        );

        // Aplica boost de confiança para análise probabilística
        const confidenceBoost = 10;
        const confidenceFinal = Math.min(confianca.confianca + confidenceBoost, 90);

        return {
            games: jogos,
            confidence: confidenceFinal,
            engineName: this.getNome(),
            explanation: [
                `📈 ${this.dados.length} concursos analisados`,
                `🎯 Confiança: ${confidenceFinal.toFixed(0)}%`,
                `📊 Entropia: ${probability.getEntropia().toFixed(3)}`,
                `📊 Variância: ${probability.getVariancia().toFixed(3)}`
            ]
        };
    }

    // ============================================
    // SEÇÃO 4: CÁLCULO DE SCORES
    // ============================================

    /**
     * Calcula scores probabilísticos para todos os números
     * 
     * ⚠️ Este método é DETERMINÍSTICO.
     * A mesma entrada produz a mesma saída.
     * A aleatoriedade é introduzida apenas na seleção.
     * 
     * @param probability - Analisador de probabilidade
     * @param frequency - Analisador de frequência
     * @returns Lista de scores
     */
    private calcularScores(
        probability: ProbabilityAnalyzer,
        frequency: FrequencyAnalyzer
    ): ScoreItem[] {
        const min = this.config.incluirZero ? 0 : 1;
        const max = this.config.maxNumero;
        const scores: ScoreItem[] = [];

        // ============================================
        // CALCULA SCORE PARA CADA NÚMERO
        // ============================================
        for (let i = min; i <= max; i++) {
            // Obtém valores
            // Probabilidade já está em escala 0-1
            const probScore = probability.getProbabilidade(i);
            
            // Frequência normalizada (0-100) convertida para 0-1
            const freqScore = frequency.getFrequenciaNormalizada(i) / 100;

            // Aplica pesos (soma = 1)
            const score = (
                probScore * this.weights.probabilidade +
                freqScore * this.weights.frequencia
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
                '[ProbabilityEngine] Dados históricos não carregados.'
            );
        }
    }

    /**
     * Valida se o usuário tem permissão PRO
     */
    private validarPro(): void {
        if (!this.isPro) {
            throw new Error(
                '[ProbabilityEngine] Motor exclusivo para assinantes PRO.'
            );
        }
    }

    /**
     * Valida contexto antes de gerar jogos
     */
    private validarContexto(): void {
        if (!this.context) {
            throw new Error(
                '[ProbabilityEngine] StatisticsContext não foi inicializado. ' +
                `Dados disponíveis: ${this.dados?.length || 0} concursos.`
            );
        }
    }

    /**
     * Valida quantidade de dados (mínimo 20 concursos)
     */
    private validarDadosSuficientes(): void {
        if (this.dados.length < this.MIN_DRAWS) {
            throw new Error(
                `[ProbabilityEngine] Dados insuficientes: ${this.dados.length} concursos. ` +
                `Mínimo esperado: ${this.MIN_DRAWS} concursos para análise probabilística.`
            );
        }
    }

    /**
     * Valida quantidade de jogos
     */
    private validarQuantidade(quantidade: number): void {
        if (quantidade <= 0) {
            throw new Error(
                `[ProbabilityEngine] Quantidade inválida: ${quantidade}. ` +
                'Deve ser maior que 0.'
            );
        }

        if (quantidade > 100) {
            throw new Error(
                `[ProbabilityEngine] Quantidade excede o limite: ${quantidade}. ` +
                'Máximo permitido: 100 jogos por chamada.'
            );
        }
    }

    // ============================================
    // MÉTODOS DE OBTENÇÃO DE ANALISADORES
    // ============================================

    /**
     * Obtém ProbabilityAnalyzer com validação
     */
    private obterProbability(): ProbabilityAnalyzer {
        if (!this.context) {
            throw new Error(
                '[ProbabilityEngine] StatisticsContext indisponível ao obter ProbabilityAnalyzer.'
            );
        }

        if (!this.context.probability) {
            throw new Error(
                '[ProbabilityEngine] ProbabilityAnalyzer não foi inicializado.'
            );
        }

        return this.context.probability;
    }

    /**
     * Obtém FrequencyAnalyzer com validação
     */
    private obterFrequency(): FrequencyAnalyzer {
        if (!this.context) {
            throw new Error(
                '[ProbabilityEngine] StatisticsContext indisponível ao obter FrequencyAnalyzer.'
            );
        }

        if (!this.context.frequency) {
            throw new Error(
                '[ProbabilityEngine] FrequencyAnalyzer não foi inicializado.'
            );
        }

        return this.context.frequency;
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
                `[ProbabilityEngine] Soma dos pesos é ${soma.toFixed(3)}, esperado 1.`
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
     * Obtém a entropia atual da distribuição
     */
    getEntropia(): number {
        if (!this.context || !this.context.probability) {
            throw new Error(
                '[ProbabilityEngine] ProbabilityAnalyzer indisponível para obter entropia.'
            );
        }
        return this.context.probability.getEntropia();
    }

    /**
     * Obtém a variância atual da distribuição
     */
    getVariancia(): number {
        if (!this.context || !this.context.probability) {
            throw new Error(
                '[ProbabilityEngine] ProbabilityAnalyzer indisponível para obter variância.'
            );
        }
        return this.context.probability.getVariancia();
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

export default ProbabilityEngine;
