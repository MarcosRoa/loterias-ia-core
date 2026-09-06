// ============================================================
// src/ai/services/AdaptiveCalibration.ts   06/09/2026
// ============================================================
// Calibração adaptativa walk-forward.
//
// Responsabilidades:
// - aprender pesos usando somente o histórico disponível antes
//   de cada previsão;
// - avaliar os fatores depois que o resultado real é conhecido;
// - aplicar os novos pesos somente ao ciclo seguinte;
// - retornar pesos e métricas da calibração.
//
// Não:
// - gera jogos;
// - acessa banco de dados;
// - altera engines;
// - altera API;
// - usa aleatoriedade.
// ============================================================

import {
    AdaptiveLearning,
    AdaptiveLearningConfig
} from './AdaptiveLearning';

import { AdaptiveLearningState } from './AdaptiveLearningState';

import {
    FactorEvaluation,
    FactorEvaluationInput
} from './FactorEvaluation';

import { StatisticsContext } from './StatisticsContext';

import {
    FeatureEngineering,
    NumberFeatures
} from './FeatureEngineering';

import {
    PredictiveScoring,
    PredictiveFeatures,
    PredictiveScoringWeights
} from './PredictiveScoring';

// ============================================================
// TIPOS
// ============================================================

export interface AdaptiveCalibrationConfig {
    loteria: string;
    maxNumero: number;
    incluirZero: boolean;
    quantidadeNumeros: number;
    minTreino: number;
    passo: number;
    topPatternsCount?: number;
    numbersPerPattern?: number;
    recentWindow?: number;
    adaptiveLearning?: Partial<AdaptiveLearningConfig>;
}

export interface AdaptiveCalibrationPrediction {
    concursoIndex: number;
    numerosPrevistos: number[];
    numerosReais: number[];
    acertos: number;
}

export interface AdaptiveCalibrationResult {
    loteria: string;
    concursos: number;
    testes: number;
    mediaAcertos: number;
    pesosIniciais: PredictiveScoringWeights;
    pesosFinais: PredictiveScoringWeights;
    estabilidade: number;
    ciclo: number;
    previsoes: AdaptiveCalibrationPrediction[];
}

// ============================================================
// SERVIÇO
// ============================================================

export class AdaptiveCalibration {

    private readonly factorEvaluation: FactorEvaluation;
    private readonly adaptiveLearning: AdaptiveLearning;
    private readonly state: AdaptiveLearningState;
    private readonly predictiveScoring: PredictiveScoring;

    constructor(
        private readonly config: AdaptiveCalibrationConfig
    ) {
        this.validarConfig(config);

        this.factorEvaluation = new FactorEvaluation();

        this.adaptiveLearning = new AdaptiveLearning(
            config.adaptiveLearning
        );

        this.predictiveScoring = new PredictiveScoring();

        const pesosIniciais = this.predictiveScoring.getWeights();

        this.state = new AdaptiveLearningState(
            config.loteria,
            { ...pesosIniciais }
        );
    }

    /**
     * Executa a calibração em modo walk-forward.
     *
     * Para o concurso N:
     *   histórico = dados[0 .. N-1]
     *   previsão  = feita com esse histórico
     *   resultado real N só é utilizado depois da previsão
     *
     * Assim, o aprendizado não pode usar o resultado futuro
     * para construir a própria previsão.
     */
    executar(dados: number[][]): AdaptiveCalibrationResult {

        this.validarDados(dados);

        const pesosIniciais =
            this.predictiveScoring.getWeights();

        const previsoes: AdaptiveCalibrationPrediction[] = [];

        const fatoresAcumulados:
            Record<string, FactorEvaluationInput[]> = {};

        const nomesFatores = this.obterNomesFatores();

        for (const fator of nomesFatores) {
            fatoresAcumulados[fator] = [];
        }

        for (
            let indice = this.config.minTreino;
            indice < dados.length;
            indice += this.config.passo
        ) {
            const dadosTreino = dados
                .slice(0, indice)
                .map(concurso => [...concurso]);

            const resultadoReal = [...dados[indice]];

            // =================================================
            // 1. FEATURES: somente passado
            // =================================================

            const features =
                this.extrairFeatures(dadosTreino);

            const predictiveFeatures =
                this.converterParaPredictiveFeatures(features);

            // =================================================
            // 2. PREVISÃO: pesos atuais
            // =================================================

            const scores =
                this.predictiveScoring.calcularScores(
                    predictiveFeatures
                );

            const numerosPrevistos =
                this.selecionarTopNumeros(scores);

            const acertos =
                numerosPrevistos.filter(numero =>
                    resultadoReal.includes(numero)
                ).length;

            previsoes.push({
                concursoIndex: indice,
                numerosPrevistos,
                numerosReais: resultadoReal,
                acertos
            });

            // =================================================
            // 3. RESULTADO REAL ENTRA SOMENTE AGORA
            // =================================================

            this.acumularFatores(
                features,
                resultadoReal,
                fatoresAcumulados
            );

            const avaliacao =
                this.factorEvaluation.avaliarFatores(
                    fatoresAcumulados
                );

            // =================================================
            // 4. APRENDIZADO
            // =================================================

            const aprendizado =
                this.adaptiveLearning.ajustar(
                    this.state.getPesosAtuais(),
                    avaliacao.fatores
                );

            if (aprendizado.alteracoesAplicadas > 0) {
                this.state.aplicarResultado(aprendizado);

                // Os novos pesos só passam a valer para
                // a próxima previsão.
                this.predictiveScoring.setWeights(
                    aprendizado.pesosNovos
                );
            }
        }

        if (previsoes.length === 0) {
            throw new Error(
                '[AdaptiveCalibration] Nenhuma previsão foi executada.'
            );
        }

        const totalAcertos =
            previsoes.reduce(
                (total, previsao) =>
                    total + previsao.acertos,
                0
            );

        const mediaAcertos =
            totalAcertos / previsoes.length;

        const estado =
            this.state.getSnapshot();

        return {
            loteria: this.config.loteria,
            concursos: dados.length,
            testes: previsoes.length,
            mediaAcertos,
            pesosIniciais,
            pesosFinais:
                this.predictiveScoring.getWeights(),
            estabilidade: estado.estabilidade,
            ciclo: estado.cicloAtual,
            previsoes
        };
    }

    // ============================================================
    // ACESSO AO ESTADO
    // ============================================================

    getPesosAtuais(): PredictiveScoringWeights {
        return this.predictiveScoring.getWeights();
    }

    getState(): ReturnType<
        AdaptiveLearningState['getSnapshot']
    > {
        return this.state.getSnapshot();
    }

    // ============================================================
    // FEATURES
    // ============================================================

    private extrairFeatures(
        dadosTreino: number[][]
    ): NumberFeatures[] {

        const context =
            new StatisticsContext(dadosTreino);

        const featureEngineering =
            new FeatureEngineering(
                context,
                {
                    maxNumero: this.config.maxNumero,
                    incluirZero: this.config.incluirZero,
                    topPatternsCount:
                        this.config.topPatternsCount ?? 10,
                    numbersPerPattern:
                        this.config.numbersPerPattern ?? 5,
                    recentWindow:
                        this.config.recentWindow ?? 20
                }
            );

        const features =
            featureEngineering.extrairFeatures();

        if (
            !Array.isArray(features) ||
            features.length === 0
        ) {
            throw new Error(
                '[AdaptiveCalibration] FeatureEngineering não retornou features.'
            );
        }

        return features;
    }

    private converterParaPredictiveFeatures(
        features: NumberFeatures[]
    ): PredictiveFeatures[] {

        return features.map(feature => ({
            numero: feature.numero,
            frequencia: feature.frequencia,
            tendenciaFrequencia:
                feature.tendenciaFrequencia,
            estabilidadeFrequencia:
                feature.estabilidadeFrequencia,
            atraso: feature.atraso,
            atrasoRelativo:
                feature.atrasoRelativo,
            regularidadeAtraso:
                feature.regularidadeAtraso,
            taxaRecente:
                feature.taxaRecente,
            intensidadeRecente:
                feature.intensidadeRecente,
            persistenciaRecente:
                feature.persistenciaRecente,
            distanciaRecente:
                feature.distanciaRecente,
            probabilidade:
                feature.probabilidade,
            suportePadrao:
                feature.suportePadrao
        }));
    }

    // ============================================================
    // AVALIAÇÃO DOS FATORES
    // ============================================================

    private acumularFatores(
        features: NumberFeatures[],
        resultadoReal: number[],
        fatoresAcumulados:
            Record<string, FactorEvaluationInput[]>
    ): void {

        for (const fator of this.obterNomesFatores()) {

            for (const feature of features) {

                fatoresAcumulados[fator].push({
                    numero: feature.numero,
                    fator: feature[fator],
                    resultadoReal:
                        resultadoReal.includes(feature.numero)
                });
            }
        }
    }

    private obterNomesFatores(): Array<
        keyof PredictiveScoringWeights
    > {
        return [
            'frequencia',
            'tendenciaFrequencia',
            'estabilidadeFrequencia',
            'atraso',
            'atrasoRelativo',
            'regularidadeAtraso',
            'taxaRecente',
            'intensidadeRecente',
            'persistenciaRecente',
            'distanciaRecente',
            'probabilidade',
            'suportePadrao'
        ];
    }

    // ============================================================
    // SELEÇÃO PARA CALIBRAÇÃO
    // ============================================================

    private selecionarTopNumeros(
        scores: Array<{
            numero: number;
            score: number;
        }>
    ): number[] {

        const ordenados = [...scores].sort((a, b) => {

            if (b.score !== a.score) {
                return b.score - a.score;
            }

            return a.numero - b.numero;
        });

        const selecionados =
            ordenados
                .slice(
                    0,
                    this.config.quantidadeNumeros
                )
                .map(item => item.numero);

        if (
            selecionados.length !==
            this.config.quantidadeNumeros
        ) {
            throw new Error(
                '[AdaptiveCalibration] Quantidade de números prevista inválida.'
            );
        }

        if (
            new Set(selecionados).size !==
            selecionados.length
        ) {
            throw new Error(
                '[AdaptiveCalibration] Previsão contém números duplicados.'
            );
        }

        return selecionados;
    }

    // ============================================================
    // VALIDAÇÕES
    // ============================================================

    private validarConfig(
        config: AdaptiveCalibrationConfig
    ): void {

        if (!config || typeof config !== 'object') {
            throw new Error(
                '[AdaptiveCalibration] Configuração inválida.'
            );
        }

        if (
            typeof config.loteria !== 'string' ||
            config.loteria.trim() === ''
        ) {
            throw new Error(
                '[AdaptiveCalibration] loteria inválida.'
            );
        }

        if (
            !Number.isInteger(config.maxNumero) ||
            config.maxNumero < 1
        ) {
            throw new Error(
                '[AdaptiveCalibration] maxNumero inválido.'
            );
        }

        if (typeof config.incluirZero !== 'boolean') {
            throw new Error(
                '[AdaptiveCalibration] incluirZero deve ser boolean.'
            );
        }

        const universo =
            config.maxNumero +
            (config.incluirZero ? 1 : 0);

        if (
            !Number.isInteger(config.quantidadeNumeros) ||
            config.quantidadeNumeros < 1 ||
            config.quantidadeNumeros > universo
        ) {
            throw new Error(
                '[AdaptiveCalibration] quantidadeNumeros inválida.'
            );
        }

        if (
            !Number.isInteger(config.minTreino) ||
            config.minTreino < 1
        ) {
            throw new Error(
                '[AdaptiveCalibration] minTreino inválido.'
            );
        }

        if (
            !Number.isInteger(config.passo) ||
            config.passo < 1
        ) {
            throw new Error(
                '[AdaptiveCalibration] passo inválido.'
            );
        }
    }

    private validarDados(
        dados: number[][]
    ): void {

        if (!Array.isArray(dados)) {
            throw new Error(
                '[AdaptiveCalibration] dados devem ser um array.'
            );
        }

        if (
            dados.length <
            this.config.minTreino + 1
        ) {
            throw new Error(
                `[AdaptiveCalibration] Dados insuficientes: ${dados.length}. ` +
                `Mínimo necessário: ${this.config.minTreino + 1}.`
            );
        }

        for (
            let indice = 0;
            indice < dados.length;
            indice++
        ) {
            const concurso = dados[indice];

            if (!Array.isArray(concurso)) {
                throw new Error(
                    `[AdaptiveCalibration] Concurso ${indice} inválido.`
                );
            }

            if (concurso.length === 0) {
                throw new Error(
                    `[AdaptiveCalibration] Concurso ${indice} vazio.`
                );
            }

            const numeros =
                new Set<number>();

            for (const numero of concurso) {

                if (!Number.isInteger(numero)) {
                    throw new Error(
                        `[AdaptiveCalibration] Número inválido no concurso ${indice}: ${numero}.`
                    );
                }

                const minimo =
                    this.config.incluirZero ? 0 : 1;

                if (
                    numero < minimo ||
                    numero > this.config.maxNumero
                ) {
                    throw new Error(
                        `[AdaptiveCalibration] Número ${numero} fora do intervalo ` +
                        `no concurso ${indice}.`
                    );
                }

                if (numeros.has(numero)) {
                    throw new Error(
                        `[AdaptiveCalibration] Número ${numero} duplicado ` +
                        `no concurso ${indice}.`
                    );
                }

                numeros.add(numero);
            }
        }
    }
}

export default AdaptiveCalibration;
