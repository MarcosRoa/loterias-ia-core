// ============================================
// src/ai/services/FactorEvaluation.ts
// ============================================
// ============================================
// FACTOR EVALUATION  03/09/2026
// ============================================
// Avalia individualmente os fatores utilizados
// pelo sistema preditivo.
//
// Objetivo:
//
// histórico
//    ↓
// features por número
//    ↓
// FactorEvaluation
//    ↓
// desempenho de cada fator
//    ↓
// AdaptiveLearning
//
// IMPORTANTE:
// - Não altera pesos.
// - Não aprende.
// - Não gera jogos.
// - Não usa aleatoriedade.
// - Não olha o futuro.
// - Não mascara valores inválidos.
// ============================================

export interface FactorEvaluationInput {
    numero: number;
    fator: number;
    resultadoReal: boolean;
}

export interface FactorEvaluationResult {
    fator: string;

    amostras: number;

    mediaScore: number;

    acertos: number;
    erros: number;

    taxaAcerto: number;

    discriminacao: number;

    desempenho: number;
}

export interface FactorEvaluationSummary {
    fatores: FactorEvaluationResult[];

    melhorFator: string | null;
    piorFator: string | null;
}

export class FactorEvaluation {

    /**
     * Avalia um fator individual.
     *
     * fator:
     *   score produzido pelo fator.
     *
     * resultadoReal:
     *   indica se o número apareceu no resultado
     *   real correspondente.
     */
    public avaliar(
        nomeFator: string,
        entradas: FactorEvaluationInput[]
    ): FactorEvaluationResult {

        this.validarNome(nomeFator);
        this.validarEntradas(entradas);

        if (entradas.length === 0) {
            return {
                fator: nomeFator,
                amostras: 0,
                mediaScore: 0,
                acertos: 0,
                erros: 0,
                taxaAcerto: 0,
                discriminacao: 0,
                desempenho: 0
            };
        }

        const scoresPositivos = entradas
            .filter(item => item.resultadoReal)
            .map(item => item.fator);

        const scoresNegativos = entradas
            .filter(item => !item.resultadoReal)
            .map(item => item.fator);

        const acertos = scoresPositivos.length;
        const erros = scoresNegativos.length;

        const mediaScore =
            this.media(
                entradas.map(item => item.fator)
            );

        const mediaPositivos =
            scoresPositivos.length > 0
                ? this.media(scoresPositivos)
                : 0;

        const mediaNegativos =
            scoresNegativos.length > 0
                ? this.media(scoresNegativos)
                : 0;

        /*
         * Mede quanto o fator separa números que
         * apareceram daqueles que não apareceram.
         *
         * Resultado:
         *   positivo → fator favoreceu os acertos
         *   negativo → fator favoreceu os erros
         */
        const discriminacao =
            mediaPositivos - mediaNegativos;

        /*
         * A taxa de acerto aqui representa a
         * proporção de amostras positivas.
         *
         * Não é uma taxa de acerto da loteria.
         * É apenas uma estatística descritiva do
         * conjunto avaliado.
         */
        const taxaAcerto =
            entradas.length > 0
                ? acertos / entradas.length
                : 0;

        /*
         * Desempenho combina:
         *
         * - capacidade de discriminação;
         * - taxa observada de acerto.
         *
         * O valor final é limitado a [-1, 1].
         */
        const desempenho =
            this.clamp(
                discriminacao * 0.7 +
                ((taxaAcerto * 2) - 1) * 0.3,
                -1,
                1
            );

        return {
            fator: nomeFator,
            amostras: entradas.length,
            mediaScore,
            acertos,
            erros,
            taxaAcerto,
            discriminacao,
            desempenho
        };
    }

    /**
     * Avalia vários fatores.
     */
    public avaliarFatores(
        fatores: Record<string, FactorEvaluationInput[]>
    ): FactorEvaluationSummary {

        if (
            !fatores ||
            typeof fatores !== 'object' ||
            Array.isArray(fatores)
        ) {
            throw new Error(
                'FactorEvaluation: fatores inválidos.'
            );
        }

        const resultados =
            Object.entries(fatores).map(
                ([nome, entradas]) =>
                    this.avaliar(nome, entradas)
            );

        if (resultados.length === 0) {
            return {
                fatores: [],
                melhorFator: null,
                piorFator: null
            };
        }

        const ordenados =
            [...resultados].sort(
                (a, b) =>
                    b.desempenho - a.desempenho
            );

        return {
            fatores: resultados,
            melhorFator: ordenados[0].fator,
            piorFator:
                ordenados[ordenados.length - 1].fator
        };
    }

    /**
     * Calcula a média de um conjunto numérico.
     */
    private media(
        valores: number[]
    ): number {

        if (!Array.isArray(valores)) {
            throw new Error(
                'FactorEvaluation: valores devem ser um array.'
            );
        }

        if (valores.length === 0) {
            return 0;
        }

        const soma = valores.reduce(
            (total, valor) =>
                total + valor,
            0
        );

        const resultado =
            soma / valores.length;

        if (!Number.isFinite(resultado)) {
            throw new Error(
                'FactorEvaluation: média inválida.'
            );
        }

        return resultado;
    }

    /**
     * Valida o nome do fator.
     */
    private validarNome(
        nome: string
    ): void {

        if (
            typeof nome !== 'string' ||
            nome.trim().length === 0
        ) {
            throw new Error(
                'FactorEvaluation: nome do fator inválido.'
            );
        }
    }

    /**
     * Valida as entradas.
     */
    private validarEntradas(
        entradas: FactorEvaluationInput[]
    ): void {

        if (!Array.isArray(entradas)) {
            throw new Error(
                'FactorEvaluation: entradas devem ser um array.'
            );
        }

        entradas.forEach((entrada, indice) => {

            if (
                !entrada ||
                typeof entrada !== 'object'
            ) {
                throw new Error(
                    `FactorEvaluation: entrada inválida no índice ${indice}.`
                );
            }

            if (
                !Number.isInteger(entrada.numero) ||
                entrada.numero < 0
            ) {
                throw new Error(
                    `FactorEvaluation: número inválido no índice ${indice}.`
                );
            }

            if (
                typeof entrada.fator !== 'number' ||
                !Number.isFinite(entrada.fator)
            ) {
                throw new Error(
                    `FactorEvaluation: score inválido no índice ${indice}.`
                );
            }

            if (
                typeof entrada.resultadoReal !== 'boolean'
            ) {
                throw new Error(
                    `FactorEvaluation: resultadoReal inválido no índice ${indice}.`
                );
            }
        });
    }

    /**
     * Limita o resultado ao intervalo informado.
     */
    private clamp(
        valor: number,
        minimo: number,
        maximo: number
    ): number {

        if (!Number.isFinite(valor)) {
            throw new Error(
                'FactorEvaluation: valor não finito.'
            );
        }

        return Math.min(
            maximo,
            Math.max(minimo, valor)
        );
    }
}
