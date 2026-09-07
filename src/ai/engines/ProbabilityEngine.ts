// ============================================
// CAMINHO: src/ai/engines/ProbabilityEngine.ts
// DATA CRIAÇÃO: 07/09/2026
// STATUS: ⏳ PENDENTE APROVAÇÃO
// VERSÃO: 2.1.1 (INTEGRAÇÃO COM ENGINE LEARNING BRIDGE)
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

import { ProbabilityAnalyzer } from '../analysis/ProbabilityAnalyzer';
import { ConfidenceCalculator } from '../evaluation/ConfidenceCalculator';
import { ScoreItem } from '../types';
import { EngineLearningBridge, ProbabilityLearningContext } from '../services/EngineLearningBridge';

// ============================================
// SEÇÃO 2: PROBABILITY ENGINE
// ============================================

/**
 * Motor de IA Probabilística ⭐ PRO
 * 
 * Responsabilidade:
 * - Aplicar distribuição binomial
 * - Calcular entropia e variância
 * - Aplicar distribuição probabilística calibrada pelo cérebro adaptativo
 * 
 * Fluxo:
 * 1. Obtém a distribuição probabilística histórica
 * 2. Recalibra a distribuição com o conhecimento adaptativo
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
     * Distribuição probabilística adaptativa fornecida pela ponte central.
     * A antiga combinação fixa 60/40 foi removida.
     */
    private probabilityLearning: ProbabilityLearningContext | null = null;


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
        // ============================================
        // PREPARA CONHECIMENTO ADAPTATIVO CENTRAL
        // ============================================
        const learningBridge = new EngineLearningBridge();
        this.probabilityLearning = learningBridge.prepararProbabilistica(
            this.dados,
            {
                loteria: this.config.lotteryType,
                maxNumero: this.config.maxNumero,
                incluirZero: this.config.incluirZero,
                quantidadeNumeros: this.config.numerosPadrao,
                minTreino: 300,
                passo: 1,
                recentWindow: 20
            }
        );

        // ============================================
        // CALCULA SCORES PROBABILÍSTICOS ADAPTATIVOS
        // ============================================
        const scores = this.calcularScores();

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
                '📈 Distribuição probabilística adaptativa',
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
    private calcularScores(): ScoreItem[] {

        if (!this.probabilityLearning) {
            throw new Error(
                '[ProbabilityEngine] Conhecimento probabilístico adaptativo não foi preparado.'
            );
        }

        const probabilidades =
            this.probabilityLearning.probabilidadesAprendidas;

        if (!Array.isArray(probabilidades) || probabilidades.length === 0) {
            throw new Error(
                '[ProbabilityEngine] Distribuição probabilística adaptativa vazia.'
            );
        }

        const scores: ScoreItem[] = [];

        for (const item of probabilidades) {
            if (
                !Number.isInteger(item.numero) ||
                !Number.isFinite(item.probabilidade) ||
                item.probabilidade < 0
            ) {
                throw new Error(
                    `[ProbabilityEngine] Probabilidade adaptativa inválida para o número ${item.numero}.`
                );
            }

            scores.push({
                numero: item.numero,
                score: item.probabilidade
            });
        }

        const soma = scores.reduce(
            (total, item) => total + item.score,
            0
        );

        if (!Number.isFinite(soma) || soma <= 0) {
            throw new Error(
                '[ProbabilityEngine] Soma da distribuição probabilística adaptativa inválida.'
            );
        }

        return scores;
    }

    /**
     * Retorna a distribuição probabilística adaptativa utilizada
     * na última geração.
     */
    getAdaptiveProbabilities(): Array<{ numero: number; probabilidade: number }> {
        if (!this.probabilityLearning) {
            throw new Error(
                '[ProbabilityEngine] Conhecimento probabilístico adaptativo ainda não foi preparado.'
            );
        }

        return this.probabilityLearning.probabilidadesAprendidas.map(
            item => ({ ...item })
        );
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


    // ============================================
    // MÉTODOS DE CONFIGURAÇÃO
    // ============================================

    /**
     * A ProbabilityEngine não utiliza mais pesos locais 60/40.
     * A distribuição é fornecida pela EngineLearningBridge.
     */
    setWeights(_weights: { probabilidade?: number; frequencia?: number }): void {
        throw new Error(
            '[ProbabilityEngine] Pesos locais 60/40 não são mais suportados. A distribuição probabilística é calibrada pelo cérebro adaptativo.'
        );
    }

    getWeights(): { probabilidade: number; frequencia: number } {
        return { probabilidade: 1, frequencia: 0 };
    }

    getEntropia(): number {
        if (!this.context || !this.context.probability) {
            throw new Error(
                '[ProbabilityEngine] ProbabilityAnalyzer indisponível para obter entropia.'
            );
        }

        return this.context.probability.getEntropia();
    }

    getVariancia(): number {
        if (!this.context || !this.context.probability) {
            throw new Error(
                '[ProbabilityEngine] ProbabilityAnalyzer indisponível para obter variância.'
            );
        }

        return this.context.probability.getVariancia();
    }

    validarPesos(): boolean {
        return true;
    }
}

// ============================================
// SEÇÃO 5: EXPORTS
// ============================================

export default ProbabilityEngine;

