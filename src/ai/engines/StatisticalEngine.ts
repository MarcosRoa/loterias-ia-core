// ============================================
// CAMINHO: src/ai/engines/StatisticalEngine.ts
// DATA CRIAÇÃO: 2026-01-20
// STATUS: ⏳ PENDENTE APROVAÇÃO
// VERSÃO: 3.0.0 (VERSÃO FINAL)
// ============================================
// 
// SEÇÃO 1: IMPORTS
// SEÇÃO 2: STATISTICAL ENGINE
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
import { ConfidenceCalculator } from '../evaluation/ConfidenceCalculator';
import { ScoreItem } from '../types';

// ============================================
// SEÇÃO 2: STATISTICAL ENGINE
// ============================================

/**
 * Motor de IA Estatística
 * 
 * Responsabilidade:
 * - Analisar frequência, atraso e dispersão
 * - Calcular scores combinados
 * - Delegar seleção para a nova arquitetura
 * 
 * Fluxo:
 * 1. Obtém dados de frequência, atraso e dispersão
 * 2. Calcula score para cada número
 * 3. Chama selecionarNumeros() da BaseEngine
 * 4. Retorna jogos com explicações
 * 
 * @throws Error se dados forem insuficientes ou dependências não inicializadas
 * 
 * @example
 * ```typescript
 * const engine = new StatisticalEngine(dados, config, isPro, extras);
 * const result = engine.gerarJogos(5, 12345, { dispersao: 15 });
 * ```
 */
export class StatisticalEngine extends BaseEngine {
    /**
     * Calculadora de confiança
     */
    private confidenceCalc: ConfidenceCalculator;

    /**
     * Pesos para o cálculo do score (mutável para permitir ajustes)
     */
    private weights = {
        frequencia: 0.6,
        atraso: 0.4
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
    }

    // ============================================
    // SEÇÃO 3: MÉTODO GERAR JOGOS
    // ============================================

    getNome(): string {
        return '📊 IA Estatística';
    }

    getDescricao(): string {
        return 'Analisa frequência, atraso e dispersão';
    }

    gerarJogos(quantidade: number, seed: number, params: any = {}): EngineResult {
        // ============================================
        // VALIDAÇÕES EXPLÍCITAS - SEM FALLBACK
        // ============================================
        this.validarContexto();
        this.validarQuantidade(quantidade);
        
        const dispersao = params.dispersao || 15;

        // ============================================
        // OBTÉM ANALISADORES COM VALIDAÇÃO
        // ============================================
        const frequency = this.obterFrequency();
        const delay = this.obterDelay();
        const dispersion = this.obterDispersion(dispersao);

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
            const scores = this.calcularScores(frequency, delay, dispersion);
            
            // Seleciona números usando a nova arquitetura
            const numeros = this.selecionarNumeros(
                scores,
                this.config.numerosPadrao,
                seeds[i],
                jogosGerados
            );

            // Cria o jogo
            const jogo = this.criarJogo(numeros, seeds[i], [
                '📊 Baseado em frequência e atraso',
                '🎯 Prioriza números mais prováveis'
            ]);
            
            jogos.push(jogo);
            jogosGerados.push(numeros);
        }

        // ============================================
        // CALCULA CONFIANÇA
        // ============================================
        const confianca = this.confidenceCalc.calcularCompleta(
            this.dados,
            ['frequencia', 'atraso', 'dispersao']
        );

        return {
            games: jogos,
            confidence: confianca.confianca,
            engineName: this.getNome(),
            explanation: [
                `📊 ${this.dados.length} concursos analisados`,
                `🎯 Confiança: ${confianca.confianca.toFixed(0)}%`,
                `📈 Dispersão: ${dispersao} concursos`
            ]
        };
    }

    // ============================================
    // SEÇÃO 4: CÁLCULO DE SCORES
    // ============================================

    /**
     * Calcula scores para todos os números
     * 
     * @param frequency - Analisador de frequência
     * @param delay - Analisador de atraso
     * @param dispersion - Analisador de dispersão
     * @returns Lista de scores
     */
    private calcularScores(
        frequency: FrequencyAnalyzer,
        delay: DelayAnalyzer,
        dispersion: DispersionAnalyzer
    ): ScoreItem[] {
        const min = this.config.incluirZero ? 0 : 1;
        const max = this.config.maxNumero;
        const scores: ScoreItem[] = [];

        // ============================================
        // CALCULA SCORE PARA CADA NÚMERO
        // ============================================
        for (let i = min; i <= max; i++) {
            // Obtém valores normalizados (0-1)
            const freqScore = frequency.getFrequenciaNormalizada(i) / 100;
            const delayScore = delay.getAtrasoNormalizado(i) / 100;
            
            // Aplica pesos
            let score = (
                freqScore * this.weights.frequencia +
                delayScore * this.weights.atraso
            );

            // Aplica penalidade de dispersão (se disponível)
            if (this.config.temDispersao) {
                score = dispersion.aplicarPenalidade(i, score);
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
                '[StatisticalEngine] Dados históricos não carregados.'
            );
        }
    }

    /**
     * Valida contexto antes de gerar jogos
     */
    private validarContexto(): void {
        if (!this.context) {
            throw new Error(
                '[StatisticalEngine] StatisticsContext não foi inicializado. ' +
                `Dados disponíveis: ${this.dados?.length || 0} concursos.`
            );
        }

        if (this.dados.length < 10) {
            throw new Error(
                `[StatisticalEngine] Dados insuficientes: ${this.dados.length} concursos. ` +
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
                `[StatisticalEngine] Quantidade inválida: ${quantidade}. ` +
                'Deve ser maior que 0.'
            );
        }

        if (quantidade > 100) {
            throw new Error(
                `[StatisticalEngine] Quantidade excede o limite: ${quantidade}. ` +
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
                '[StatisticalEngine] StatisticsContext indisponível ao obter FrequencyAnalyzer.'
            );
        }

        if (!this.context.frequency) {
            throw new Error(
                '[StatisticalEngine] FrequencyAnalyzer não foi inicializado.'
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
                '[StatisticalEngine] StatisticsContext indisponível ao obter DelayAnalyzer.'
            );
        }

        if (!this.context.delay) {
            throw new Error(
                '[StatisticalEngine] DelayAnalyzer não foi inicializado.'
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
                '[StatisticalEngine] StatisticsContext indisponível ao obter DispersionAnalyzer.'
            );
        }

        if (!this.context.dispersion) {
            throw new Error(
                '[StatisticalEngine] DispersionAnalyzer não foi inicializado.'
            );
        }

        const dispersion = this.context.dispersion;
        dispersion.setWindowSize(dispersao);
        
        return dispersion;
    }

    // ============================================
    // MÉTODOS DE CONFIGURAÇÃO
    // ============================================

    /**
     * Atualiza os pesos do score
     */
    setWeights(frequencia: number, atraso: number): void {
        const soma = frequencia + atraso;
        if (soma === 0) {
            throw new Error(
                '[StatisticalEngine] Soma dos pesos não pode ser zero.'
            );
        }
        
        this.weights.frequencia = frequencia / soma;
        this.weights.atraso = atraso / soma;
    }

    /**
     * Obtém os pesos atuais
     */
    getWeights(): { frequencia: number; atraso: number } {
        return { ...this.weights };
    }

    /**
     * Valida se os pesos são válidos
     */
    validarPesos(): boolean {
        const soma = this.weights.frequencia + this.weights.atraso;
        return Math.abs(soma - 1) < 0.001;
    }
}

// ============================================
// SEÇÃO 5: EXPORTS
// ============================================


export default StatisticalEngine;
