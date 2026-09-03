// ============================================
// src/ai/services/AdaptiveLearning.ts
// ============================================
// ============================================
// ADAPTIVE LEARNING  03/09/2026
// ============================================
// Ajuste controlado dos pesos dos fatores.
//
// Fluxo:
//
// FactorEvaluation
//       ↓
// AdaptiveLearning
//       ↓
// novos pesos
//       ↓
// PredictiveScoring
//
// IMPORTANTE:
// - Não gera jogos.
// - Não usa aleatoriedade.
// - Não altera o banco.
// - Não altera os engines.
// - Não aprende a partir de uma única amostra.
// - Limita alterações por ciclo.
// - Mantém os pesos dentro de limites.
// - Não mascara dados inválidos.
//
// O aprendizado aqui é incremental e controlado.
// O módulo recebe evidências já calculadas e
// transforma essas evidências em ajustes de peso.
// ============================================

import {
    FactorEvaluationResult
} from './FactorEvaluation';

export interface AdaptiveLearningWeights {
    [fator: string]: number;
}

export interface AdaptiveLearningConfig {
    pesoMinimo: number;
    pesoMaximo: number;
    alteracaoMaxima: number;
    amostrasMinimas: number;
    sensibilidade: number;
    suavizacao: number;
}

export interface AdaptiveLearningAdjustment {
    fator: string;
    pesoAnterior: number;
    pesoNovo: number;
    variacao: number;
    desempenho: number;
    amostras: number;
    aplicado: boolean;
    motivo: string;
}

export interface AdaptiveLearningResult {
    pesosAnteriores: AdaptiveLearningWeights;
    pesosNovos: AdaptiveLearningWeights;
    ajustes: AdaptiveLearningAdjustment[];
    alteracoesAplicadas: number;
    estabilidade: number;
}

export class AdaptiveLearning {

    private readonly config: AdaptiveLearningConfig;

    constructor(
        config?: Partial<AdaptiveLearningConfig>
    ) {

        this.config = {
            pesoMinimo: config?.pesoMinimo ?? 0.25,
            pesoMaximo: config?.pesoMaximo ?? 4.0,
            alteracaoMaxima: config?.alteracaoMaxima ?? 0.15,
            amostrasMinimas: config?.amostrasMinimas ?? 100,
            sensibilidade: config?.sensibilidade ?? 0.50,
            suavizacao: config?.suavizacao ?? 0.20
        };

        this.validarConfig();
    }

    /**
     * Ajusta os pesos com base no desempenho
     * observado de cada fator.
     */
    public ajustar(
        pesosAtuais: AdaptiveLearningWeights,
        avaliacao: FactorEvaluationResult[]
    ): AdaptiveLearningResult {

        this.validarPesos(pesosAtuais);
        this.validarAvaliacao(avaliacao);

        const pesosAnteriores = {
            ...pesosAtuais
        };

        const pesosNovos = {
            ...pesosAtuais
        };

        const ajustes: AdaptiveLearningAdjustment[] = [];

        for (const fator of avaliacao) {

            const pesoAnterior =
                pesosAtuais[fator.fator];

            /*
             * Um fator avaliado mas que não existe
             * nos pesos atuais não pode ser inserido
             * silenciosamente.
             */
            if (pesoAnterior === undefined) {
                ajustes.push({
                    fator: fator.fator,
                    pesoAnterior: 0,
                    pesoNovo: 0,
                    variacao: 0,
                    desempenho: fator.desempenho,
                    amostras: fator.amostras,
                    aplicado: false,
                    motivo:
                        'Fator não possui peso correspondente.'
                });

                continue;
            }

            /*
             * Evidência insuficiente:
             * não alteramos o peso.
             */
            if (
                fator.amostras <
                this.config.amostrasMinimas
            ) {

                ajustes.push({
                    fator: fator.fator,
                    pesoAnterior,
                    pesoNovo: pesoAnterior,
                    variacao: 0,
                    desempenho: fator.desempenho,
                    amostras: fator.amostras,
                    aplicado: false,
                    motivo:
                        'Amostras insuficientes para ajuste.'
                });

                continue;
            }

            /*
             * Desempenho já é fornecido pelo
             * FactorEvaluation no intervalo [-1, 1].
             */
            const desempenho =
                this.clamp(
                    fator.desempenho,
                    -1,
                    1
                );

            /*
             * Transformação da evidência em força
             * de ajuste.
             *
             * O desempenho não altera diretamente
             * o peso. A sensibilidade controla o
             * quanto a evidência influencia o ciclo.
             */
            const sinal =
                desempenho *
                this.config.sensibilidade;

            /*
             * Suavização evita alterações bruscas.
             */
            const ajusteBruto =
                pesoAnterior *
                sinal *
                this.config.suavizacao;

            /*
             * Limite absoluto por ciclo.
             */
            const variacao =
                this.clamp(
                    ajusteBruto,
                    -this.config.alteracaoMaxima,
                    this.config.alteracaoMaxima
                );

            const pesoCalculado =
                pesoAnterior + variacao;

            const pesoNovo =
                this.clamp(
                    pesoCalculado,
                    this.config.pesoMinimo,
                    this.config.pesoMaximo
                );

            const variacaoReal =
                pesoNovo - pesoAnterior;

            pesosNovos[fator.fator] =
                pesoNovo;

            ajustes.push({
                fator: fator.fator,
                pesoAnterior,
                pesoNovo,
                variacao: variacaoReal,
                desempenho,
                amostras: fator.amostras,
                aplicado:
                    Math.abs(variacaoReal) > 0,
                motivo:
                    Math.abs(variacaoReal) > 0
                        ? 'Ajuste aplicado com evidência suficiente.'
                        : 'Peso permaneceu estável.'
            });
        }

        const pesosNormalizados =
            this.normalizarPesos(pesosNovos);

        const alteracoesAplicadas =
            ajustes.filter(
                ajuste => ajuste.aplicado
            ).length;

        const estabilidade =
            this.calcularEstabilidade(
                pesosAnteriores,
                pesosNormalizados
            );

        return {
            pesosAnteriores,
            pesosNovos: pesosNormalizados,
            ajustes,
            alteracoesAplicadas,
            estabilidade
        };
    }

    /**
     * Normaliza os pesos mantendo a média em 1.
     *
     * Isso evita que ciclos sucessivos façam
     * todos os pesos crescerem ou diminuírem
     * simultaneamente.
     */
    public normalizarPesos(
        pesos: AdaptiveLearningWeights
    ): AdaptiveLearningWeights {

        this.validarPesos(pesos);

        const nomes =
            Object.keys(pesos);

        if (nomes.length === 0) {
            throw new Error(
                'AdaptiveLearning: nenhum peso fornecido.'
            );
        }

        const soma =
            nomes.reduce(
                (total, nome) =>
                    total + pesos[nome],
                0
            );

        const media =
            soma / nomes.length;

        if (
            !Number.isFinite(media) ||
            media <= 0
        ) {
            throw new Error(
                'AdaptiveLearning: média dos pesos inválida.'
            );
        }

        const resultado: AdaptiveLearningWeights = {};

        for (const nome of nomes) {

            const normalizado =
                pesos[nome] / media;

            resultado[nome] =
                this.clamp(
                    normalizado,
                    this.config.pesoMinimo,
                    this.config.pesoMaximo
                );
        }

        return resultado;
    }

    /**
     * Calcula a estabilidade entre dois conjuntos
     * de pesos.
     *
     * 1 = nenhuma alteração
     * 0 = alteração máxima observada.
     */
    public calcularEstabilidade(
        anteriores: AdaptiveLearningWeights,
        novos: AdaptiveLearningWeights
    ): number {

        this.validarPesos(anteriores);
        this.validarPesos(novos);

        const fatores =
            Object.keys(anteriores);

        if (fatores.length === 0) {
            return 1;
        }

        let somaAlteracoes = 0;

        for (const fator of fatores) {

            if (novos[fator] === undefined) {
                throw new Error(
                    `AdaptiveLearning: peso ausente para "${fator}".`
                );
            }

            const diferenca =
                Math.abs(
                    novos[fator] -
                    anteriores[fator]
                );

            somaAlteracoes += diferenca;
        }

        const mediaAlteracao =
            somaAlteracoes /
            fatores.length;

        const estabilidade =
            1 -
            (
                mediaAlteracao /
                this.config.alteracaoMaxima
            );

        return this.clamp(
            estabilidade,
            0,
            1
        );
    }

    /**
     * Valida os pesos atuais.
     */
    private validarPesos(
        pesos: AdaptiveLearningWeights
    ): void {

        if (
            !pesos ||
            typeof pesos !== 'object' ||
            Array.isArray(pesos)
        ) {
            throw new Error(
                'AdaptiveLearning: pesos inválidos.'
            );
        }

        Object.entries(pesos).forEach(
            ([fator, peso]) => {

                if (
                    typeof fator !== 'string' ||
                    fator.trim().length === 0
                ) {
                    throw new Error(
                        'AdaptiveLearning: nome de fator inválido.'
                    );
                }

                if (
                    typeof peso !== 'number' ||
                    !Number.isFinite(peso) ||
                    peso <= 0
                ) {
                    throw new Error(
                        `AdaptiveLearning: peso inválido para "${fator}".`
                    );
                }
            }
        );
    }

    /**
     * Valida os resultados dos fatores.
     */
    private validarAvaliacao(
        avaliacao: FactorEvaluationResult[]
    ): void {

        if (!Array.isArray(avaliacao)) {
            throw new Error(
                'AdaptiveLearning: avaliação deve ser um array.'
            );
        }

        avaliacao.forEach(
            (fator, indice) => {

                if (
                    !fator ||
                    typeof fator !== 'object'
                ) {
                    throw new Error(
                        `AdaptiveLearning: avaliação inválida no índice ${indice}.`
                    );
                }

                if (
                    typeof fator.fator !== 'string' ||
                    fator.fator.trim().length === 0
                ) {
                    throw new Error(
                        `AdaptiveLearning: nome de fator inválido no índice ${indice}.`
                    );
                }

                if (
                    !Number.isInteger(fator.amostras) ||
                    fator.amostras < 0
                ) {
                    throw new Error(
                        `AdaptiveLearning: quantidade de amostras inválida no índice ${indice}.`
                    );
                }

                if (
                    typeof fator.desempenho !== 'number' ||
                    !Number.isFinite(fator.desempenho) ||
                    fator.desempenho < -1 ||
                    fator.desempenho > 1
                ) {
                    throw new Error(
                        `AdaptiveLearning: desempenho inválido para "${fator.fator}".`
                    );
                }
            }
        );
    }

    /**
     * Valida a configuração.
     */
    private validarConfig(): void {

        if (
            !Number.isFinite(this.config.pesoMinimo) ||
            this.config.pesoMinimo <= 0
        ) {
            throw new Error(
                'AdaptiveLearning: pesoMinimo inválido.'
            );
        }

        if (
            !Number.isFinite(this.config.pesoMaximo) ||
            this.config.pesoMaximo <=
            this.config.pesoMinimo
        ) {
            throw new Error(
                'AdaptiveLearning: pesoMaximo inválido.'
            );
        }

        if (
            !Number.isFinite(this.config.alteracaoMaxima) ||
            this.config.alteracaoMaxima <= 0
        ) {
            throw new Error(
                'AdaptiveLearning: alteracaoMaxima inválida.'
            );
        }

        if (
            !Number.isInteger(this.config.amostrasMinimas) ||
            this.config.amostrasMinimas < 1
        ) {
            throw new Error(
                'AdaptiveLearning: amostrasMinimas inválidas.'
            );
        }

        if (
            !Number.isFinite(this.config.sensibilidade) ||
            this.config.sensibilidade < 0 ||
            this.config.sensibilidade > 1
        ) {
            throw new Error(
                'AdaptiveLearning: sensibilidade deve estar entre 0 e 1.'
            );
        }

        if (
            !Number.isFinite(this.config.suavizacao) ||
            this.config.suavizacao <= 0 ||
            this.config.suavizacao > 1
        ) {
            throw new Error(
                'AdaptiveLearning: suavizacao deve estar entre 0 e 1.'
            );
        }
    }

    /**
     * Limita um valor ao intervalo informado.
     */
    private clamp(
        valor: number,
        minimo: number,
        maximo: number
    ): number {

        if (!Number.isFinite(valor)) {
            throw new Error(
                'AdaptiveLearning: valor não finito.'
            );
        }

        return Math.min(
            maximo,
            Math.max(minimo, valor)
        );
    }
}
