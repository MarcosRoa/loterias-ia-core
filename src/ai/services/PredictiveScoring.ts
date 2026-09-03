// ============================================
// src/ai/services/PredictiveScoring.ts  03/09/2026
// ============================================
// ============================================
// PREDICTIVE SCORING
// ============================================
// Camada responsável por transformar features
// em um score composto por número.
//
// Fluxo:
// FeatureEngineering
//        ↓
// PredictiveScoring
//        ↓
// ScoreItem { numero, score }
//        ↓
// CandidatePool
//
// IMPORTANTE:
// - Não realiza aprendizado.
// - Não realiza backtesting.
// - Não gera jogos.
// - Não usa aleatoriedade.
// - Não altera os analyzers.
// - Não mascara valores inválidos.
// - Os pesos são baseline inicial e poderão ser
//   substituídos pelo AdaptiveLearning.
// ============================================

export interface PredictiveScoringWeights {
    frequencia: number;
    tendenciaFrequencia: number;
    estabilidadeFrequencia: number;

    atraso: number;
    atrasoRelativo: number;
    regularidadeAtraso: number;

    taxaRecente: number;
    intensidadeRecente: number;
    persistenciaRecente: number;
    distanciaRecente: number;

    probabilidade: number;
    suportePadrao: number;
}

export interface PredictiveScoreItem {
    numero: number;
    score: number;
    componentes: {
        frequencia: number;
        tendenciaFrequencia: number;
        estabilidadeFrequencia: number;

        atraso: number;
        atrasoRelativo: number;
        regularidadeAtraso: number;

        taxaRecente: number;
        intensidadeRecente: number;
        persistenciaRecente: number;
        distanciaRecente: number;

        probabilidade: number;
        suportePadrao: number;
    };
}

export interface PredictiveFeatures {
    numero: number;

    frequencia: number;
    tendenciaFrequencia: number;
    estabilidadeFrequencia: number;

    atraso: number;
    atrasoRelativo: number;
    regularidadeAtraso: number;

    taxaRecente: number;
    intensidadeRecente: number;
    persistenciaRecente: number;
    distanciaRecente: number;

    probabilidade: number;
    suportePadrao: number;

    presenteEmPadrao?: boolean;
}

export class PredictiveScoring {

    /**
     * Baseline inicial.
     *
     * Estes pesos NÃO representam aprendizado.
     * Eles servem apenas para estabelecer uma
     * função de scoring determinística até que
     * o módulo AdaptiveLearning passe a calibrá-los.
     */
    private weights: PredictiveScoringWeights = {
        frequencia: 1.0,
        tendenciaFrequencia: 1.0,
        estabilidadeFrequencia: 1.0,

        atraso: 1.0,
        atrasoRelativo: 1.0,
        regularidadeAtraso: 1.0,

        taxaRecente: 1.0,
        intensidadeRecente: 1.0,
        persistenciaRecente: 1.0,
        distanciaRecente: 1.0,

        probabilidade: 1.0,
        suportePadrao: 1.0
    };

    /**
     * Calcula scores preditivos para todos os números.
     */
    public calcular(features: PredictiveFeatures[]): PredictiveScoreItem[] {

        if (!Array.isArray(features)) {
            throw new Error(
                'PredictiveScoring: features deve ser um array.'
            );
        }

        if (features.length === 0) {
            throw new Error(
                'PredictiveScoring: nenhuma feature foi fornecida.'
            );
        }

        return features.map((feature) => {
            this.validarFeature(feature);

            const componentes = {
                frequencia: this.normalizar(feature.frequencia),
                tendenciaFrequencia: this.normalizar(feature.tendenciaFrequencia),
                estabilidadeFrequencia: this.normalizar(feature.estabilidadeFrequencia),

                atraso: this.normalizar(feature.atraso),
                atrasoRelativo: this.normalizar(feature.atrasoRelativo),
                regularidadeAtraso: this.normalizar(feature.regularidadeAtraso),

                taxaRecente: this.normalizar(feature.taxaRecente),
                intensidadeRecente: this.normalizar(feature.intensidadeRecente),
                persistenciaRecente: this.normalizar(feature.persistenciaRecente),
                distanciaRecente: this.normalizar(feature.distanciaRecente),

                probabilidade: this.normalizar(feature.probabilidade),
                suportePadrao: this.normalizar(feature.suportePadrao)
            };

            const score = this.calcularScore(componentes);

            return {
                numero: feature.numero,
                score,
                componentes
            };
        });
    }

    /**
     * Retorna apenas o formato ScoreItem usado
     * pelo CandidatePool/BaseEngine.
     */
    public calcularScores(
        features: PredictiveFeatures[]
    ): Array<{ numero: number; score: number }> {

        return this.calcular(features).map((item) => ({
            numero: item.numero,
            score: item.score
        }));
    }

    /**
     * Calcula o score composto.
     */
    private calcularScore(
        componentes: PredictiveScoreItem['componentes']
    ): number {

        const pesos = this.weights;

        const somaPesos =
            pesos.frequencia +
            pesos.tendenciaFrequencia +
            pesos.estabilidadeFrequencia +

            pesos.atraso +
            pesos.atrasoRelativo +
            pesos.regularidadeAtraso +

            pesos.taxaRecente +
            pesos.intensidadeRecente +
            pesos.persistenciaRecente +
            pesos.distanciaRecente +

            pesos.probabilidade +
            pesos.suportePadrao;

        if (!Number.isFinite(somaPesos) || somaPesos <= 0) {
            throw new Error(
                'PredictiveScoring: soma dos pesos inválida.'
            );
        }

        const valor =
            componentes.frequencia * pesos.frequencia +
            componentes.tendenciaFrequencia * pesos.tendenciaFrequencia +
            componentes.estabilidadeFrequencia * pesos.estabilidadeFrequencia +

            componentes.atraso * pesos.atraso +
            componentes.atrasoRelativo * pesos.atrasoRelativo +
            componentes.regularidadeAtraso * pesos.regularidadeAtraso +

            componentes.taxaRecente * pesos.taxaRecente +
            componentes.intensidadeRecente * pesos.intensidadeRecente +
            componentes.persistenciaRecente * pesos.persistenciaRecente +
            componentes.distanciaRecente * pesos.distanciaRecente +

            componentes.probabilidade * pesos.probabilidade +
            componentes.suportePadrao * pesos.suportePadrao;

        const score = valor / somaPesos;

        if (!Number.isFinite(score)) {
            throw new Error(
                'PredictiveScoring: score inválido calculado.'
            );
        }

        return this.clamp(score, 0, 1);
    }

    /**
     * Permite substituir os pesos posteriormente
     * pelo módulo AdaptiveLearning.
     */
    public setWeights(
        weights: Partial<PredictiveScoringWeights>
    ): void {

        if (!weights || typeof weights !== 'object') {
            throw new Error(
                'PredictiveScoring: pesos inválidos.'
            );
        }

        const novosPesos = {
            ...this.weights,
            ...weights
        };

        Object.entries(novosPesos).forEach(([nome, peso]) => {
            if (
                !Number.isFinite(peso) ||
                peso < 0
            ) {
                throw new Error(
                    `PredictiveScoring: peso inválido para "${nome}".`
                );
            }
        });

        const soma = Object.values(novosPesos)
            .reduce((total, peso) => total + peso, 0);

        if (!Number.isFinite(soma) || soma <= 0) {
            throw new Error(
                'PredictiveScoring: os pesos devem possuir soma maior que zero.'
            );
        }

        this.weights = novosPesos;
    }

    /**
     * Retorna uma cópia dos pesos atuais.
     */
    public getWeights(): PredictiveScoringWeights {
        return {
            ...this.weights
        };
    }

    /**
     * Validação estrutural das features.
     */
    private validarFeature(
        feature: PredictiveFeatures
    ): void {

        if (!feature || typeof feature !== 'object') {
            throw new Error(
                'PredictiveScoring: feature inválida.'
            );
        }

        if (
            !Number.isInteger(feature.numero) ||
            feature.numero < 0
        ) {
            throw new Error(
                `PredictiveScoring: número inválido: ${feature.numero}`
            );
        }

        const campos: Array<keyof PredictiveFeatures> = [
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

        for (const campo of campos) {
            const valor = feature[campo];

            if (
                typeof valor !== 'number' ||
                !Number.isFinite(valor)
            ) {
                throw new Error(
                    `PredictiveScoring: valor inválido para "${String(campo)}" no número ${feature.numero}.`
                );
            }
        }
    }

    /**
     * Normalização segura de uma feature.
     *
     * Não inventa valores.
     * Não substitui NaN/Infinity.
     * Valores fora do intervalo são limitados.
     */
    private normalizar(valor: number): number {

        if (!Number.isFinite(valor)) {
            throw new Error(
                'PredictiveScoring: tentativa de normalizar valor não finito.'
            );
        }

        return this.clamp(valor, 0, 1);
    }

    /**
     * Limita valor ao intervalo especificado.
     */
    private clamp(
        valor: number,
        minimo: number,
        maximo: number
    ): number {

        if (!Number.isFinite(valor)) {
            throw new Error(
                'PredictiveScoring: valor não finito no clamp.'
            );
        }

        return Math.min(
            maximo,
            Math.max(minimo, valor)
        );
    }
}
