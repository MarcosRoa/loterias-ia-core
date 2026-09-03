// ============================================
// src/ai/services/LearningPipeline.ts
// ============================================
// ============================================
// LEARNING PIPELINE 03/09/2026
// ============================================
// Orquestra um ciclo completo de aprendizado.
//
// Fluxo:
//
// HISTÓRICO
//    ↓
// Backtesting
//    ↓
// BacktestMetrics
//    ↓
// FactorEvaluation
//    ↓
// AdaptiveLearning
//    ↓
// AdaptiveLearningState
//
// IMPORTANTE:
// - Não gera jogos.
// - Não altera engines.
// - Não altera banco.
// - Não usa aleatoriedade.
// - Não olha o futuro.
// - Não persiste automaticamente.
// - Não mascara erros.
//
// O modelo de previsão é fornecido externamente.
// Isso mantém o pipeline desacoplado do PredictiveScoring
// e permite testar diferentes modelos.
// ============================================

import {
    Backtesting,
    BacktestingConfig,
    BacktestModel,
    BacktestResult
} from './Backtesting';

import {
    BacktestMetrics,
    BacktestMetricsResult,
    BaselineConfig
} from './BacktestMetrics';

import {
    FactorEvaluation,
    FactorEvaluationInput,
    FactorEvaluationResult,
    FactorEvaluationSummary
} from './FactorEvaluation';

import {
    AdaptiveLearning,
    AdaptiveLearningConfig,
    AdaptiveLearningResult,
    AdaptiveLearningWeights
} from './AdaptiveLearning';

import {
    AdaptiveLearningState
} from './AdaptiveLearningState';

export interface LearningPipelineConfig {
    backtesting?: Partial<BacktestingConfig>;

    adaptiveLearning?: Partial<AdaptiveLearningConfig>;

    baseline?: BaselineConfig;
}

export interface LearningPipelineFactorProvider {
    extrair(
        dadosTreino: number[][],
        numerosPrevistos: number[],
        resultadoReal: number[]
    ): Record<string, FactorEvaluationInput[]>;
}

export interface LearningPipelineResult {
    backtest: BacktestResult;

    metrics: BacktestMetricsResult;

    factors: FactorEvaluationSummary;

    learning: AdaptiveLearningResult;

    state: ReturnType<
        AdaptiveLearningState['getSnapshot']
    >;
}

export class LearningPipeline {

    private readonly backtesting: Backtesting;

    private readonly metrics: BacktestMetrics;

    private readonly factorEvaluation: FactorEvaluation;

    private readonly adaptiveLearning: AdaptiveLearning;

    private readonly state: AdaptiveLearningState;

    private readonly baseline?: BaselineConfig;

    constructor(
        loteria: string,
        pesosIniciais: AdaptiveLearningWeights,
        config?: LearningPipelineConfig
    ) {

        this.backtesting =
            new Backtesting(
                config?.backtesting
            );

        this.metrics =
            new BacktestMetrics();

        this.factorEvaluation =
            new FactorEvaluation();

        this.adaptiveLearning =
            new AdaptiveLearning(
                config?.adaptiveLearning
            );

        this.state =
            new AdaptiveLearningState(
                loteria,
                pesosIniciais
            );

        this.baseline =
            config?.baseline;
    }

    /**
     * Executa um ciclo completo de aprendizado.
     */
    public executar(
        dados: number[][],
        model: BacktestModel,
        factorProvider: LearningPipelineFactorProvider
    ): LearningPipelineResult {

        this.validarFactorProvider(
            factorProvider
        );

        /*
         * 1. BACKTESTING
         *
         * O Backtesting controla a separação temporal.
         */
        const backtest =
            this.backtesting.executar(
                dados,
                model
            );

        /*
         * 2. MÉTRICAS
         *
         * Mede o desempenho geral do modelo.
         */
        const metrics =
            this.metrics.calcular(
                backtest,
                this.baseline
            );

        /*
         * 3. AVALIAÇÃO DOS FATORES
         *
         * Cada teste é convertido em entradas
         * individuais para cada fator.
         */
        const fatores =
            this.construirAvaliacoesDeFatores(
                dados,
                backtest,
                factorProvider
            );

        const factorSummary =
            this.factorEvaluation.avaliarFatores(
                fatores
            );

        /*
         * 4. ADAPTIVE LEARNING
         *
         * O aprendizado recebe somente a evidência
         * produzida pelas etapas anteriores.
         */
        const learning =
            this.adaptiveLearning.ajustar(
                this.state.getPesosAtuais(),
                factorSummary.fatores
            );

        /*
         * 5. ATUALIZA O ESTADO
         */
        this.state.aplicarResultado(
            learning
        );

        return {
            backtest,

            metrics,

            factors: factorSummary,

            learning,

            state:
                this.state.getSnapshot()
        };
    }

    /**
     * Executa apenas o backtesting + métricas.
     *
     * Útil para validação antes de ativar
     * qualquer aprendizado.
     */
    public avaliarModelo(
        dados: number[][],
        model: BacktestModel
    ): {
        backtest: BacktestResult;
        metrics: BacktestMetricsResult;
    } {

        const backtest =
            this.backtesting.executar(
                dados,
                model
            );

        const metrics =
            this.metrics.calcular(
                backtest,
                this.baseline
            );

        return {
            backtest,
            metrics
        };
    }

    /**
     * Retorna os pesos atualmente aprendidos.
     */
    public getPesosAtuais(): AdaptiveLearningWeights {
        return this.state.getPesosAtuais();
    }

    /**
     * Retorna o estado completo.
     */
    public getState(): ReturnType<
        AdaptiveLearningState['getSnapshot']
    > {
        return this.state.getSnapshot();
    }

    /**
     * Constrói as avaliações dos fatores a partir
     * dos testes temporais.
     */
    private construirAvaliacoesDeFatores(
        dados: number[][],
        backtest: BacktestResult,
        factorProvider: LearningPipelineFactorProvider
    ): Record<string, FactorEvaluationInput[]> {

        const fatores:
            Record<string, FactorEvaluationInput[]> = {};

        /*
         * Cada previsão é associada ao concurso real
         * utilizado pelo backtesting.
         */
        backtest.previsoes.forEach(
            previsao => {

                const indice =
                    previsao.concursoIndex;

                if (
                    indice < 0 ||
                    indice >= dados.length
                ) {
                    throw new Error(
                        `LearningPipeline: índice de concurso inválido: ${indice}.`
                    );
                }

                /*
                 * Somente dados anteriores ao concurso
                 * de teste são enviados ao provider.
                 */
                const dadosTreino =
                    dados
                        .slice(0, indice)
                        .map(
                            concurso => [...concurso]
                        );

                const avaliacao =
                    factorProvider.extrair(
                        dadosTreino,
                        previsao.numerosPrevistos,
                        previsao.numerosReais
                    );

                this.validarFatoresExtraidos(
                    avaliacao,
                    indice
                );

                Object.entries(avaliacao)
                    .forEach(
                        ([nome, entradas]) => {

                            if (
                                !fatores[nome]
                            ) {
                                fatores[nome] = [];
                            }

                            fatores[nome].push(
                                ...entradas
                            );
                        }
                    );
            }
        );

        return fatores;
    }

    /**
     * Valida os fatores produzidos externamente.
     */
    private validarFatoresExtraidos(
        fatores: Record<string, FactorEvaluationInput[]>,
        indice: number
    ): void {

        if (
            !fatores ||
            typeof fatores !== 'object' ||
            Array.isArray(fatores)
        ) {
            throw new Error(
                `LearningPipeline: fatores inválidos no concurso ${indice}.`
            );
        }

        Object.entries(fatores)
            .forEach(
                ([nome, entradas]) => {

                    if (
                        typeof nome !== 'string' ||
                        nome.trim().length === 0
                    ) {
                        throw new Error(
                            `LearningPipeline: nome de fator inválido no concurso ${indice}.`
                        );
                    }

                    if (!Array.isArray(entradas)) {
                        throw new Error(
                            `LearningPipeline: entradas inválidas para o fator "${nome}" no concurso ${indice}.`
                        );
                    }
                }
            );
    }

    /**
     * Valida o provider.
     */
    private validarFactorProvider(
        provider: LearningPipelineFactorProvider
    ): void {

        if (
            !provider ||
            typeof provider !== 'object' ||
            typeof provider.extrair !== 'function'
        ) {
            throw new Error(
                'LearningPipeline: factorProvider inválido.'
            );
        }
    }
}
