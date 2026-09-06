// ============================================
// src/ai/services/AdaptiveBrain.ts
// ADAPTIVE BRAIN  06/09/2026
// CÉREBRO ADAPTATIVO DE RANKING
// ============================================

import { StatisticsContext } from './StatisticsContext';
import {
    FeatureEngineering,
    NumberFeatures
} from './FeatureEngineering';
import {
    PredictiveScoring,
    PredictiveScoringWeights,
    PredictiveFeatures
} from './PredictiveScoring';

// ============================================
// CONFIGURAÇÃO
// ============================================

export interface AdaptiveBrainConfig {
    maxNumero: number;
    incluirZero: boolean;

    topPatternsCount?: number;
    numbersPerPattern?: number;
    recentWindow?: number;
}

// ============================================
// CÉREBRO ADAPTATIVO
// ============================================

export class AdaptiveBrain {

    private readonly dados: number[][];
    private readonly config: AdaptiveBrainConfig;

    private readonly context: StatisticsContext;
    private readonly featureEngineering: FeatureEngineering;
    private readonly predictiveScoring: PredictiveScoring;

    constructor(
        dados: number[][],
        config: AdaptiveBrainConfig,
        pesos?: PredictiveScoringWeights
    ) {

        this.validarDados(dados);
        this.validarConfig(config);

        this.dados = dados.map(jogo => [...jogo]);
        this.config = { ...config };

        // --------------------------------------------
        // CONTEXTO ESTATÍSTICO
        // --------------------------------------------

        this.context = new StatisticsContext(this.dados);

        // --------------------------------------------
        // ENGENHARIA DE FEATURES
        // --------------------------------------------

        this.featureEngineering = new FeatureEngineering(
            this.context,
            {
                maxNumero: config.maxNumero,
                incluirZero: config.incluirZero,
                topPatternsCount: config.topPatternsCount ?? 10,
                numbersPerPattern: config.numbersPerPattern ?? 5,
                recentWindow: config.recentWindow ?? 20
            }
        );

        // --------------------------------------------
        // SCORING PREDITIVO
        // --------------------------------------------

        this.predictiveScoring = new PredictiveScoring();

        if (pesos !== undefined) {
            this.predictiveScoring.setWeights(pesos);
        }
    }

    // ============================================
    // CÁLCULO DOS SCORES
    // ============================================

    /**
     * Extrai as features históricas e transforma
     * essas evidências em scores preditivos.
     *
     * Este método NÃO seleciona números.
     * Este método NÃO gera jogos.
     * Este método NÃO utiliza aleatoriedade.
     */
    calcularScores(): Array<{ numero: number; score: number }> {

        const features =
            this.featureEngineering.extrairFeatures();

        if (!Array.isArray(features) || features.length === 0) {
            throw new Error(
                'AdaptiveBrain: FeatureEngineering não retornou features válidas'
            );
        }

        const predictiveFeatures =
            features.map(feature =>
                this.converterFeature(feature)
            );

        const scores =
            this.predictiveScoring.calcularScores(
                predictiveFeatures
            );

        this.validarScores(scores);

        return scores.map(item => ({
            numero: item.numero,
            score: item.score
        }));
    }

    // ============================================
    // PESOS
    // ============================================

    /**
     * Atualiza os pesos utilizados pelo scoring.
     *
     * A validação permanece centralizada no
     * PredictiveScoring.
     */
    setWeights(pesos: PredictiveScoringWeights): void {
        this.predictiveScoring.setWeights(pesos);
    }

    /**
     * Retorna uma cópia dos pesos atuais.
     */
    getWeights(): PredictiveScoringWeights {
        return this.predictiveScoring.getWeights();
    }

    // ============================================
    // ACESSO AO CONTEXTO
    // ============================================

    /**
     * Retorna o contexto estatístico utilizado
     * pelo cérebro.
     *
     * O contexto é somente para leitura.
     */
    getContext(): StatisticsContext {
        return this.context;
    }

    /**
     * Retorna a configuração utilizada pelo cérebro.
     */
    getConfig(): AdaptiveBrainConfig {
        return { ...this.config };
    }

    // ============================================
    // CONVERSÃO DE FEATURES
    // ============================================

    private converterFeature(
        feature: NumberFeatures
    ): PredictiveFeatures {

        return {
            numero: feature.numero,
            frequencia: feature.frequencia,
            tendenciaFrequencia: feature.tendenciaFrequencia,
            estabilidadeFrequencia: feature.estabilidadeFrequencia,
            atraso: feature.atraso,
            atrasoRelativo: feature.atrasoRelativo,
            regularidadeAtraso: feature.regularidadeAtraso,
            taxaRecente: feature.taxaRecente,
            intensidadeRecente: feature.intensidadeRecente,
            persistenciaRecente: feature.persistenciaRecente,
            distanciaRecente: feature.distanciaRecente,
            probabilidade: feature.probabilidade,
            suportePadrao: feature.suportePadrao
        };
    }

    // ============================================
    // VALIDAÇÃO DOS DADOS
    // ============================================

    private validarDados(dados: number[][]): void {

        if (!Array.isArray(dados)) {
            throw new Error(
                'AdaptiveBrain: dados deve ser um array de concursos'
            );
        }

        if (dados.length === 0) {
            throw new Error(
                'AdaptiveBrain: dados não podem estar vazios'
            );
        }

        for (let i = 0; i < dados.length; i++) {

            const concurso = dados[i];

            if (!Array.isArray(concurso)) {
                throw new Error(
                    `AdaptiveBrain: concurso ${i} não é um array`
                );
            }

            if (concurso.length === 0) {
                throw new Error(
                    `AdaptiveBrain: concurso ${i} está vazio`
                );
            }

            for (let j = 0; j < concurso.length; j++) {

                const numero = concurso[j];

                if (!Number.isInteger(numero)) {
                    throw new Error(
                        `AdaptiveBrain: número inválido no concurso ${i}, posição ${j}: ${numero}`
                    );
                }
            }
        }
    }

    // ============================================
    // VALIDAÇÃO DA CONFIGURAÇÃO
    // ============================================

    private validarConfig(config: AdaptiveBrainConfig): void {

        if (!config || typeof config !== 'object') {
            throw new Error(
                'AdaptiveBrain: configuração inválida'
            );
        }

        if (
            !Number.isInteger(config.maxNumero) ||
            config.maxNumero < 1
        ) {
            throw new Error(
                `AdaptiveBrain: maxNumero inválido: ${config.maxNumero}`
            );
        }

        if (typeof config.incluirZero !== 'boolean') {
            throw new Error(
                'AdaptiveBrain: incluirZero deve ser boolean'
            );
        }

        if (
            config.topPatternsCount !== undefined &&
            (
                !Number.isInteger(config.topPatternsCount) ||
                config.topPatternsCount <= 0
            )
        ) {
            throw new Error(
                `AdaptiveBrain: topPatternsCount inválido: ${config.topPatternsCount}`
            );
        }

        if (
            config.numbersPerPattern !== undefined &&
            (
                !Number.isInteger(config.numbersPerPattern) ||
                config.numbersPerPattern <= 0
            )
        ) {
            throw new Error(
                `AdaptiveBrain: numbersPerPattern inválido: ${config.numbersPerPattern}`
            );
        }

        if (
            config.recentWindow !== undefined &&
            (
                !Number.isInteger(config.recentWindow) ||
                config.recentWindow <= 0
            )
        ) {
            throw new Error(
                `AdaptiveBrain: recentWindow inválido: ${config.recentWindow}`
            );
        }
    }

    // ============================================
    // VALIDAÇÃO DOS SCORES
    // ============================================

    private validarScores(
        scores: Array<{ numero: number; score: number }>
    ): void {

        if (!Array.isArray(scores) || scores.length === 0) {
            throw new Error(
                'AdaptiveBrain: PredictiveScoring não retornou scores'
            );
        }

        const numeros = new Set<number>();

        for (const item of scores) {

            if (!Number.isInteger(item.numero)) {
                throw new Error(
                    `AdaptiveBrain: número inválido no score: ${item.numero}`
                );
            }

            if (
                !Number.isFinite(item.score)
            ) {
                throw new Error(
                    `AdaptiveBrain: score inválido para o número ${item.numero}: ${item.score}`
                );
            }

            if (numeros.has(item.numero)) {
                throw new Error(
                    `AdaptiveBrain: número duplicado nos scores: ${item.numero}`
                );
            }

            numeros.add(item.numero);
        }

        const minimo =
            this.config.incluirZero ? 0 : 1;

        for (const item of scores) {

            if (
                item.numero < minimo ||
                item.numero > this.config.maxNumero
            ) {
                throw new Error(
                    `AdaptiveBrain: número ${item.numero} fora do universo configurado ` +
                    `(${minimo}-${this.config.maxNumero})`
                );
            }
        }
    }
}
