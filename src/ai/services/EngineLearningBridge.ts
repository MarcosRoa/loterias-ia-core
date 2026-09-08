// ============================================================
// CAMINHO: src/ai/services/EngineLearningBridge.ts
// DATA DE CRIAÇÃO: 07/09/2026
// STATUS: 1.1.1
// ============================================================
// PONTE CENTRAL ENTRE O CÉREBRO ADAPTATIVO E AS ENGINES
//
// Responsabilidades:
// - fornecer às engines o conhecimento adaptativo já calibrado;
// - centralizar o acesso aos pesos aprendidos;
// - preparar uma distribuição probabilística adaptativa para a
//   ProbabilityEngine, sem usar o antigo 60/40;
// - manter a lógica específica de cada engine dentro da própria
//   engine;
// - NÃO gerar jogos;
// - NÃO alterar a Preditiva;
// - NÃO alterar BaseEngine;
// - NÃO acessar banco de dados;
// - NÃO criar fallback silencioso.
//
// Arquitetura:
//
// adaptive-weights.json
//          ↓
//   AdaptiveWeights
//          ↓
//   AdaptiveBrain
//          ↓
// EngineLearningBridge
//    ├── Probabilística → distribuição probabilística adaptativa
//    ├── Especialista    → conhecimento adaptativo
//    ├── Híbrida         → conhecimento adaptativo
//    └── Estatística     → conhecimento adaptativo
//          ↓
//      ENGINE ESPECÍFICA
//
// A calibração histórica permanece no pipeline de aprendizagem.
// O runtime utiliza os pesos já calibrados para não executar um
// backtest completo a cada geração de jogo.
// ============================================================

import { AdaptiveWeights } from './AdaptiveWeights';
import { AdaptiveBrain } from './AdaptiveBrain';
import type { PredictiveScoringWeights } from './PredictiveScoring';
import { ProbabilityAnalyzer } from '../analysis/ProbabilityAnalyzer';
import { SuperSeteLearning } from './SuperSeteLearning';

// ============================================================
// CONFIGURAÇÃO
// ============================================================

export interface EngineLearningConfig {
    loteria: string;
    maxNumero: number;
    incluirZero: boolean;
    quantidadeNumeros: number;

    minTreino: number;
    passo: number;

    topPatternsCount?: number;
    numbersPerPattern?: number;
    recentWindow?: number;
}

// ============================================================
// CONHECIMENTO ADAPTATIVO COMUM
// ============================================================

export interface LearnedEngineKnowledge {
    loteria: string;
    pesosAdaptativos: PredictiveScoringWeights;
    versaoPesos: string;
    dataAtualizacaoPesos: string;
}

// ============================================================
// CONTEXTO PROBABILÍSTICO
// ============================================================

export interface ProbabilityLearningContext {
    tipo: 'probabilistica';
    conhecimento: LearnedEngineKnowledge;

    /**
     * Probabilidade histórica recalibrada pelo cérebro adaptativo.
     * A soma dos valores é 1.
     */
    probabilidadesAprendidas: Array<{
        numero: number;
        probabilidade: number;
    }>;
}

export interface SpecialistLearningContext {
    tipo: 'especialista';
    conhecimento: LearnedEngineKnowledge;
}

export interface HybridLearningContext {
    tipo: 'hibrida';
    conhecimento: LearnedEngineKnowledge;
}

export interface StatisticalLearningContext {
    tipo: 'estatistica';
    conhecimento: LearnedEngineKnowledge;
}

export interface SmartRandomLearningContext {
    tipo: 'smartRandom';
    conhecimento: LearnedEngineKnowledge;
    scoresAdaptativos: Array<{
        numero: number;
        score: number;
    }>;
}
export interface SuperSeteLearningContext {
    tipo: 'superSete';
    conhecimento: LearnedEngineKnowledge;
    scoresPorPosicao: Array<Array<{
        numero: number;
        score: number;
    }>>;
}
export type EngineLearningContext =
    | ProbabilityLearningContext
    | SpecialistLearningContext
    | HybridLearningContext
    | StatisticalLearningContext
    | SmartRandomLearningContext
    | SuperSeteLearningContext;

// ============================================================
// PONTE
// ============================================================

export class EngineLearningBridge {

    // ========================================================
    // CONHECIMENTO ADAPTATIVO COMUM
    // ========================================================

    private obterConhecimento(
        config: EngineLearningConfig
    ): LearnedEngineKnowledge {

        this.validarConfig(config);

        const pesosAdaptativos =
            AdaptiveWeights.getPesos(config.loteria);

        this.validarPesos(
            pesosAdaptativos,
            config.loteria
        );

        return {
            loteria: config.loteria,
            pesosAdaptativos: { ...pesosAdaptativos },
            versaoPesos: AdaptiveWeights.getVersao(),
            dataAtualizacaoPesos:
                AdaptiveWeights.getDataAtualizacao()
        };
    }

    // ========================================================
    // PROBABILÍSTICA
    // ========================================================

    /**
     * Prepara uma distribuição probabilística adaptativa.
     *
     * A ProbabilityAnalyzer fornece a distribuição histórica base.
     * O AdaptiveBrain, utilizando os pesos já aprendidos, fornece
     * o fator de calibração por número.
     *
     * Não existe mais combinação fixa 60/40.
     * A distribuição final é normalizada matematicamente para
     * permanecer uma distribuição de probabilidade.
     */
    prepararProbabilistica(
        dados: number[][],
        config: EngineLearningConfig
    ): ProbabilityLearningContext {

        this.validarDados(dados);

        const conhecimento =
            this.obterConhecimento(config);

        const brain = new AdaptiveBrain(
            dados,
            {
                maxNumero: config.maxNumero,
                incluirZero: config.incluirZero,
                topPatternsCount:
                    config.topPatternsCount ?? 10,
                numbersPerPattern:
                    config.numbersPerPattern ?? 5,
                recentWindow:
                    config.recentWindow ?? 20
            },
            conhecimento.pesosAdaptativos
        );

        const scores = brain.calcularScores();

        if (!Array.isArray(scores) || scores.length === 0) {
            throw new Error(
                `[EngineLearningBridge] O cérebro não retornou scores para "${config.loteria}".`
            );
        }

        const probability = new ProbabilityAnalyzer(dados);

        const valores = scores.map(item => {
            const probabilidadeBase =
                probability.getProbabilidade(item.numero);

            if (!Number.isFinite(probabilidadeBase) || probabilidadeBase < 0) {
                throw new Error(
                    `[EngineLearningBridge] Probabilidade histórica inválida para o número ${item.numero} em "${config.loteria}".`
                );
            }

            if (!Number.isFinite(item.score) || item.score < 0) {
                throw new Error(
                    `[EngineLearningBridge] Score adaptativo inválido para o número ${item.numero} em "${config.loteria}".`
                );
            }

            return {
                numero: item.numero,
                probabilidadeBase,
                scoreAdaptativo: item.score
            };
        });

        const somaScores = valores.reduce(
            (soma, item) => soma + item.scoreAdaptativo,
            0
        );

        if (!Number.isFinite(somaScores) || somaScores <= 0) {
            throw new Error(
                `[EngineLearningBridge] Soma dos scores adaptativos inválida para "${config.loteria}".`
            );
        }

        const mediaScore =
            somaScores / valores.length;

        if (!Number.isFinite(mediaScore) || mediaScore <= 0) {
            throw new Error(
                `[EngineLearningBridge] Média dos scores adaptativos inválida para "${config.loteria}".`
            );
        }

        // Recalibração multiplicativa:
        // - score acima da média aumenta a massa probabilística;
        // - score abaixo da média reduz a massa probabilística;
        // - a distribuição histórica continua sendo a base.
        const calibradas = valores.map(item => ({
            numero: item.numero,
            valor: item.probabilidadeBase *
                (item.scoreAdaptativo / mediaScore)
        }));

        const somaCalibrada = calibradas.reduce(
            (soma, item) => soma + item.valor,
            0
        );

        if (!Number.isFinite(somaCalibrada) || somaCalibrada <= 0) {
            throw new Error(
                `[EngineLearningBridge] Não foi possível normalizar a distribuição probabilística adaptativa de "${config.loteria}".`
            );
        }

        const probabilidadesAprendidas = calibradas.map(item => ({
            numero: item.numero,
            probabilidade: item.valor / somaCalibrada
        }));

        const somaFinal = probabilidadesAprendidas.reduce(
            (soma, item) => soma + item.probabilidade,
            0
        );

        if (Math.abs(somaFinal - 1) > 1e-9) {
            throw new Error(
                `[EngineLearningBridge] Distribuição probabilística adaptativa não normalizada em "${config.loteria}". Soma=${somaFinal}.`
            );
        }

        return {
            tipo: 'probabilistica',
            conhecimento,
            probabilidadesAprendidas
        };
    }

    // ========================================================
    // ESPECIALISTA
    // ========================================================

    prepararEspecialista(
        dados: number[][],
        config: EngineLearningConfig
    ): SpecialistLearningContext {

        this.validarDados(dados);

        return {
            tipo: 'especialista',
            conhecimento: this.obterConhecimento(config)
        };
    }

    // ========================================================
    // HÍBRIDA
    // ========================================================

    prepararHibrida(
        dados: number[][],
        config: EngineLearningConfig
    ): HybridLearningContext {

        this.validarDados(dados);

        return {
            tipo: 'hibrida',
            conhecimento: this.obterConhecimento(config)
        };
    }

    // ========================================================
    // ESTATÍSTICA
    // ========================================================

    prepararEstatistica(
        dados: number[][],
        config: EngineLearningConfig
    ): StatisticalLearningContext {

        this.validarDados(dados);

        return {
            tipo: 'estatistica',
            conhecimento: this.obterConhecimento(config)
        };
    }

    // ========================================================
    // SMART RANDOM
    // ========================================================

    prepararSmartRandom(
        dados: number[][],
        config: EngineLearningConfig
    ): SmartRandomLearningContext {

        this.validarDados(dados);

        const conhecimento =
            this.obterConhecimento(config);

        const brain = new AdaptiveBrain(
            dados,
            {
                maxNumero: config.maxNumero,
                incluirZero: config.incluirZero,
                topPatternsCount:
                    config.topPatternsCount ?? 10,
                numbersPerPattern:
                    config.numbersPerPattern ?? 5,
                recentWindow:
                    config.recentWindow ?? 20
            },
            conhecimento.pesosAdaptativos
        );

        const scores = brain.calcularScores();

        if (!Array.isArray(scores) || scores.length === 0) {
            throw new Error(
                `[EngineLearningBridge] O cérebro não retornou scores para "${config.loteria}".`
            );
        }

        for (const item of scores) {
            if (
                !Number.isInteger(item.numero) ||
                !Number.isFinite(item.score) ||
                item.score < 0
            ) {
                throw new Error(
                    `[EngineLearningBridge] Score adaptativo inválido para "${config.loteria}": número=${item.numero}, score=${item.score}.`
                );
            }
        }

        return {
            tipo: 'smartRandom',
            conhecimento,
            scoresAdaptativos: scores.map(item => ({
                numero: item.numero,
                score: item.score
            }))
        };
    }
    // ========================================================
    // SUPER SETE
    // ========================================================

    prepararSuperSete(
        dados: number[][],
        config: EngineLearningConfig
    ): SuperSeteLearningContext {

        this.validarDados(dados);

        if (config.loteria !== 'supersete') {
            throw new Error(
                `[EngineLearningBridge] prepararSuperSete recebeu uma loteria inválida: "${config.loteria}".`
            );
        }

        const conhecimento =
            this.obterConhecimento(config);

        const learning = new SuperSeteLearning({
            maxNumero: config.maxNumero,
            incluirZero: config.incluirZero,
            topPatternsCount:
                config.topPatternsCount ?? 10,
            numbersPerPattern:
                config.numbersPerPattern ?? 5,
            recentWindow:
                config.recentWindow ?? 20
        });

        const resultado =
            learning.calcularScores(
                dados,
                conhecimento.pesosAdaptativos
            );

        if (
            !resultado ||
            !Array.isArray(resultado.scoresPorPosicao)
        ) {
            throw new Error(
                '[EngineLearningBridge] SuperSeteLearning não retornou scores posicionais válidos.'
            );
        }

        if (resultado.scoresPorPosicao.length !== 7) {
            throw new Error(
                `[EngineLearningBridge] Super Sete deve retornar exatamente 7 posições. Recebido: ${resultado.scoresPorPosicao.length}.`
            );
        }

        for (let posicao = 0; posicao < 7; posicao++) {

            const scores =
                resultado.scoresPorPosicao[posicao];

            if (!Array.isArray(scores) || scores.length !== 10) {
                throw new Error(
                    `[EngineLearningBridge] Posição ${posicao + 1} do Super Sete deve conter exatamente 10 dígitos.`
                );
            }

            for (const item of scores) {

                if (
                    !Number.isInteger(item.numero) ||
                    item.numero < 0 ||
                    item.numero > 9 ||
                    !Number.isFinite(item.score) ||
                    item.score < 0
                ) {
                    throw new Error(
                        `[EngineLearningBridge] Score posicional inválido no Super Sete: posição=${posicao + 1}, número=${item.numero}, score=${item.score}.`
                    );
                }
            }
        }

        return {
            tipo: 'superSete',
            conhecimento,
            scoresPorPosicao:
                resultado.scoresPorPosicao.map(scores =>
                    scores.map(item => ({
                        numero: item.numero,
                        score: item.score
                    }))
                )
        };
    }

    // ========================================================
    // VALIDAÇÕES
    // ========================================================

    private validarDados(dados: number[][]): void {
        if (!Array.isArray(dados)) {
            throw new Error(
                '[EngineLearningBridge] Dados históricos devem ser um array.'
            );
        }

        if (dados.length === 0) {
            throw new Error(
                '[EngineLearningBridge] Dados históricos vazios.'
            );
        }

        for (let i = 0; i < dados.length; i++) {
            if (!Array.isArray(dados[i]) || dados[i].length === 0) {
                throw new Error(
                    `[EngineLearningBridge] Concurso inválido no índice ${i}.`
                );
            }
        }
    }

    private validarConfig(config: EngineLearningConfig): void {
        if (
            typeof config.loteria !== 'string' ||
            config.loteria.trim() === ''
        ) {
            throw new Error(
                '[EngineLearningBridge] Loteria inválida.'
            );
        }

        if (
            !Number.isInteger(config.maxNumero) ||
            config.maxNumero < 1
        ) {
            throw new Error(
                `[EngineLearningBridge] maxNumero inválido: ${config.maxNumero}.`
            );
        }

        if (
            !Number.isInteger(config.quantidadeNumeros) ||
            config.quantidadeNumeros < 1
        ) {
            throw new Error(
                `[EngineLearningBridge] quantidadeNumeros inválida: ${config.quantidadeNumeros}.`
            );
        }
    }

    private validarPesos(
        pesos: PredictiveScoringWeights,
        loteria: string
    ): void {
        const entradas = Object.entries(pesos);

        if (entradas.length === 0) {
            throw new Error(
                `[EngineLearningBridge] Nenhum peso adaptativo disponível para "${loteria}".`
            );
        }

        for (const [nome, valor] of entradas) {
            if (!Number.isFinite(valor) || valor < 0) {
                throw new Error(
                    `[EngineLearningBridge] Peso adaptativo inválido para "${loteria}": ${nome}=${valor}.`
                );
            }
        }
    }
}

// ============================================================
// EXPORT DEFAULT
// ============================================================

export default EngineLearningBridge;
