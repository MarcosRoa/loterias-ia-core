// ============================================
// CAMINHO: src/ai/engines/SmartRandomEngine.ts
// VERSÃO: 2.2.0 (INTEGRAÇÃO ADAPTATIVA POSICIONAL)  09/09/2026
// ============================================

import {
    BaseEngine,
    EngineConfig,
    EngineExtras,
    EngineResult,
    JogoGerado
} from './BaseEngine';

import { FrequencyAnalyzer } from '../analysis/FrequencyAnalyzer';
import { ConfidenceCalculator } from '../evaluation/ConfidenceCalculator';

import {
    EngineLearningBridge,
    SmartRandomLearningContext,
    SuperSeteLearningContext
} from '../services/EngineLearningBridge';

export class SmartRandomEngine extends BaseEngine {
    private confidenceCalc: ConfidenceCalculator;
    private smartRandomLearning!: SmartRandomLearningContext;
    private superSeteLearning!: SuperSeteLearningContext;

    constructor(
        dados: number[][],
        config: EngineConfig,
        isPro: boolean = false,
        extras?: EngineExtras
    ) {
        super(dados, config, isPro, extras);
        this.confidenceCalc = new ConfidenceCalculator();
    }

    getNome(): string {
        return '🎲 Aleatório Inteligente';
    }

    getDescricao(): string {
        return 'Aleatório com ponderação estatística';
    }

    gerarJogos(
        quantidade: number,
        seed: number,
        params: any = {}
    ): EngineResult {
        if (!this.context) {
            throw new Error(
                '[SmartRandomEngine] StatisticsContext não foi inicializado.'
            );
        }

        if (!Number.isInteger(quantidade) || quantidade <= 0) {
            throw new Error(
                `[SmartRandomEngine] Quantidade inválida: ${quantidade}.`
            );
        }

        if (this.dados.length < 10) {
            throw new Error(
                `[SmartRandomEngine] Dados insuficientes: ${this.dados.length} concursos. Mínimo esperado: 10 concursos.`
            );
        }

        const learningBridge = new EngineLearningBridge();

        // ============================================
        // SUPER SETE — FLUXO POSICIONAL EXCLUSIVO
        // ============================================
        if (
            this.config.isSuperSete ||
            this.config.lotteryType === 'supersete'
        ) {
            this.superSeteLearning =
                learningBridge.prepararSuperSete(
                    this.dados,
                    {
                        loteria: this.config.lotteryType,
                        maxNumero: this.config.maxNumero,
                        incluirZero: this.config.incluirZero,
                        quantidadeNumeros: 7,
                        minTreino: 300,
                        passo: 1,
                        topPatternsCount:
                            params.topPatternsCount ?? 10,
                        numbersPerPattern:
                            params.numbersPerPattern ?? 5,
                        recentWindow:
                            params.recentWindow ?? 20
                    }
                );

            const jogos: JogoGerado[] = [];
            const jogosGerados: number[][] = [];

            for (let i = 0; i < quantidade; i++) {
                const numeros =
                    this.selecionarSuperSete(
                        this.superSeteLearning.scoresPorPosicao,
                        seed + i,
                        jogosGerados
                    );

                const jogo = this.criarJogo(
                    numeros,
                    seed + i,
                    [
                        '🎲 Aleatório inteligente adaptativo',
                        '🧠 Aprendizado adaptativo posicional ativo',
                        '📈 Cada coluna analisada separadamente',
                        '📊 7 posições × 10 dígitos'
                    ]
                );

                // Para o Super Sete, numeros representa a ordem
                // posicional e colunas é a representação estrutural.
                jogo.colunas =
                    numeros.map(numero => [numero]);

                jogos.push(jogo);
                jogosGerados.push(numeros);
            }

            const confianca =
                this.confidenceCalc.calcularCompleta(
                    this.dados,
                    ['frequencia']
                );

            return {
                games: jogos,
                confidence: Math.min(
                    confianca.confianca,
                    50
                ),
                engineName: this.getNome(),
                explanation: [
                    `🎲 ${this.dados.length} concursos analisados`,
                    '🧠 Aleatoriedade modulada por aprendizado adaptativo posicional',
                    '📈 Super Sete: 7 posições × 10 dígitos',
                    '🎯 Uma seleção independente por posição'
                ]
            };
        }

        // ============================================
        // OUTRAS LOTERIAS — FLUXO ORIGINAL ADAPTATIVO
        // ============================================

        this.smartRandomLearning =
            learningBridge.prepararSmartRandom(
                this.dados,
                {
                    loteria: this.config.lotteryType,
                    maxNumero: this.config.maxNumero,
                    incluirZero: this.config.incluirZero,
                    quantidadeNumeros: this.config.numerosPadrao,
                    minTreino: 300,
                    passo: 1,
                    recentWindow: 20
                }
            );

        const frequency = this.context.frequency;

        if (!frequency) {
            throw new Error(
                '[SmartRandomEngine] FrequencyAnalyzer não foi inicializado.'
            );
        }

        const jogos: JogoGerado[] = [];

        for (let i = 0; i < quantidade; i++) {
            const numeros =
                this.gerarNumerosSmartRandom(
                    frequency,
                    seed + i,
                    this.smartRandomLearning
                );

            const jogo = this.criarJogo(
                numeros,
                seed + i,
                [
                    '🎲 Aleatório ponderado por frequência',
                    '🧠 Aprendizado adaptativo ativo'
                ]
            );

            jogos.push(jogo);
        }

        const confianca =
            this.confidenceCalc.calcularCompleta(
                this.dados,
                ['frequencia']
            );

        return {
            games: jogos,
            confidence: Math.min(
                confianca.confianca,
                50
            ),
            engineName: this.getNome(),
            explanation: [
                `🎲 ${this.dados.length} concursos analisados`,
                '🧠 Aleatoriedade modulada por aprendizado adaptativo',
                '📊 Aleatório com viés estatístico'
            ]
        };
    }

    // ============================================
    // SUPER SETE — SELEÇÃO POSICIONAL
    // ============================================

    private selecionarSuperSete(
        scoresPorPosicao: Array<Array<{
            numero: number;
            score: number;
        }>>,
        seed: number,
        jogosGerados: number[][]
    ): number[] {
        if (scoresPorPosicao.length !== 7) {
            throw new Error(
                `[SmartRandomEngine] Super Sete deve possuir exatamente 7 posições. Recebido: ${scoresPorPosicao.length}.`
            );
        }

        const numeros: number[] = [];

        for (let posicao = 0; posicao < 7; posicao++) {
            const scores = scoresPorPosicao[posicao];

            if (!Array.isArray(scores) || scores.length !== 10) {
                throw new Error(
                    `[SmartRandomEngine] Posição ${posicao + 1} deve possuir exatamente 10 dígitos.`
                );
            }

            const pesos = scores.map(item => {
                if (
                    !Number.isInteger(item.numero) ||
                    item.numero < 0 ||
                    item.numero > 9 ||
                    !Number.isFinite(item.score) ||
                    item.score < 0
                ) {
                    throw new Error(
                        `[SmartRandomEngine] Score inválido: posição=${posicao + 1}, número=${item.numero}, score=${item.score}.`
                    );
                }

                return {
                    numero: item.numero,
                    peso: item.score
                };
            });

            const total = pesos.reduce(
                (soma, item) => soma + item.peso,
                0
            );

            if (!Number.isFinite(total) || total <= 0) {
                throw new Error(
                    `[SmartRandomEngine] Soma dos pesos inválida na posição ${posicao + 1}: ${total}.`
                );
            }

            // O SmartRandom continua aleatório:
            // o score adaptativo define a distribuição,
            // e o PRNG define o resultado.
            const rand =
                this.random.next(seed + posicao * 997);

            let acumulado = 0;
            let selecionado: number | null = null;

            for (const item of pesos) {
                acumulado += item.peso / total;

                if (rand <= acumulado) {
                    selecionado = item.numero;
                    break;
                }
            }

            if (selecionado === null) {
                throw new Error(
                    `[SmartRandomEngine] Não foi possível selecionar um dígito na posição ${posicao + 1}.`
                );
            }

            numeros.push(selecionado);
        }

        this.validarDiversidadeSuperSete(
            numeros,
            jogosGerados
        );

        return numeros;
    }

    private validarDiversidadeSuperSete(
        numeros: number[],
        jogosGerados: number[][]
    ): void {
        if (numeros.length !== 7) {
            throw new Error(
                `[SmartRandomEngine] Jogo Super Sete inválido: ${numeros.length} posições.`
            );
        }

        for (const anterior of jogosGerados) {
            if (anterior.length !== 7) {
                throw new Error(
                    '[SmartRandomEngine] Jogo anterior do Super Sete possui estrutura inválida.'
                );
            }

            let iguais = 0;

            for (let posicao = 0; posicao < 7; posicao++) {
                if (numeros[posicao] === anterior[posicao]) {
                    iguais++;
                }
            }

            if (iguais >= 6) {
                throw new Error(
                    '[SmartRandomEngine] Não foi possível manter a diversidade posicional do Super Sete.'
                );
            }
        }
    }

    // ============================================
    // OUTRAS LOTERIAS — FLUXO ORIGINAL
    // ============================================

    private gerarNumerosSmartRandom(
        frequency: FrequencyAnalyzer,
        seed: number,
        learning: SmartRandomLearningContext
    ): number[] {
        const quantidade = this.config.numerosPadrao;
        const min = this.config.incluirZero ? 0 : 1;
        const max = this.config.maxNumero;
        const numeros = new Set<number>();

        const scores: {
            numero: number;
            peso: number;
        }[] = [];

        for (let i = min; i <= max; i++) {
            const freq = frequency.getFrequencia(i);

            const aprendido =
                learning.scoresAdaptativos.find(
                    item => item.numero === i
                );

            if (!aprendido) {
                throw new Error(
                    `[SmartRandomEngine] Score adaptativo ausente para o número ${i}.`
                );
            }

            const fatorAdaptativo =
                aprendido.score > 0
                    ? aprendido.score
                    : 0;

            const peso =
                freq *
                (0.5 + fatorAdaptativo) +
                this.random.next(seed + i) * 0.5;

            if (!Number.isFinite(peso) || peso < 0) {
                throw new Error(
                    `[SmartRandomEngine] Peso inválido para o número ${i}: ${peso}.`
                );
            }

            scores.push({
                numero: i,
                peso
            });
        }

        const total = scores.reduce(
            (acc, s) => acc + s.peso,
            0
        );

        if (!Number.isFinite(total) || total <= 0) {
            throw new Error(
                `[SmartRandomEngine] Soma dos pesos inválida: ${total}.`
            );
        }

        for (let i = 0; i < quantidade; i++) {
            const rand =
                this.random.next(seed + i + 100);

            let acumulado = 0;
            let selecionado = false;

            for (const item of scores) {
                acumulado += item.peso / total;

                if (
                    rand <= acumulado &&
                    !numeros.has(item.numero)
                ) {
                    numeros.add(item.numero);
                    selecionado = true;
                    break;
                }
            }

            if (!selecionado) {
                throw new Error(
                    `[SmartRandomEngine] Não foi possível selecionar o número ${i + 1} sem duplicidade.`
                );
            }
        }

        return Array.from(numeros).sort(
            (a, b) => a - b
        );
    }
}

export default SmartRandomEngine;
