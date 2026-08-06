// ============================================
// CAMINHO: src/ai/engines/HybridEngine.ts
// DATA CRIAÇÃO: 2026-01-20
// STATUS: ⏳ PENDENTE APROVAÇÃO
// VERSÃO: 1.1.0 (VERSÃO REVISADA)
// ============================================
// 
// SEÇÃO 1: IMPORTS
// SEÇÃO 2: HYBRID ENGINE
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
import { DispersionAnalyzer } from '../analysis/DispersionAnalyzer';
import { ProbabilityAnalyzer } from '../analysis/ProbabilityAnalyzer';
import { PatternAnalyzer } from '../analysis/PatternAnalyzer';
import { ConfidenceCalculator } from '../evaluation/ConfidenceCalculator';
import { ScoreItem } from '../types';

// ============================================
// SEÇÃO 2: HYBRID ENGINE
// ============================================

/**
 * Motor de IA Híbrida
 * 
 * Responsabilidade:
 * - Combinar estatística, probabilidade e tendência
 * - Calcular scores combinados com pesos balanceados
 * - Delegar seleção para a nova arquitetura
 * 
 * Fluxo:
 * 1. Obtém dados de múltiplos analisadores
 * 2. Calcula score combinado para cada número
 * 3. Aplica penalidade de dispersão (se configurado)
 * 4. Chama selecionarNumeros() da BaseEngine
 * 5. Retorna jogos com explicações
 * 
 * @throws Error se dados forem insuficientes ou dependências não inicializadas
 * 
 * @example
 * ```typescript
 * const engine = new HybridEngine(dados, config, isPro, extras);
 * const result = engine.gerarJogos(5, 12345, { dispersao: 15 });
 * ```
 */
export class HybridEngine extends BaseEngine {
    /**
     * Calculadora de confiança
     */
    private confidenceCalc: ConfidenceCalculator;

    /**
     * Pesos para o cálculo do score (mutável para permitir ajustes)
     * 
     * Distribuição balanceada entre os fatores principais:
     * - Frequência: 35% (histórico de aparições)
     * - Atraso: 25% (tempo desde última aparição)
     * - Probabilidade: 30% (distribuição binomial)
     * - Padrão: 10% (tendências detectadas)
     * 
     * Nota: A dispersão não faz parte da soma ponderada.
     * Ela é aplicada como uma penalidade posterior ao score,
     * ajustando números que apareceram recentemente.
     */
    private weights = {
        frequencia: 0.35,
        atraso: 0.25,
        probabilidade: 0.30,
        padrao: 0.10
    };

    /**
     * Fator de penalidade da dispersão
     * Quanto maior, mais penaliza números recentes
     */
    private dispersionPenaltyFactor: number = 1.0;

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
        return '🧠 IA Híbrida ⭐ RECOMENDADO';
    }

    getDescricao(): string {
        return 'Combina estatística, probabilidade e tendência';
    }

    gerarJogos(quantidade: number, seed: number, params: any = {}): EngineResult {
        // ============================================
        // VALIDAÇÕES EXPLÍCITAS - SEM FALLBACK
        // ============================================
        this.validarContexto();
        this.validarQuantidade(quantidade);
        
        const dispersao = params.dispersao || 15;
        if (params.dispersionPenaltyFactor !== undefined) {
            this.dispersionPenaltyFactor = params.dispersionPenaltyFactor;
        }

        // ============================================
        // OBTÉM ANALISADORES COM VALIDAÇÃO
        // ============================================
        const frequency = this.obterFrequency();
        const delay = this.obterDelay();
        const dispersion = this.obterDispersion(dispersao);
        const probability = this.obterProbability();
        const patterns = this.obterPatterns();

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
            // Calcula scores para esta rodada
            const scores = this.calcularScores(
                frequency,
                delay,
                dispersion,
                probability,
                patterns
            );
            
            // Seleciona números usando a nova arquitetura
            const numeros = this.selecionarNumeros(
                scores,
                this.config.numerosPadrao,
                seeds[i],
                jogosGerados
            );

            // Cria o jogo
            const jogo = this.criarJogo(numeros, seeds[i], [
                '🧠 Combina 4 técnicas diferentes',
                '📊 Estatística + Probabilidade + Tendência'
            ]);
            
            jogos.push(jogo);
            jogosGerados.push(numeros);
        }

        // ============================================
        // CALCULA CONFIANÇA
        // ============================================
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
                `📊 ${confianca.fatores?.qualidadeEstatistica?.toFixed(0) || 0}% qualidade estatística`
            ]
        };
    }

    // ============================================
    // SEÇÃO 4: CÁLCULO DE SCORES
    // ============================================

    /**
     * Calcula scores combinados para todos os números
     * 
     * @param frequency - Analisador de frequência
     * @param delay - Analisador de atraso
     * @param dispersion - Analisador de dispersão
     * @param probability - Analisador de probabilidade
     * @param patterns - Analisador de padrões
     * @returns Lista de scores
     */
    private calcularScores(
        frequency: FrequencyAnalyzer,
        delay: DelayAnalyzer,
        dispersion: DispersionAnalyzer,
        probability: ProbabilityAnalyzer,
        patterns: PatternAnalyzer
    ): ScoreItem[] {
        const min = this.config.incluirZero ? 0 : 1;
        const max = this.config.maxNumero;
        const scores: ScoreItem[] = [];

        // ============================================
        // OBTÉM PADRÕES PARA PONTUAÇÃO
        // ============================================
        const melhoresPadroes = patterns.getMelhoresPadroes(5);
        const padroesNumeros = new Set<number>();
        
        for (const padrao of melhoresPadroes) {
            const nums = patterns.gerarNumerosPorPadrao(padrao, 3, max);
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
            const padraoScore = padroesNumeros.has(i) ? 0.8 : 0.2;

            // Aplica pesos (soma = 1)
            let score = (
                freqScore * this.weights.frequencia +
                delayScore * this.weights.atraso +
                probScore * this.weights.probabilidade +
                padraoScore * this.weights.padrao
            );

            // ============================================
            // APLICA PENALIDADE DE DISPERSÃO
            // A dispersão NÃO faz parte da soma ponderada.
            // Ela é um modificador que penaliza números que
            // apareceram recentemente.
            // ============================================
            if (this.config.temDispersao) {
                score = dispersion.aplicarPenalidade(
                    i,
                    score,
                    this.dispersionPenaltyFactor
                );
            }

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
                '[HybridEngine] Dados históricos não carregados.'
            );
        }
    }

    /**
     * Valida contexto antes de gerar jogos
     */
    private validarContexto(): void {
        if (!this.context) {
            throw new Error(
                '[HybridEngine] StatisticsContext não foi inicializado. ' +
                `Dados disponíveis: ${this.dados?.length || 0} concursos.`
            );
        }

        if (this.dados.length < 10) {
            throw new Error(
                `[HybridEngine] Dados insuficientes: ${this.dados.length} concursos. ` +
                'Mínimo esperado: 10 concursos.'
            );
        }
    }

    /**
     * Valida quantidade de jogos
     */
    private validarQuantidade(quantidade: number): void {
        if (quantidade <= 0) {
            throw new Error(
                `[HybridEngine] Quantidade inválida: ${quantidade}. ` +
                'Deve ser maior que 0.'
            );
        }

        if (quantidade > 100) {
            throw new Error(
                `[HybridEngine] Quantidade excede o limite: ${quantidade}. ` +
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
                '[HybridEngine] StatisticsContext indisponível ao obter FrequencyAnalyzer.'
            );
        }

        if (!this.context.frequency) {
            throw new Error(
                '[HybridEngine] FrequencyAnalyzer não foi inicializado.'
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
                '[HybridEngine] StatisticsContext indisponível ao obter DelayAnalyzer.'
            );
        }

        if (!this.context.delay) {
            throw new Error(
                '[HybridEngine] DelayAnalyzer não foi inicializado.'
            );
        }

        return this.context.delay;
    }

    /**
     * Obtém DispersionAnalyzer com validação
     */
    private obterDispersion(dispersao: number): DispersionAnalyzer {
        if (!this.context) {
            throw new Error(
                '[HybridEngine] StatisticsContext indisponível ao obter DispersionAnalyzer.'
            );
        }

        if (!this.context.dispersion) {
            throw new Error(
                '[HybridEngine] DispersionAnalyzer não foi inicializado.'
            );
        }

        const dispersion = this.context.dispersion;
        dispersion.setWindowSize(dispersao);
        
        return dispersion;
    }

    /**
     * Obtém ProbabilityAnalyzer com validação
     */
    private obterProbability(): ProbabilityAnalyzer {
        if (!this.context) {
            throw new Error(
                '[HybridEngine] StatisticsContext indisponível ao obter ProbabilityAnalyzer.'
            );
        }

        if (!this.context.probability) {
            throw new Error(
                '[HybridEngine] ProbabilityAnalyzer não foi inicializado.'
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
                '[HybridEngine] StatisticsContext indisponível ao obter PatternAnalyzer.'
            );
        }

        if (!this.context.patterns) {
            throw new Error(
                '[HybridEngine] PatternAnalyzer não foi inicializado.'
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
                `[HybridEngine] Soma dos pesos é ${soma.toFixed(3)}, esperado 1.`
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
     * Define o fator de penalidade da dispersão
     */
    setDispersionPenaltyFactor(factor: number): void {
        if (factor < 0) {
            throw new Error(
                `[HybridEngine] Fator de penalidade inválido: ${factor}. Deve ser >= 0.`
            );
        }
        this.dispersionPenaltyFactor = factor;
    }

    /**
     * Obtém o fator de penalidade atual
     */
    getDispersionPenaltyFactor(): number {
        return this.dispersionPenaltyFactor;
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
export default HybridEngine;
