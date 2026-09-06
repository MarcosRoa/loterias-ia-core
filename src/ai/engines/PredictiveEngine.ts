// ============================================
// CAMINHO: src/ai/engines/PredictiveEngine.ts
// DATA CRIAÇÃO: 2026-01-20
// STATUS: ⏳ PENDENTE APROVAÇÃO
// VERSÃO: 2.2.0
// ============================================
// 
// SEÇÃO 1: IMPORTS
// SEÇÃO 2: PREDICTIVE ENGINE
// SEÇÃO 3: MÉTODO GERAR JOGOS
// SEÇÃO 4: CONFIGURAÇÃO DO CÉREBRO
// SEÇÃO 5: MÉTODOS DE VALIDAÇÃO
// SEÇÃO 6: CONFIGURAÇÃO
// SEÇÃO 7: EXPORTS
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

import { ConfidenceCalculator } from '../evaluation/ConfidenceCalculator';
import { ScoreItem } from '../types';
import {
    AdaptiveBrain,
    AdaptiveBrainConfig
} from '../services/AdaptiveBrain';

// ============================================
// SEÇÃO 2: PREDICTIVE ENGINE
// ============================================

/**
 * Motor de IA Preditiva ⭐ PRO
 *
 * Responsabilidade:
 * - Detectar evidências estatísticas históricas
 * - Calcular ranking preditivo adaptativo
 * - Utilizar o AdaptiveBrain como camada de inteligência
 * - Delegar a seleção final para o BaseEngine
 *
 * Fluxo:
 *
 * Dados históricos
 *       ↓
 * AdaptiveBrain
 *       ↓
 * FeatureEngineering
 *       ↓
 * PredictiveScoring
 *       ↓
 * Scores
 *       ↓
 * BaseEngine.selecionarNumeros()
 *       ↓
 * CandidatePool
 *       ↓
 * WeightedSelectionStrategy
 *       ↓
 * DiversificationService
 *       ↓
 * Jogos
 *
 * Características:
 * - Exclusivo para assinantes PRO
 * - Requer mínimo de 30 concursos
 * - Score determinístico
 * - Sem aleatoriedade no cálculo dos scores
 * - Aleatoriedade somente na etapa de seleção
 *
 * @throws Error se dados forem insuficientes ou dependências não inicializadas
 */
export class PredictiveEngine extends BaseEngine {

    /**
     * Calculadora de confiança
     */
    private confidenceCalc: ConfidenceCalculator;

    /**
     * Cérebro adaptativo responsável pelo ranking.
     *
     * A geração de jogos continua pertencendo ao Engine/BaseEngine.
     */
    private adaptiveBrain: AdaptiveBrain | null = null;

    /**
     * Número mínimo de concursos para operar
     */
    private readonly MIN_DRAWS = 30;

    /**
     * Número de padrões a considerar pelo cérebro
     */
    private topPatternsCount: number = 10;

    /**
     * Quantos números considerar por padrão
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
        return 'Detecta padrões e calcula ranking preditivo adaptativo';
    }

    isDisponivel(): boolean {
        return this.isPro;
    }

    gerarJogos(
        quantidade: number,
        seed: number,
        params: any = {}
    ): EngineResult {

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
            this.setTopPatternsCount(params.topPatternsCount);
        }

        if (params.numbersPerPattern !== undefined) {
            this.setNumbersPerPattern(params.numbersPerPattern);
        }

        // ============================================
        // INICIALIZA O ADAPTIVE BRAIN
        // ============================================

        this.inicializarAdaptiveBrain();

        if (!this.adaptiveBrain) {
            throw new Error(
                '[PredictiveEngine] AdaptiveBrain não foi inicializado.'
            );
        }

        // ============================================
        // CALCULA SCORES
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

            // A seleção continua sendo responsabilidade
            // do BaseEngine.
            const numeros = this.selecionarNumeros(
                scores,
                this.config.numerosPadrao,
                seeds[i],
                jogosGerados
            );

            // Cria o jogo mantendo o contrato existente
            const jogo = this.criarJogo(
                numeros,
                seeds[i],
                [
                    '🔮 Ranking preditivo adaptativo',
                    '📊 Análise estatística histórica'
                ]
            );

            jogos.push(jogo);
            jogosGerados.push(numeros);
        }

        // ============================================
        // CALCULA CONFIANÇA
        // ============================================

        const confianca = this.confidenceCalc.calcularCompleta(
            this.dados,
            [
                'frequencia',
                'atraso',
                'padroes'
            ]
        );

        // ============================================
        // RESULTADO
        // ============================================

        return {
            games: jogos,
            confidence: Math.min(
                confianca.confianca + 5,
                85
            ),
            engineName: this.getNome(),
            explanation: [
                `🔮 ${this.dados.length} concursos analisados`,
                `🎯 Confiança: ${(confianca.confianca + 5).toFixed(0)}%`,
                `🧠 Ranking calculado pelo AdaptiveBrain`,
                `📊 ${this.topPatternsCount} padrões considerados`
            ]
        };
    }

    // ============================================
    // SEÇÃO 4: CONFIGURAÇÃO DO CÉREBRO
    // ============================================

    /**
     * Inicializa o AdaptiveBrain com os mesmos dados
     * e configurações fundamentais utilizados pelo engine.
     *
     * Importante:
     * - Não gera jogos
     * - Não seleciona números
     * - Não usa seed
     * - Não utiliza aleatoriedade
     * - Não altera banco de dados
     */
    private inicializarAdaptiveBrain(): void {

        const brainConfig: AdaptiveBrainConfig = {
            maxNumero: this.config.maxNumero,
            incluirZero: this.config.incluirZero,
            topPatternsCount: this.topPatternsCount,
            numbersPerPattern: this.numbersPerPattern,
            recentWindow: 20
        };

        this.adaptiveBrain = new AdaptiveBrain(
            this.dados,
            brainConfig
        );
    }

    /**
     * Calcula os scores utilizando exclusivamente
     * o AdaptiveBrain.
     *
     * O resultado mantém o contrato ScoreItem
     * utilizado pelo BaseEngine.
     */
    private calcularScores(): ScoreItem[] {

        if (!this.adaptiveBrain) {
            throw new Error(
                '[PredictiveEngine] AdaptiveBrain indisponível ao calcular scores.'
            );
        }

        const scores = this.adaptiveBrain.calcularScores();

        if (!Array.isArray(scores) || scores.length === 0) {
            throw new Error(
                '[PredictiveEngine] AdaptiveBrain não retornou scores.'
            );
        }

        return scores.map(item => ({
            numero: item.numero,
            score: item.score
        }));
    }

    // ============================================
    // SEÇÃO 5: MÉTODOS DE VALIDAÇÃO
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
     * Valida quantidade de dados
     * mínimo 30 concursos
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
    // SEÇÃO 6: CONFIGURAÇÃO
    // ============================================

    /**
     * Define quantos padrões considerar.
     */
    setTopPatternsCount(count: number): void {

        if (
            !Number.isInteger(count) ||
            count < 1
        ) {
            throw new Error(
                `[PredictiveEngine] Número de padrões inválido: ${count}. ` +
                'Deve ser um inteiro >= 1.'
            );
        }

        this.topPatternsCount = count;
    }

    /**
     * Define quantos números considerar por padrão.
     */
    setNumbersPerPattern(count: number): void {

        if (
            !Number.isInteger(count) ||
            count < 1
        ) {
            throw new Error(
                `[PredictiveEngine] Números por padrão inválido: ${count}. ` +
                'Deve ser um inteiro >= 1.'
            );
        }

        this.numbersPerPattern = count;
    }

    /**
     * Retorna os parâmetros estruturais atuais
     * utilizados pelo PredictiveEngine.
     */
        /**
     * Retorna os parâmetros estruturais atuais
     * utilizados pelo PredictiveEngine.
     */
    getConfig(): {
        topPatternsCount: number;
        numbersPerPattern: number;
    } {
        return {
            topPatternsCount: this.topPatternsCount,
            numbersPerPattern: this.numbersPerPattern
        };
    }

    /**
     * Retorna os pesos atuais do AdaptiveBrain.
     *
     * Os pesos pertencem ao PredictiveScoring
     * dentro do cérebro adaptativo.
     */
    getAdaptiveWeights() {

        if (!this.adaptiveBrain) {
            throw new Error(
                '[PredictiveEngine] AdaptiveBrain ainda não foi inicializado.'
            );
        }

        return this.adaptiveBrain.getWeights();
    }
}

// ============================================
// SEÇÃO 7: EXPORTS
// ============================================

export default PredictiveEngine;
