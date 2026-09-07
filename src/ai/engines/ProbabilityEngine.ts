// ============================================
// CAMINHO: src/ai/engines/ProbabilityEngine.ts
// DATA CRIAÇÃO:  07/09/2026
// STATUS: ⏳ PENDENTE APROVAÇÃO
// VERSÃO: 2.1.0 (INTEGRAÇÃO ADAPTATIVA)
// ============================================

// ============================================
// SEÇÃO 1: IMPORTS
// SEÇÃO 2: PROBABILITY ENGINE
// SEÇÃO 3: MÉTODO GERAR JOGOS
// SEÇÃO 4: CÁLCULO DE SCORES
// SEÇÃO 5: CONFIGURAÇÃO E VALIDAÇÃO
// SEÇÃO 6: EXPORTS
// ============================================

// ============================================
// SEÇÃO 1: IMPORTS
// ============================================

import {
    BaseEngine,
    EngineConfig,
    EngineExtras,
    EngineResult,
    JogoGerado
} from './BaseEngine';

import { FrequencyAnalyzer } from '../analysis/FrequencyAnalyzer';
import { ProbabilityAnalyzer } from '../analysis/ProbabilityAnalyzer';
import { ConfidenceCalculator } from '../evaluation/ConfidenceCalculator';
import { ScoreItem } from '../types';
import { AdaptiveWeights } from '../services/AdaptiveWeights';
import type { PredictiveScoringWeights } from '../services/PredictiveScoring';

// ============================================
// SEÇÃO 2: PROBABILITY ENGINE
// ============================================

/**
 * Motor de IA Probabilística ⭐ PRO
 *
 * Responsabilidade:
 * - Aplicar distribuição binomial
 * - Calcular entropia e variância
 * - Combinar probabilidade com frequência
 * - Calibrar a influência desses sinais com os pesos
 *   adaptativos previamente aprovados para a loteria
 *
 * Importante:
 * - A identidade da engine permanece probabilística.
 * - O aprendizado adaptativo não substitui os analisadores
 *   ProbabilityAnalyzer e FrequencyAnalyzer.
 * - Os 12 fatores adaptativos são usados como uma camada
 *   de calibração dos dois sinais nativos desta engine.
 *
 * Fluxo:
 * 1. Obtém dados de probabilidade e frequência
 * 2. Obtém os pesos adaptativos da loteria
 * 3. Converte os 12 pesos em dois fatores de calibração:
 *    probabilidade e evidências complementares
 * 4. Recalibra os pesos nativos 60/40 mantendo sua razão
 *    como ponto de partida
 * 5. Calcula o score combinado
 * 6. Chama selecionarNumeros() da BaseEngine
 * 7. Retorna jogos com explicações
 *
 * Características:
 * - Exclusivo para assinantes PRO
 * - Requer mínimo de 20 concursos
 * - Base matemática: binomial, entropia, variância
 * - Utiliza pesos adaptativos calibrados por loteria
 *
 * @throws Error se dados forem insuficientes, dependências não
 * inicializadas ou pesos adaptativos estiverem ausentes/inválidos
 */
export class ProbabilityEngine extends BaseEngine {

    /**
     * Calculadora de confiança
     */
    private confidenceCalc: ConfidenceCalculator;

    /**
     * Número mínimo de concursos para operar
     */
    private readonly MIN_DRAWS = 20;

    /**
     * Pesos nativos da Probability Engine.
     *
     * Estes pesos continuam representando a identidade original
     * da engine:
     * - Probabilidade: 60%
     * - Frequência: 40%
     *
     * Os pesos adaptativos não substituem este contrato.
     * Eles calibram a influência relativa dos dois sinais.
     */
    private weights = {
        probabilidade: 0.60,
        frequencia: 0.40
    };

    /**
     * Pesos adaptativos aprovados para a loteria atual.
     */
    private readonly adaptiveWeights: PredictiveScoringWeights;

    constructor(
        dados: number[][],
        config: EngineConfig,
        isPro: boolean = false,
        extras?: EngineExtras
    ) {
        super(dados, config, isPro, extras);

        this.confidenceCalc = new ConfidenceCalculator();

        // --------------------------------------------
        // Validação inicial
        // --------------------------------------------
        this.validarDependencias();
        this.validarPro();

        // --------------------------------------------
        // Carrega os pesos adaptativos específicos
        // da loteria.
        //
        // Sem fallback: se não houver calibração válida,
        // a engine deve falhar explicitamente.
        // --------------------------------------------
        this.adaptiveWeights =
            AdaptiveWeights.getPesos(this.config.lotteryType);
    }

    // ============================================
    // SEÇÃO 3: MÉTODO GERAR JOGOS
    // ============================================

    getNome(): string {
        return '📈 IA Probabilística ⭐ PRO';
    }

    getDescricao(): string {
        return 'Distribuição binomial, entropia, variância e calibração adaptativa';
    }

    isDisponivel(): boolean {
        return this.isPro;
    }

    gerarJogos(
        quantidade: number,
        seed: number,
        params: any = {}
    ): EngineResult {

        // ============================================
        // VALIDAÇÕES EXPLÍCITAS - SEM FALLBACK
        // ============================================

        this.validarPro();
        this.validarContexto();
        this.validarQuantidade(quantidade);
        this.validarDadosSuficientes();

        // ============================================
        // OBTÉM ANALISADORES COM VALIDAÇÃO
        // ============================================

        const probability = this.obterProbability();
        const frequency = this.obterFrequency();

        // ============================================
        // CALIBRA OS PESOS NATIVOS
        // ============================================

        const pesosCalibrados =
            this.calcularPesosCalibrados();

        // ============================================
        // CALCULA SCORES
        // DETERMINÍSTICO - SEM SEED
        // ============================================

        const scores = this.calcularScores(
            probability,
            frequency,
            pesosCalibrados
        );

        // ============================================
        // GERA SEEDS DETERMINÍSTICAS
        // ============================================

        const seeds = this.gerarSeeds(quantidade, seed);

        // ============================================
        // GERA JOGOS
        // ============================================

        const jogos: JogoGerado[] = [];
        let jogosGerados: number[][] = [];

        for (let i = 0; i < quantidade; i++) {

            // Seleciona números usando a arquitetura
            // unificada da BaseEngine.
            const numeros = this.selecionarNumeros(
                scores,
                this.config.numerosPadrao,
                seeds[i],
                jogosGerados
            );

            // Cria o jogo.
            const jogo = this.criarJogo(
                numeros,
                seeds[i],
                [
                    '📈 Baseado em distribuição binomial',
                    '📊 Entropia e variância calculadas',
                    '🧠 Pesos adaptativos calibrados por histórico'
                ]
            );

            jogos.push(jogo);
            jogosGerados.push(numeros);
        }

        // ============================================
        // CALCULA CONFIANÇA
        // ============================================

        const confianca = this.confidenceCalc.calcularCompleta(
            this.dados,
            ['frequencia', 'probabilidade']
        );

        // Aplica boost de confiança para análise probabilística.
        const confidenceBoost = 10;
        const confidenceFinal =
            Math.min(
                confianca.confianca + confidenceBoost,
                90
            );

        return {
            games: jogos,
            confidence: confidenceFinal,
            engineName: this.getNome(),
            explanation: [
                `📈 ${this.dados.length} concursos analisados`,
                `🎯 Confiança: ${confidenceFinal.toFixed(0)}%`,
                `📊 Entropia: ${probability.getEntropia().toFixed(3)}`,
                `📊 Variância: ${probability.getVariancia().toFixed(3)}`,
                `🧠 Peso adaptativo — probabilidade: ${this.adaptiveWeights.probabilidade.toFixed(3)}`,
                `🧠 Peso adaptativo — evidências complementares: ${this.calcularPesoComplementar().toFixed(3)}`,
                `⚖️ Pesos efetivos — probabilidade: ${pesosCalibrados.probabilidade.toFixed(3)}`,
                `⚖️ Pesos efetivos — frequência: ${pesosCalibrados.frequencia.toFixed(3)}`
            ]
        };
    }

    // ============================================
    // SEÇÃO 4: CÁLCULO DE SCORES
    // ============================================

    /**
     * Calcula scores probabilísticos para todos os números.
     *
     * A engine mantém seus dois sinais nativos:
     *
     *   probabilidade
     *   frequência
     *
     * Os 12 pesos adaptativos são reduzidos a dois fatores
     * de calibração:
     *
     * 1. probabilidade:
     *    peso adaptativo "probabilidade"
     *
     * 2. evidências complementares:
     *    média dos demais 11 fatores
     *
     * A razão original 60/40 é então recalibrada por esses
     * dois fatores e normalizada para voltar a somar 1.
     *
     * Isso evita substituir a identidade da ProbabilityEngine
     * pelo PredictiveScoring completo.
     *
     * O cálculo permanece determinístico.
     */
    private calcularScores(
        probability: ProbabilityAnalyzer,
        frequency: FrequencyAnalyzer,
        pesosCalibrados: {
            probabilidade: number;
            frequencia: number;
        }
    ): ScoreItem[] {

        const min = this.config.incluirZero ? 0 : 1;
        const max = this.config.maxNumero;

        const scores: ScoreItem[] = [];

        // ============================================
        // CALCULA SCORE PARA CADA NÚMERO
        // ============================================

        for (let i = min; i <= max; i++) {

            // --------------------------------------------
            // Probabilidade
            // Já está em escala 0-1.
            // --------------------------------------------

            const probScore =
                probability.getProbabilidade(i);

            // --------------------------------------------
            // Frequência
            // Frequência normalizada (0-100)
            // convertida para 0-1.
            // --------------------------------------------

            const freqScore =
                frequency.getFrequenciaNormalizada(i) / 100;

            if (!Number.isFinite(probScore)) {
                throw new Error(
                    `[ProbabilityEngine] Probabilidade inválida para o número ${i}: ${probScore}`
                );
            }

            if (!Number.isFinite(freqScore)) {
                throw new Error(
                    `[ProbabilityEngine] Frequência inválida para o número ${i}: ${freqScore}`
                );
            }

            // --------------------------------------------
            // Score adaptativamente calibrado.
            // --------------------------------------------

            const score =
                probScore * pesosCalibrados.probabilidade +
                freqScore * pesosCalibrados.frequencia;

            if (!Number.isFinite(score)) {
                throw new Error(
                    `[ProbabilityEngine] Score inválido calculado para o número ${i}.`
                );
            }

            scores.push({
                numero: i,
                score: Math.max(
                    0,
                    Math.min(1, score)
                )
            });
        }

        return scores;
    }

    /**
     * Converte os 12 pesos adaptativos em dois fatores
     * compatíveis com a identidade da ProbabilityEngine.
     *
     * O fator "probabilidade" permanece individual porque
     * corresponde diretamente ao sinal probabilístico nativo.
     *
     * Os outros 11 fatores representam evidências que a
     * ProbabilityEngine não possui como componentes separados.
     * Por isso são agregados pela média aritmética para formar
     * uma única calibração complementar.
     *
     * A seguir, os pesos originais 60/40 são multiplicados pelos
     * fatores adaptativos e normalizados.
     *
     * Fórmula:
     *
     *   P = 0.60 × pesoProbabilidade
     *   F = 0.40 × médiaDemaisFatores
     *
     *   pesoP = P / (P + F)
     *   pesoF = F / (P + F)
     */
    private calcularPesosCalibrados(): {
        probabilidade: number;
        frequencia: number;
    } {

        const pesoProbabilidade =
            this.adaptiveWeights.probabilidade;

        const pesoComplementar =
            this.calcularPesoComplementar();

        if (
            !Number.isFinite(pesoProbabilidade) ||
            pesoProbabilidade <= 0
        ) {
            throw new Error(
                `[ProbabilityEngine] Peso adaptativo de probabilidade inválido para "${this.config.lotteryType}": ${pesoProbabilidade}`
            );
        }

        if (
            !Number.isFinite(pesoComplementar) ||
            pesoComplementar <= 0
        ) {
            throw new Error(
                `[ProbabilityEngine] Peso adaptativo complementar inválido para "${this.config.lotteryType}": ${pesoComplementar}`
            );
        }

        const componenteProbabilidade =
            this.weights.probabilidade *
            pesoProbabilidade;

        const componenteFrequencia =
            this.weights.frequencia *
            pesoComplementar;

        const soma =
            componenteProbabilidade +
            componenteFrequencia;

        if (
            !Number.isFinite(soma) ||
            soma <= 0
        ) {
            throw new Error(
                `[ProbabilityEngine] Soma dos componentes adaptativos inválida: ${soma}`
            );
        }

        return {
            probabilidade:
                componenteProbabilidade / soma,

            frequencia:
                componenteFrequencia / soma
        };
    }

    /**
     * Calcula a média dos 11 fatores adaptativos que não são
     * o fator "probabilidade".
     *
     * Os 11 fatores são:
     * - frequencia
     * - tendenciaFrequencia
     * - estabilidadeFrequencia
     * - atraso
     * - atrasoRelativo
     * - regularidadeAtraso
     * - taxaRecente
     * - intensidadeRecente
     * - persistenciaRecente
     * - distanciaRecente
     * - suportePadrao
     */
    private calcularPesoComplementar(): number {

        const pesosComplementares = [
            this.adaptiveWeights.frequencia,
            this.adaptiveWeights.tendenciaFrequencia,
            this.adaptiveWeights.estabilidadeFrequencia,
            this.adaptiveWeights.atraso,
            this.adaptiveWeights.atrasoRelativo,
            this.adaptiveWeights.regularidadeAtraso,
            this.adaptiveWeights.taxaRecente,
            this.adaptiveWeights.intensidadeRecente,
            this.adaptiveWeights.persistenciaRecente,
            this.adaptiveWeights.distanciaRecente,
            this.adaptiveWeights.suportePadrao
        ];

        if (
            pesosComplementares.length !== 11
        ) {
            throw new Error(
                '[ProbabilityEngine] Quantidade inesperada de fatores complementares.'
            );
        }

        for (const peso of pesosComplementares) {
            if (
                !Number.isFinite(peso) ||
                peso < 0
            ) {
                throw new Error(
                    `[ProbabilityEngine] Peso adaptativo complementar inválido: ${peso}`
                );
            }
        }

        const soma =
            pesosComplementares.reduce(
                (total, peso) => total + peso,
                0
            );

        if (
            !Number.isFinite(soma) ||
            soma <= 0
        ) {
            throw new Error(
                `[ProbabilityEngine] Soma dos pesos complementares inválida: ${soma}`
            );
        }

        return soma / pesosComplementares.length;
    }

    // ============================================
    // SEÇÃO 5: MÉTODOS DE VALIDAÇÃO
    // ============================================

    /**
     * Valida dependências no construtor.
     */
    private validarDependencias(): void {
        if (!this.dados) {
            throw new Error(
                '[ProbabilityEngine] Dados históricos não carregados.'
            );
        }
    }

    /**
     * Valida se o usuário tem permissão PRO.
     */
    private validarPro(): void {
        if (!this.isPro) {
            throw new Error(
                '[ProbabilityEngine] Motor exclusivo para assinantes PRO.'
            );
        }
    }

    /**
     * Valida contexto antes de gerar jogos.
     */
    private validarContexto(): void {
        if (!this.context) {
            throw new Error(
                '[ProbabilityEngine] StatisticsContext não foi inicializado. ' +
                `Dados disponíveis: ${this.dados?.length || 0} concursos.`
            );
        }
    }

    /**
     * Valida quantidade de dados (mínimo 20 concursos).
     */
    private validarDadosSuficientes(): void {
        if (this.dados.length < this.MIN_DRAWS) {
            throw new Error(
                `[ProbabilityEngine] Dados insuficientes: ${this.dados.length} concursos. ` +
                `Mínimo esperado: ${this.MIN_DRAWS} concursos para análise probabilística.`
            );
        }
    }

    /**
     * Valida quantidade de jogos.
     */
    private validarQuantidade(
        quantidade: number
    ): void {

        if (
            !Number.isInteger(quantidade) ||
            quantidade <= 0
        ) {
            throw new Error(
                `[ProbabilityEngine] Quantidade inválida: ${quantidade}. ` +
                'Deve ser um inteiro maior que 0.'
            );
        }

        if (quantidade > 100) {
            throw new Error(
                `[ProbabilityEngine] Quantidade excede o limite: ${quantidade}. ` +
                'Máximo permitido: 100 jogos por chamada.'
            );
        }
    }

    // ============================================
    // SEÇÃO 6: MÉTODOS DE OBTENÇÃO DE ANALISADORES
    // ============================================

    /**
     * Obtém ProbabilityAnalyzer com validação.
     */
    private obterProbability(): ProbabilityAnalyzer {
        if (!this.context) {
            throw new Error(
                '[ProbabilityEngine] StatisticsContext indisponível ao obter ProbabilityAnalyzer.'
            );
        }

        if (!this.context.probability) {
            throw new Error(
                '[ProbabilityEngine] ProbabilityAnalyzer não foi inicializado.'
            );
        }

        return this.context.probability;
    }

    /**
     * Obtém FrequencyAnalyzer com validação.
     */
    private obterFrequency(): FrequencyAnalyzer {
        if (!this.context) {
            throw new Error(
                '[ProbabilityEngine] StatisticsContext indisponível ao obter FrequencyAnalyzer.'
            );
        }

        if (!this.context.frequency) {
            throw new Error(
                '[ProbabilityEngine] FrequencyAnalyzer não foi inicializado.'
            );
        }

        return this.context.frequency;
    }

    // ============================================
    // SEÇÃO 7: MÉTODOS DE CONFIGURAÇÃO
    // ============================================

    /**
     * Atualiza os pesos nativos do score.
     *
     * Estes pesos continuam representando os dois sinais
     * próprios da ProbabilityEngine e devem somar 1.
     *
     * Os pesos adaptativos continuam sendo aplicados como
     * calibração sobre estes pesos.
     */
    setWeights(
        weights: Partial<typeof this.weights>
    ): void {

        const novosPesos = {
            ...this.weights,
            ...weights
        };

        // Valida valores individuais.
        Object.entries(novosPesos).forEach(
            ([nome, valor]) => {

                if (
                    !Number.isFinite(valor) ||
                    valor < 0
                ) {
                    throw new Error(
                        `[ProbabilityEngine] Peso inválido para "${nome}": ${valor}`
                    );
                }
            }
        );

        // Valida soma dos pesos.
        const soma =
            Object.values(novosPesos)
                .reduce(
                    (acc, val) => acc + val,
                    0
                );

        if (
            Math.abs(soma - 1) > 0.001
        ) {
            throw new Error(
                `[ProbabilityEngine] Soma dos pesos é ${soma.toFixed(3)}, esperado 1.`
            );
        }

        this.weights = novosPesos;
    }

    /**
     * Obtém os pesos nativos atuais.
     */
    getWeights(): typeof this.weights {
        return {
            ...this.weights
        };
    }

    /**
     * Obtém os pesos adaptativos carregados para a loteria.
     *
     * Retorna cópia para impedir alteração externa.
     */
    getAdaptiveWeights(): PredictiveScoringWeights {
        return {
            ...this.adaptiveWeights
        };
    }

    /**
     * Obtém os pesos efetivos após a calibração adaptativa.
     */
    getCalibratedWeights(): {
        probabilidade: number;
        frequencia: number;
    } {
        return {
            ...this.calcularPesosCalibrados()
        };
    }

    /**
     * Obtém a entropia atual da distribuição.
     */
    getEntropia(): number {
        if (
            !this.context ||
            !this.context.probability
        ) {
            throw new Error(
                '[ProbabilityEngine] ProbabilityAnalyzer indisponível para obter entropia.'
            );
        }

        return this.context.probability.getEntropia();
    }

    /**
     * Obtém a variância atual da distribuição.
     */
    getVariancia(): number {
        if (
            !this.context ||
            !this.context.probability
        ) {
            throw new Error(
                '[ProbabilityEngine] ProbabilityAnalyzer indisponível para obter variância.'
            );
        }

        return this.context.probability.getVariancia();
    }

    /**
     * Valida se os pesos nativos são válidos.
     */
    validarPesos(): boolean {
        const soma =
            Object.values(this.weights)
                .reduce(
                    (acc, val) => acc + val,
                    0
                );

        return Math.abs(soma - 1) < 0.001;
    }

    /**
     * Valida se os pesos adaptativos carregados
     * estão estruturalmente utilizáveis pela engine.
     */
    validarPesosAdaptativos(): boolean {

        try {
            const pesoComplementar =
                this.calcularPesoComplementar();

            return (
                Number.isFinite(
                    this.adaptiveWeights.probabilidade
                ) &&
                this.adaptiveWeights.probabilidade > 0 &&
                Number.isFinite(pesoComplementar) &&
                pesoComplementar > 0
            );

        } catch {
            return false;
        }
    }
}

// ============================================
// EXPORTS
// ============================================

export default ProbabilityEngine;
