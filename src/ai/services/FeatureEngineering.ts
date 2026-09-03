// ============================================
// CAMINHO: src/ai/services/FeatureEngineering.ts
// ============================================
// ============================================
// 03/09/2026
// ============================================
// CAMADA DE ENGENHARIA DE FEATURES
//
// Responsabilidade:
// - Extrair evidências dos analyzers
// - Colocar todas as evidências em escala comparável
// - Produzir um vetor de features por número
//
// NÃO É RESPONSABILIDADE:
// - Escolher números
// - Gerar jogos
// - Definir pesos preditivos
// - Fazer backtesting
// - Aprender
//
// Fluxo:
// StatisticsContext
//       ↓
// FeatureEngineering
//       ↓
// NumberFeature[]
//       ↓
// futura camada de Scoring / Learning
// ============================================

import { StatisticsContext } from './StatisticsContext';

// ============================================
// TIPOS
// ============================================

export interface NumberFeatures {
    numero: number;

    // --------------------------------------------
    // FREQUÊNCIA
    // --------------------------------------------

    /**
     * Frequência histórica normalizada.
     * Escala: 0..1
     */
    frequencia: number;

    /**
     * Tendência temporal da frequência.
     * Escala: 0..1
     *
     * 0 = tendência negativa
     * 0.5 = estável
     * 1 = tendência positiva
     */
    tendenciaFrequencia: number;

    /**
     * Estabilidade da frequência.
     * Escala: 0..1
     */
    estabilidadeFrequencia: number;

    // --------------------------------------------
    // ATRASO
    // --------------------------------------------

    /**
     * Atraso normalizado.
     * Escala: 0..1
     */
    atraso: number;

    /**
     * Atraso relativo ao comportamento histórico
     * do próprio número.
     *
     * Escala original normalizada para 0..1.
     */
    atrasoRelativo: number;

    /**
     * Regularidade histórica dos intervalos.
     * Escala: 0..1
     */
    regularidadeAtraso: number;

    // --------------------------------------------
    // COMPORTAMENTO RECENTE / DISPERSÃO
    // --------------------------------------------

    /**
     * Taxa de ocorrência na janela recente.
     * Escala: 0..1
     */
    taxaRecente: number;

    /**
     * Intensidade recente.
     * Escala: 0..1
     */
    intensidadeRecente: number;

    /**
     * Persistência na janela recente.
     * Escala: 0..1
     */
    persistenciaRecente: number;

    /**
     * Distância desde a última ocorrência,
     * normalizada para 0..1.
     *
     * 0 = ocorreu muito recentemente
     * 1 = está distante
     */
    distanciaRecente: number;

    // --------------------------------------------
    // PROBABILIDADE
    // --------------------------------------------

    /**
     * Probabilidade histórica calculada pelo
     * ProbabilityAnalyzer.
     *
     * Normalizada e limitada a 0..1.
     */
    probabilidade: number;

    // --------------------------------------------
    // PADRÕES
    // --------------------------------------------

    /**
     * Proporção dos melhores padrões que
     * produziram/indicaram este número.
     *
     * Escala: 0..1
     */
    suportePadrao: number;

    /**
     * Indica se o número aparece em pelo menos
     * um dos melhores padrões.
     */
    presenteEmPadrao: boolean;
}

// ============================================
// CONFIGURAÇÃO
// ============================================

export interface FeatureEngineeringConfig {
    maxNumero: number;
    incluirZero: boolean;

    /**
     * Quantidade de melhores padrões utilizados
     * para extrair evidência de padrão.
     */
    topPatternsCount?: number;

    /**
     * Quantos números cada padrão pode produzir
     * durante a extração.
     */
    numbersPerPattern?: number;

    /**
     * Tamanho da janela utilizada para converter
     * distância recente em escala 0..1.
     *
     * Se omitido, utiliza a janela do DispersionAnalyzer.
     */
    recentWindow?: number;
}

// ============================================
// FEATURE ENGINEERING
// ============================================

export class FeatureEngineering {

    private readonly context: StatisticsContext;
    private readonly config: Required<FeatureEngineeringConfig>;

    constructor(
        context: StatisticsContext,
        config: FeatureEngineeringConfig
    ) {
        if (!context) {
            throw new Error(
                '[FeatureEngineering] StatisticsContext não foi fornecido.'
            );
        }

        if (!Number.isInteger(config.maxNumero) || config.maxNumero < 0) {
            throw new Error(
                `[FeatureEngineering] maxNumero inválido: ${config.maxNumero}.`
            );
        }

        if (!Array.isArray(context.getDados()) || context.getDados().length === 0) {
            throw new Error(
                '[FeatureEngineering] Não existem dados históricos no contexto.'
            );
        }

        const topPatternsCount = config.topPatternsCount ?? 10;
        const numbersPerPattern = config.numbersPerPattern ?? 5;

        if (
            !Number.isInteger(topPatternsCount) ||
            topPatternsCount < 1
        ) {
            throw new Error(
                `[FeatureEngineering] topPatternsCount inválido: ${topPatternsCount}.`
            );
        }

        if (
            !Number.isInteger(numbersPerPattern) ||
            numbersPerPattern < 1
        ) {
            throw new Error(
                `[FeatureEngineering] numbersPerPattern inválido: ${numbersPerPattern}.`
            );
        }

        const recentWindow =
            config.recentWindow ??
            context.dispersion.getWindowSize();

        if (
            !Number.isInteger(recentWindow) ||
            recentWindow < 1
        ) {
            throw new Error(
                `[FeatureEngineering] recentWindow inválido: ${recentWindow}.`
            );
        }

        this.context = context;

        this.config = {
            maxNumero: config.maxNumero,
            incluirZero: config.incluirZero,
            topPatternsCount,
            numbersPerPattern,
            recentWindow
        };
    }

    // ============================================
    // MÉTODO PRINCIPAL
    // ============================================

    /**
     * Extrai todas as features para todos os números
     * válidos da loteria.
     */
    extrairFeatures(): NumberFeatures[] {
        const features: NumberFeatures[] = [];

        const min = this.config.incluirZero ? 0 : 1;

        const suportePadrao = this.calcularSuportePadrao();

        for (let numero = min; numero <= this.config.maxNumero; numero++) {
            features.push(
                this.extrairFeatureNumero(
                    numero,
                    suportePadrao
                )
            );
        }

        return features;
    }

    /**
     * Extrai as features de um único número.
     */
    extrairFeatureNumero(
        numero: number,
        suportePadrao?: Map<number, number>
    ): NumberFeatures {
        this.validarNumero(numero);

        const frequency = this.context.frequency;
        const delay = this.context.delay;
        const dispersion = this.context.dispersion;
        const probability = this.context.probability;

        const frequencia = this.normalizarPercentual(
            frequency.getFrequenciaNormalizada(numero)
        );

        const tendenciaFrequencia = this.limitar01(
            frequency.getScoreTendencia(numero)
        );

        const estabilidadeFrequencia = this.limitar01(
            frequency.getEstabilidade(numero)
        );

        const atraso = this.normalizarPercentual(
            delay.getAtrasoNormalizado(numero)
        );

        const atrasoRelativo = this.normalizarValorRelativo(
            delay.getAtrasoRelativo(numero)
        );

        const regularidadeAtraso = this.limitar01(
            delay.getRegularidade(numero)
        );

        const taxaRecente = this.limitar01(
            dispersion.getTaxaRecente(numero)
        );

        const intensidadeRecente = this.limitar01(
            dispersion.getIntensidade(numero)
        );

        const persistenciaRecente = this.limitar01(
            dispersion.getPersistencia(numero)
        );

        const distanciaBruta = dispersion.getDistanciaUltima(numero);

        const distanciaRecente = this.normalizarDistancia(
            distanciaBruta,
            this.config.recentWindow
        );

        const probabilidade = this.limitar01(
            probability.getProbabilidade(numero)
        );

        const suporte = (
            suportePadrao ??
            this.calcularSuportePadrao()
        ).get(numero) ?? 0;

        return {
            numero,

            frequencia,
            tendenciaFrequencia,
            estabilidadeFrequencia,

            atraso,
            atrasoRelativo,
            regularidadeAtraso,

            taxaRecente,
            intensidadeRecente,
            persistenciaRecente,
            distanciaRecente,

            probabilidade,

            suportePadrao: this.limitar01(suporte),
            presenteEmPadrao: suporte > 0
        };
    }

    // ============================================
    // PADRÕES
    // ============================================

    /**
     * Converte os padrões detectados em evidência
     * por número.
     *
     * Importante:
     * isto NÃO define peso preditivo.
     * Apenas mede suporte estrutural observado.
     */
    private calcularSuportePadrao(): Map<number, number> {
        const suporte = new Map<number, number>();

        const melhoresPadroes =
            this.context.patterns.getMelhoresPadroes(
                this.config.topPatternsCount
            );

        if (!Array.isArray(melhoresPadroes)) {
            throw new Error(
                '[FeatureEngineering] PatternAnalyzer retornou padrões inválidos.'
            );
        }

        if (melhoresPadroes.length === 0) {
            return suporte;
        }

        for (const padrao of melhoresPadroes) {
            const numeros = this.context.patterns.gerarNumerosPorPadrao(
                padrao,
                this.config.numbersPerPattern,
                this.config.maxNumero
            );

            if (!Array.isArray(numeros)) {
                throw new Error(
                    '[FeatureEngineering] PatternAnalyzer retornou números inválidos.'
                );
            }

            for (const numero of new Set(numeros)) {
                this.validarNumero(numero);

                suporte.set(
                    numero,
                    (suporte.get(numero) ?? 0) + 1
                );
            }
        }

        const total = melhoresPadroes.length;

        for (const [numero, quantidade] of suporte.entries()) {
            suporte.set(
                numero,
                quantidade / total
            );
        }

        return suporte;
    }

    // ============================================
    // NORMALIZAÇÃO
    // ============================================

    /**
     * Converte valores percentuais 0..100 para 0..1.
     */
    private normalizarPercentual(valor: number): number {
        if (!Number.isFinite(valor)) {
            throw new Error(
                `[FeatureEngineering] Valor percentual inválido: ${valor}.`
            );
        }

        return this.limitar01(valor / 100);
    }

    /**
     * Valores relativos dos analyzers já devem estar
     * semanticamente próximos de 0..1.
     *
     * Não fazemos uma transformação arbitrária.
     */
    private normalizarValorRelativo(valor: number): number {
        if (!Number.isFinite(valor)) {
            throw new Error(
                `[FeatureEngineering] Valor relativo inválido: ${valor}.`
            );
        }

        return this.limitar01(valor);
    }

    /**
     * Converte distância em uma evidência relativa
     * à janela recente.
     */
    private normalizarDistancia(
        distancia: number,
        janela: number
    ): number {
        if (!Number.isFinite(distancia) || distancia < 0) {
            throw new Error(
                `[FeatureEngineering] Distância inválida: ${distancia}.`
            );
        }

        if (!Number.isInteger(janela) || janela < 1) {
            throw new Error(
                `[FeatureEngineering] Janela inválida: ${janela}.`
            );
        }

        return this.limitar01(distancia / janela);
    }

    private limitar01(valor: number): number {
        if (!Number.isFinite(valor)) {
            throw new Error(
                `[FeatureEngineering] Valor numérico inválido: ${valor}.`
            );
        }

        return Math.max(0, Math.min(1, valor));
    }

    // ============================================
    // VALIDAÇÃO
    // ============================================

    private validarNumero(numero: number): void {
        if (!Number.isInteger(numero)) {
            throw new Error(
                `[FeatureEngineering] Número inválido: ${numero}.`
            );
        }

        const minimo = this.config.incluirZero ? 0 : 1;

        if (
            numero < minimo ||
            numero > this.config.maxNumero
        ) {
            throw new Error(
                `[FeatureEngineering] Número ${numero} fora do intervalo ` +
                `${minimo}-${this.config.maxNumero}.`
            );
        }
    }

    // ============================================
    // MÉTODOS DE INSPEÇÃO
    // ============================================

    getConfig(): Required<FeatureEngineeringConfig> {
        return { ...this.config };
    }

    getFeatureNumero(numero: number): NumberFeatures {
        return this.extrairFeatureNumero(numero);
    }
}

export default FeatureEngineering;
