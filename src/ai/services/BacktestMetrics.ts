// ============================================
// src/ai/services/BacktestMetrics.ts
// ============================================
// ============================================
// BACKTEST METRICS   03/09/2026
// ============================================
// Responsável por transformar os resultados do
// Backtesting em métricas objetivas.
//
// Fluxo:
//
// Backtesting
//      ↓
// BacktestPrediction[]
//      ↓
// BacktestMetrics
//      ↓
// métricas de desempenho
//      ↓
// AdaptiveLearning
//
// IMPORTANTE:
// - Não altera pesos.
// - Não aprende.
// - Não gera jogos.
// - Não usa aleatoriedade.
// - Não olha dados futuros.
// - Não mascara erros.
// ============================================

import {
    BacktestPrediction,
    BacktestResult
} from './Backtesting';

export interface BacktestMetricsResult {
    totalTestes: number;
    totalAcertos: number;

    mediaAcertos: number;

    melhorResultado: number;
    piorResultado: number;

    medianaAcertos: number;

    desvioPadraoAcertos: number;

    consistencia: number;

    taxaSucesso: number;

    baselineMedia: number;
    ganhoSobreBaseline: number;

    testesAcimaDoBaseline: number;
    testesAbaixoDoBaseline: number;

    distribuicaoAcertos: Record<number, number>;
}

export interface BaselineConfig {
    mediaAcertos: number;
}

export class BacktestMetrics {

    /**
     * Calcula todas as métricas de um backtest.
     */
    public calcular(
        resultado: BacktestResult,
        baseline?: BaselineConfig
    ): BacktestMetricsResult {

        this.validarResultado(resultado);

        const previsoes = resultado.previsoes;

        if (previsoes.length === 0) {
            return this.resultadoVazio(
                baseline?.mediaAcertos ?? 0
            );
        }

        const acertos = previsoes.map(
            previsao => previsao.acertos
        );

        const totalTestes = acertos.length;

        const totalAcertos = acertos.reduce(
            (total, valor) => total + valor,
            0
        );

        const mediaAcertos =
            totalAcertos / totalTestes;

        const melhorResultado =
            Math.max(...acertos);

        const piorResultado =
            Math.min(...acertos);

        const medianaAcertos =
            this.calcularMediana(acertos);

        const desvioPadraoAcertos =
            this.calcularDesvioPadrao(
                acertos,
                mediaAcertos
            );

        const consistencia =
            this.calcularConsistencia(
                mediaAcertos,
                desvioPadraoAcertos
            );

        const baselineMedia =
            baseline?.mediaAcertos ?? 0;

        if (
            !Number.isFinite(baselineMedia) ||
            baselineMedia < 0
        ) {
            throw new Error(
                'BacktestMetrics: baseline inválido.'
            );
        }

        const ganhoSobreBaseline =
            baselineMedia === 0
                ? mediaAcertos
                : (mediaAcertos - baselineMedia) /
                  baselineMedia;

        const testesAcimaDoBaseline =
            acertos.filter(
                valor => valor > baselineMedia
            ).length;

        const testesAbaixoDoBaseline =
            acertos.filter(
                valor => valor < baselineMedia
            ).length;

        const taxaSucesso =
            totalTestes === 0
                ? 0
                : testesAcimaDoBaseline / totalTestes;

        const distribuicaoAcertos =
            this.calcularDistribuicao(acertos);

        return {
            totalTestes,
            totalAcertos,
            mediaAcertos,
            melhorResultado,
            piorResultado,
            medianaAcertos,
            desvioPadraoAcertos,
            consistencia,
            taxaSucesso,
            baselineMedia,
            ganhoSobreBaseline,
            testesAcimaDoBaseline,
            testesAbaixoDoBaseline,
            distribuicaoAcertos
        };
    }

    /**
     * Calcula somente a média de acertos.
     */
    public calcularMedia(
        previsoes: BacktestPrediction[]
    ): number {

        this.validarPrevisoes(previsoes);

        if (previsoes.length === 0) {
            return 0;
        }

        const total = previsoes.reduce(
            (soma, previsao) =>
                soma + previsao.acertos,
            0
        );

        return total / previsoes.length;
    }

    /**
     * Calcula a mediana.
     */
    public calcularMediana(
        valores: number[]
    ): number {

        if (!Array.isArray(valores)) {
            throw new Error(
                'BacktestMetrics: valores deve ser um array.'
            );
        }

        if (valores.length === 0) {
            return 0;
        }

        valores.forEach(valor => {

            if (
                typeof valor !== 'number' ||
                !Number.isFinite(valor)
            ) {
                throw new Error(
                    'BacktestMetrics: valor inválido para cálculo da mediana.'
                );
            }
        });

        const ordenados = [...valores].sort(
            (a, b) => a - b
        );

        const meio =
            Math.floor(ordenados.length / 2);

        if (ordenados.length % 2 === 0) {
            return (
                ordenados[meio - 1] +
                ordenados[meio]
            ) / 2;
        }

        return ordenados[meio];
    }

    /**
     * Calcula o desvio padrão populacional.
     */
    public calcularDesvioPadrao(
        valores: number[],
        media?: number
    ): number {

        if (!Array.isArray(valores)) {
            throw new Error(
                'BacktestMetrics: valores deve ser um array.'
            );
        }

        if (valores.length === 0) {
            return 0;
        }

        const mediaCalculada =
            media ?? this.calcularMediaNumerica(valores);

        const variancia =
            valores.reduce(
                (soma, valor) => {
                    const diferenca =
                        valor - mediaCalculada;

                    return soma +
                        diferenca * diferenca;
                },
                0
            ) / valores.length;

        const desvio =
            Math.sqrt(variancia);

        if (!Number.isFinite(desvio)) {
            throw new Error(
                'BacktestMetrics: desvio padrão inválido.'
            );
        }

        return desvio;
    }

    /**
     * Mede consistência.
     *
     * Quanto menor a variação em relação à média,
     * maior a consistência.
     *
     * Resultado entre 0 e 1.
     */
    public calcularConsistencia(
        media: number,
        desvioPadrao: number
    ): number {

        if (
            !Number.isFinite(media) ||
            media < 0
        ) {
            throw new Error(
                'BacktestMetrics: média inválida para consistência.'
            );
        }

        if (
            !Number.isFinite(desvioPadrao) ||
            desvioPadrao < 0
        ) {
            throw new Error(
                'BacktestMetrics: desvio padrão inválido para consistência.'
            );
        }

        if (media === 0) {
            return desvioPadrao === 0 ? 1 : 0;
        }

        const coeficienteVariacao =
            desvioPadrao / media;

        const consistencia =
            1 / (1 + coeficienteVariacao);

        return this.clamp(
            consistencia,
            0,
            1
        );
    }

    /**
     * Cria distribuição de frequência dos acertos.
     *
     * Exemplo:
     *
     * {
     *   0: 4,
     *   1: 12,
     *   2: 18,
     *   3: 6
     * }
     */
    public calcularDistribuicao(
        valores: number[]
    ): Record<number, number> {

        if (!Array.isArray(valores)) {
            throw new Error(
                'BacktestMetrics: valores deve ser um array.'
            );
        }

        const distribuicao: Record<number, number> = {};

        valores.forEach(valor => {

            if (
                typeof valor !== 'number' ||
                !Number.isFinite(valor)
            ) {
                throw new Error(
                    'BacktestMetrics: valor inválido na distribuição.'
                );
            }

            const chave = String(valor);

            distribuicao[valor] =
                (distribuicao[valor] ?? 0) + 1;
        });

        return distribuicao;
    }

    /**
     * Calcula ganho relativo sobre o baseline.
     *
     * Exemplo:
     *
     * baseline = 2
     * modelo   = 2.4
     *
     * ganho = 20%
     */
    public calcularGanhoSobreBaseline(
        mediaModelo: number,
        mediaBaseline: number
    ): number {

        if (
            !Number.isFinite(mediaModelo) ||
            mediaModelo < 0
        ) {
            throw new Error(
                'BacktestMetrics: média do modelo inválida.'
            );
        }

        if (
            !Number.isFinite(mediaBaseline) ||
            mediaBaseline < 0
        ) {
            throw new Error(
                'BacktestMetrics: média do baseline inválida.'
            );
        }

        if (mediaBaseline === 0) {
            return mediaModelo;
        }

        return (
            mediaModelo - mediaBaseline
        ) / mediaBaseline;
    }

    /**
     * Valida o resultado completo do backtest.
     */
    private validarResultado(
        resultado: BacktestResult
    ): void {

        if (!resultado || typeof resultado !== 'object') {
            throw new Error(
                'BacktestMetrics: resultado de backtest inválido.'
            );
        }

        if (!Array.isArray(resultado.previsoes)) {
            throw new Error(
                'BacktestMetrics: previsões do backtest inválidas.'
            );
        }

        this.validarPrevisoes(
            resultado.previsoes
        );
    }

    /**
     * Valida previsões individuais.
     */
    private validarPrevisoes(
        previsoes: BacktestPrediction[]
    ): void {

        if (!Array.isArray(previsoes)) {
            throw new Error(
                'BacktestMetrics: previsões devem ser um array.'
            );
        }

        previsoes.forEach(
            (previsao, indice) => {

                if (
                    !previsao ||
                    typeof previsao !== 'object'
                ) {
                    throw new Error(
                        `BacktestMetrics: previsão inválida no índice ${indice}.`
                    );
                }

                if (
                    !Number.isInteger(
                        previsao.concursoIndex
                    ) ||
                    previsao.concursoIndex < 0
                ) {
                    throw new Error(
                        `BacktestMetrics: concursoIndex inválido no índice ${indice}.`
                    );
                }

                if (
                    !Array.isArray(
                        previsao.numerosPrevistos
                    )
                ) {
                    throw new Error(
                        `BacktestMetrics: numerosPrevistos inválidos no índice ${indice}.`
                    );
                }

                if (
                    !Array.isArray(
                        previsao.numerosReais
                    )
                ) {
                    throw new Error(
                        `BacktestMetrics: numerosReais inválidos no índice ${indice}.`
                    );
                }

                if (
                    !Number.isFinite(
                        previsao.acertos
                    ) ||
                    previsao.acertos < 0
                ) {
                    throw new Error(
                        `BacktestMetrics: acertos inválidos no índice ${indice}.`
                    );
                }
            }
        );
    }

    /**
     * Média numérica interna.
     */
    private calcularMediaNumerica(
        valores: number[]
    ): number {

        if (valores.length === 0) {
            return 0;
        }

        const soma = valores.reduce(
            (total, valor) =>
                total + valor,
            0
        );

        return soma / valores.length;
    }

    /**
     * Resultado vazio.
     */
    private resultadoVazio(
        baselineMedia: number
    ): BacktestMetricsResult {

        return {
            totalTestes: 0,
            totalAcertos: 0,
            mediaAcertos: 0,
            melhorResultado: 0,
            piorResultado: 0,
            medianaAcertos: 0,
            desvioPadraoAcertos: 0,
            consistencia: 0,
            taxaSucesso: 0,
            baselineMedia,
            ganhoSobreBaseline: 0,
            testesAcimaDoBaseline: 0,
            testesAbaixoDoBaseline: 0,
            distribuicaoAcertos: {}
        };
    }

    /**
     * Limita valor ao intervalo.
     */
    private clamp(
        valor: number,
        minimo: number,
        maximo: number
    ): number {

        return Math.min(
            maximo,
            Math.max(minimo, valor)
        );
    }
}
