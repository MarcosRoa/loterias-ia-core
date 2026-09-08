// ============================================================
// src/ai/services/SuperSeteLearning.ts
// ============================================================
// APRENDIZADO POSICIONAL — SUPER SETE
//
// Responsabilidades:
// - utilizar o mesmo AdaptiveBrain do sistema;
// - aplicar os pesos adaptativos já calibrados;
// - preservar a posição de cada coluna;
// - produzir scores independentes para cada dígito em cada coluna.
//
// Estrutura:
//
// Histórico Super Sete
//        ↓
// 7 históricos posicionais
//        ↓
// AdaptiveBrain (mesmo cérebro)
//        ↓
// FeatureEngineering
//        ↓
// PredictiveScoring + pesos adaptativos
//        ↓
// 7 × 10 scores
//
// Este módulo NÃO:
// - gera jogos;
// - usa aleatoriedade;
// - seleciona dígitos;
// - ordena as colunas;
// - altera BaseEngine;
// - altera CandidatePool;
// - altera WeightedSelectionStrategy;
// - altera DiversificationService;
// - acessa banco de dados.
//
// A seleção final será responsabilidade da camada de geração.
// ============================================================

import {
    AdaptiveBrain,
    AdaptiveBrainConfig
} from './AdaptiveBrain';

import { PredictiveScoringWeights } from './PredictiveScoring';

// ============================================================
// TIPOS
// ============================================================

export interface SuperSeteLearningConfig {
    maxNumero?: number;
    incluirZero?: boolean;
    topPatternsCount?: number;
    numbersPerPattern?: number;
    recentWindow?: number;
}

export interface SuperSetePositionalScore {
    numero: number;
    score: number;
}

export interface SuperSeteLearningResult {
    posicoes: number;
    digitosPorPosicao: number;
    scoresPorPosicao: SuperSetePositionalScore[][];
}

// ============================================================
// SERVIÇO
// ============================================================

export class SuperSeteLearning {

    private readonly config: Required<SuperSeteLearningConfig>;

    constructor(
        config: SuperSeteLearningConfig = {}
    ) {
        this.config = {
            maxNumero: config.maxNumero ?? 9,
            incluirZero: config.incluirZero ?? true,
            topPatternsCount: config.topPatternsCount ?? 10,
            numbersPerPattern: config.numbersPerPattern ?? 5,
            recentWindow: config.recentWindow ?? 20
        };

        this.validarConfig();
    }

    // ========================================================
    // APRENDIZADO POSICIONAL
    // ========================================================

    /**
     * Calcula o conhecimento adaptativo do Super Sete
     * preservando as 7 posições.
     *
     * Cada coluna é processada separadamente pelo MESMO
     * AdaptiveBrain e pelos MESMOS pesos adaptativos.
     *
     * Portanto:
     *
     * coluna 1 → AdaptiveBrain
     * coluna 2 → AdaptiveBrain
     * ...
     * coluna 7 → AdaptiveBrain
     *
     * O cérebro não recebe as posições misturadas.
     */
    calcularScores(
        dados: number[][],
        pesos: PredictiveScoringWeights
    ): SuperSeteLearningResult {

        this.validarDados(dados);
        this.validarPesos(pesos);

        const scoresPorPosicao: SuperSetePositionalScore[][] = [];

        for (let posicao = 0; posicao < 7; posicao++) {

            // ------------------------------------------------
            // Isola somente a coluna atual.
            //
            // Exemplo:
            // dados = [
            //   [0, 5, 2, 8, 1, 4, 9],
            //   [3, 5, 7, 8, 1, 6, 9],
            //   ...
            // ]
            //
            // coluna 2 passa a ser:
            // [[5], [5], ...]
            //
            // Assim o AdaptiveBrain analisa o dígito
            // dentro daquela posição, sem misturá-lo
            // com as outras seis posições.
            // ------------------------------------------------

            const dadosDaPosicao = dados.map(
                (concurso, indice) => {

                    const valor = concurso[posicao];

                    if (
                        !Number.isInteger(valor) ||
                        valor < 0 ||
                        valor > 9
                    ) {
                        throw new Error(
                            `[SuperSeteLearning] Dígito inválido na posição ${posicao + 1}, ` +
                            `concurso ${indice}: ${valor}.`
                        );
                    }

                    return [valor];
                }
            );

            // ------------------------------------------------
            // Mesmo AdaptiveBrain do sistema.
            // Os pesos aprendidos entram diretamente aqui.
            // ------------------------------------------------

            const brainConfig: AdaptiveBrainConfig = {
                maxNumero: this.config.maxNumero,
                incluirZero: this.config.incluirZero,
                topPatternsCount: this.config.topPatternsCount,
                numbersPerPattern: this.config.numbersPerPattern,
                recentWindow: this.config.recentWindow
            };

            const brain = new AdaptiveBrain(
                dadosDaPosicao,
                brainConfig,
                pesos
            );

            const scores = brain.calcularScores();

            this.validarScores(
                scores,
                posicao
            );

            // ------------------------------------------------
            // Mantém os 10 dígitos no domínio 0..9.
            // Nenhuma ordenação por valor é aplicada.
            // ------------------------------------------------

            const mapa = new Map<number, number>();

            for (const item of scores) {
                if (mapa.has(item.numero)) {
                    throw new Error(
                        `[SuperSeteLearning] Score duplicado para o dígito ` +
                        `${item.numero} na posição ${posicao + 1}.`
                    );
                }

                mapa.set(item.numero, item.score);
            }

            const scoresPosicao: SuperSetePositionalScore[] = [];

            for (let digito = 0; digito <= 9; digito++) {

                const score = mapa.get(digito);

                if (score === undefined) {
                    throw new Error(
                        `[SuperSeteLearning] AdaptiveBrain não produziu score ` +
                        `para o dígito ${digito} na posição ${posicao + 1}.`
                    );
                }

                scoresPosicao.push({
                    numero: digito,
                    score
                });
            }

            scoresPorPosicao.push(scoresPosicao);
        }

        if (scoresPorPosicao.length !== 7) {
            throw new Error(
                `[SuperSeteLearning] Resultado posicional inválido: ` +
                `${scoresPorPosicao.length} posições. Esperado: 7.`
            );
        }

        return {
            posicoes: 7,
            digitosPorPosicao: 10,
            scoresPorPosicao
        };
    }

    // ========================================================
    // VALIDAÇÃO DE DADOS
    // ========================================================

    private validarDados(
        dados: number[][]
    ): void {

        if (!Array.isArray(dados)) {
            throw new Error(
                '[SuperSeteLearning] Dados históricos devem ser um array.'
            );
        }

        if (dados.length === 0) {
            throw new Error(
                '[SuperSeteLearning] Dados históricos vazios.'
            );
        }

        for (let i = 0; i < dados.length; i++) {

            const concurso = dados[i];

            if (!Array.isArray(concurso)) {
                throw new Error(
                    `[SuperSeteLearning] Concurso ${i} não é um array.`
                );
            }

            if (concurso.length !== 7) {
                throw new Error(
                    `[SuperSeteLearning] Concurso ${i} possui ` +
                    `${concurso.length} posições. Esperado: 7.`
                );
            }
        }
    }

    // ========================================================
    // VALIDAÇÃO DE CONFIGURAÇÃO
    // ========================================================

    private validarConfig(): void {

        if (
            this.config.maxNumero !== 9
        ) {
            throw new Error(
                `[SuperSeteLearning] maxNumero inválido: ` +
                `${this.config.maxNumero}. O Super Sete utiliza 0..9.`
            );
        }

        if (
            this.config.incluirZero !== true
        ) {
            throw new Error(
                '[SuperSeteLearning] incluirZero deve ser true.'
            );
        }

        if (
            !Number.isInteger(this.config.topPatternsCount) ||
            this.config.topPatternsCount < 1
        ) {
            throw new Error(
                `[SuperSeteLearning] topPatternsCount inválido: ` +
                `${this.config.topPatternsCount}.`
            );
        }

        if (
            !Number.isInteger(this.config.numbersPerPattern) ||
            this.config.numbersPerPattern < 1
        ) {
            throw new Error(
                `[SuperSeteLearning] numbersPerPattern inválido: ` +
                `${this.config.numbersPerPattern}.`
            );
        }

        if (
            !Number.isInteger(this.config.recentWindow) ||
            this.config.recentWindow < 1
        ) {
            throw new Error(
                `[SuperSeteLearning] recentWindow inválido: ` +
                `${this.config.recentWindow}.`
            );
        }
    }

    // ========================================================
    // VALIDAÇÃO DOS PESOS
    // ========================================================

    private validarPesos(
        pesos: PredictiveScoringWeights
    ): void {

        if (!pesos || typeof pesos !== 'object') {
            throw new Error(
                '[SuperSeteLearning] Pesos adaptativos ausentes.'
            );
        }

        const entradas = Object.entries(pesos);

        if (entradas.length === 0) {
            throw new Error(
                '[SuperSeteLearning] Nenhum peso adaptativo foi fornecido.'
            );
        }

        for (const [nome, valor] of entradas) {

            if (
                typeof valor !== 'number' ||
                !Number.isFinite(valor) ||
                valor < 0
            ) {
                throw new Error(
                    `[SuperSeteLearning] Peso inválido: ${nome}=${valor}.`
                );
            }
        }
    }

    // ========================================================
    // VALIDAÇÃO DOS SCORES
    // ========================================================

    private validarScores(
        scores: Array<{ numero: number; score: number }>,
        posicao: number
    ): void {

        if (!Array.isArray(scores)) {
            throw new Error(
                `[SuperSeteLearning] AdaptiveBrain não retornou ` +
                `array na posição ${posicao + 1}.`
            );
        }

        if (scores.length !== 10) {
            throw new Error(
                `[SuperSeteLearning] AdaptiveBrain retornou ` +
                `${scores.length} scores na posição ${posicao + 1}. ` +
                `Esperado: 10.`
            );
        }

        const numeros = new Set<number>();

        for (const item of scores) {

            if (
                !item ||
                !Number.isInteger(item.numero) ||
                item.numero < 0 ||
                item.numero > 9
            ) {
                throw new Error(
                    `[SuperSeteLearning] Score inválido na posição ` +
                    `${posicao + 1}.`
                );
            }

            if (
                !Number.isFinite(item.score)
            ) {
                throw new Error(
                    `[SuperSeteLearning] Score não finito para o dígito ` +
                    `${item.numero} na posição ${posicao + 1}.`
                );
            }

            if (numeros.has(item.numero)) {
                throw new Error(
                    `[SuperSeteLearning] Dígito duplicado no resultado ` +
                    `do AdaptiveBrain: ${item.numero}, posição ${posicao + 1}.`
                );
            }

            numeros.add(item.numero);
        }

        for (let digito = 0; digito <= 9; digito++) {

            if (!numeros.has(digito)) {
                throw new Error(
                    `[SuperSeteLearning] Dígito ${digito} ausente ` +
                    `na posição ${posicao + 1}.`
                );
            }
        }
    }
}

export default SuperSeteLearning;
