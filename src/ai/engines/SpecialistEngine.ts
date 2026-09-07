// ============================================
// CAMINHO: src/ai/engines/SpecialistEngine.ts
// DATA CRIAÇÃO: 2026-01-20
// STATUS: INTEGRAÇÃO ADAPTATIVA
// VERSÃO: 2.2.0 (INTEGRAÇÃO ADAPTATIVA)
// ============================================ 
// 
// SEÇÃO 1: IMPORTS
// SEÇÃO 2: SPECIALIST ENGINE
// SEÇÃO 3: MÉTODO GERAR JOGOS
// SEÇÃO 4: CÁLCULO DE SCORES
// SEÇÃO 5: EXPORTS
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
import { DelayAnalyzer } from '../analysis/DelayAnalyzer';
import { DispersionAnalyzer } from '../analysis/DispersionAnalyzer';
import { PatternAnalyzer } from '../analysis/PatternAnalyzer';
import { ConfidenceCalculator } from '../evaluation/ConfidenceCalculator';
import { GameEvaluator } from '../evaluation/GameEvaluator';
import { ScoreItem } from '../types';
import {
    EngineLearningBridge,
    SpecialistLearningContext
} from '../services/EngineLearningBridge';

// ============================================
// SEÇÃO 2: SPECIALIST ENGINE
// ============================================

/**
 * Motor de IA Especialista
 * 
 * Responsabilidade:
 * - Avaliar e selecionar os melhores jogos
 * - Gerar múltiplos candidatos independentes
 * - Deixar o GameEvaluator decidir os melhores
 * - Aplicar diversificação APENAS no resultado final
 * 
 * Fluxo:
 * 1. Obtém dados de múltiplos analisadores
 * 2. Calcula scores para todos os números (determinístico)
 * 3. Gera múltiplos candidatos INDEPENDENTES (sem diversificação)
 * 4. Avalia cada candidato com GameEvaluator
 * 5. Seleciona os melhores por score
 * 6. Aplica diversificação APENAS nos selecionados
 * 7. Retorna jogos com explicações
 * 
 * Características:
 * - Gera mais candidatos para selecionar os melhores
 * - Candidatos são independentes entre si
 * - Diversificação só no resultado final
 * - Usa GameEvaluator para avaliar qualidade
 * 
 * @throws Error se dados forem insuficientes ou dependências não inicializadas
 * 
 * @example
 * ```typescript
 * const engine = new SpecialistEngine(dados, config, isPro, extras);
 * const result = engine.gerarJogos(5, 12345, { 
 *   dispersao: 15,
 *   multiplicadorCandidatos: 5 
 * });
 * ```
 */
export class SpecialistEngine extends BaseEngine {
    /**
     * Calculadora de confiança
     */
    private confidenceCalc: ConfidenceCalculator;

    /**
     * Avaliador de jogos
     */
    private evaluator: GameEvaluator;

    /**
     * Fator multiplicador de candidatos (gera N vezes mais)
     */
    private candidatoMultiplier: number = 5;

    /**
     * Pesos para o cálculo do score
     * 
     * A Specialist Engine combina:
     * - Frequência: 40%
     * - Atraso: 30%
     * - Padrão: 30%
     * 
     * Nota: A dispersão NÃO faz parte da soma ponderada.
     * Ela é aplicada como uma penalidade posterior ao score,
     * ajustando números que apareceram recentemente.
     */
    private weights = {
        frequencia: 0.40,
        atraso: 0.30,
        padrao: 0.30
    };

    /**
     * Fator de penalidade da dispersão
     */
    private dispersionPenaltyFactor: number = 1.0;

    /**
     * Quantos números gerar por padrão
     */
    private numbersPerPattern: number = 3;

    /**
     * Conhecimento adaptativo fornecido pelo cérebro central.
     * A lógica especialista continua sendo aplicada nesta engine;
     * o aprendizado apenas recalibra seus pesos nativos.
     */
    private specialistLearning!: SpecialistLearningContext;

    constructor(
        dados: number[][],
        config: EngineConfig,
        isPro: boolean = false,
        extras?: EngineExtras
    ) {
        super(dados, config, isPro, extras);
        this.confidenceCalc = new ConfidenceCalculator();
        this.evaluator = new GameEvaluator(config.maxNumero, config.numerosPadrao);
        
        // Validação inicial
        this.validarDependencias();
    }

    // ============================================
    // SEÇÃO 3: MÉTODO GERAR JOGOS
    // ============================================

    getNome(): string {
        return '🎯 IA Especialista';
    }

    getDescricao(): string {
        return 'Avalia e seleciona os melhores jogos';
    }

    gerarJogos(quantidade: number, seed: number, params: any = {}): EngineResult {
        // ============================================
        // VALIDAÇÕES EXPLÍCITAS - SEM FALLBACK
        // ============================================
        this.validarContexto();
        this.validarQuantidade(quantidade);
        this.validarDadosSuficientes();

        // ============================================
        // CÉREBRO ADAPTATIVO CENTRAL
        // ============================================
        const learningBridge = new EngineLearningBridge();

        this.specialistLearning =
            learningBridge.prepararEspecialista(
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

        // ============================================
        // PARÂMETROS
        // ============================================
        const dispersao = params.dispersao || 15;
        if (params.multiplicadorCandidatos !== undefined) {
            this.candidatoMultiplier = params.multiplicadorCandidatos;
        }
        if (params.numbersPerPattern !== undefined) {
            this.numbersPerPattern = params.numbersPerPattern;
        }
        if (params.dispersionPenaltyFactor !== undefined) {
            this.dispersionPenaltyFactor = params.dispersionPenaltyFactor;
        }

        // ============================================
        // OBTÉM ANALISADORES COM VALIDAÇÃO
        // ============================================
        const frequency = this.obterFrequency();
        const delay = this.obterDelay();
        const dispersion = this.obterDispersion(dispersao);
        const patterns = this.obterPatterns();

        // ============================================
        // CALCULA SCORES (DETERMINÍSTICO - SEM SEED)
        // ============================================
        const scores = this.calcularScores(
            frequency,
            delay,
            dispersion,
            patterns,
            this.obterPesosAdaptativos()
        );

        // ============================================
        // GERA CANDIDATOS INDEPENDENTES
        // ⚠️ SEM DIVERSIFICAÇÃO - cada candidato é independente
        // ============================================
        const totalCandidatos = quantidade * this.candidatoMultiplier;
        const seeds = this.gerarSeeds(totalCandidatos, seed);
        
        const candidatos: { numeros: number[]; score: number }[] = [];

        // NÃO PASSAMOS jogosGerados para selecionarNumeros
        // Cada candidato é gerado de forma independente
        for (let i = 0; i < totalCandidatos; i++) {
            // Seleciona números SEM diversificação
            const numeros = this.selecionarNumerosSemDiversificacao(
                scores,
                this.config.numerosPadrao,
                seeds[i]
            );

            // Avalia o jogo
            const avaliacao = this.evaluator.avaliarJogo(numeros);
            
            candidatos.push({
                numeros,
                score: avaliacao.score || 0
            });
        }

        // ============================================
        // SELECIONA OS MELHORES CANDIDATOS
        // ============================================
        candidatos.sort((a, b) => b.score - a.score);
        const selecionados = candidatos.slice(0, quantidade);

        // ============================================
        // APLICA DIVERSIFICAÇÃO APENAS NOS SELECIONADOS
        // ============================================
        const jogos: JogoGerado[] = [];
        const numerosSelecionados: number[][] = [];

        for (let i = 0; i < selecionados.length; i++) {
            const item = selecionados[i];
            
            // Aplica diversificação apenas nos selecionados
            const numerosDiversificados = this.diversificationService.diversificar(
                numerosSelecionados,
                item.numeros,
                seed + i * 1000,
                scores
            );

            const jogo = this.criarJogo(numerosDiversificados, seed + i, [
                '🎯 Selecionado entre múltiplos candidatos',
                `📊 Score: ${item.score.toFixed(0)}%`
            ]);
            
            jogos.push(jogo);
            numerosSelecionados.push(numerosDiversificados);
        }

        // ============================================
        // CALCULA CONFIANÇA
        // ============================================
        const confianca = this.confidenceCalc.calcularCompleta(
            this.dados,
            ['frequencia', 'atraso', 'dispersao', 'padroes']
        );

        return {
            games: jogos,
            confidence: confianca.confianca,
            engineName: this.getNome(),
            explanation: [
                `🎯 ${this.dados.length} concursos analisados`,
                `📊 ${totalCandidatos} candidatos avaliados`,
                `🧠 Pesos adaptativos: ${this.obterResumoPesosAdaptativos()}`,
                `🎯 Confiança: ${confianca.confianca.toFixed(0)}%`
            ]
        };
    }

    // ============================================
    // SEÇÃO 4: CÁLCULO DE SCORES
    // ============================================

    /**
     * Calcula scores para todos os números
     * 
     * ⚠️ Este método é DETERMINÍSTICO.
     * A mesma entrada produz a mesma saída.
     * A aleatoriedade é introduzida apenas na seleção.
     * 
     * @param frequency - Analisador de frequência
     * @param delay - Analisador de atraso
     * @param dispersion - Analisador de dispersão
     * @param patterns - Analisador de padrões
     * @returns Lista de scores
     */
    private calcularScores(
        frequency: FrequencyAnalyzer,
        delay: DelayAnalyzer,
        dispersion: DispersionAnalyzer,
        patterns: PatternAnalyzer,
        pesos: {
            frequencia: number;
            atraso: number;
            padrao: number;
        }
    ): ScoreItem[] {
        const min = this.config.incluirZero ? 0 : 1;
        const max = this.config.maxNumero;
        const scores: ScoreItem[] = [];

        // ============================================
        // OBTÉM NÚMEROS DOS MELHORES PADRÕES
        // ============================================
        const melhoresPadroes = patterns.getMelhoresPadroes(3);
        const padroesNumeros = new Set<number>();
        
        for (const padrao of melhoresPadroes) {
            const nums = patterns.gerarNumerosPorPadrao(
                padrao,
                this.numbersPerPattern,
                max
            );
            for (const n of nums) {
                padroesNumeros.add(n);
            }
        }

        // ============================================
        // CALCULA SCORE PARA CADA NÚMERO
        // ============================================
        for (let i = min; i <= max; i++) {
            // Obtém valores normalizados (0-1)
            const freqScore = frequency.getFrequenciaNormalizada(i) / 100;
            const delayScore = delay.getAtrasoNormalizado(i) / 100;
            const padraoScore = padroesNumeros.has(i) ? 0.9 : 0.1;

            // Aplica os pesos efetivos:
            // os pesos nativos da Especialista preservam sua identidade,
            // enquanto o cérebro adaptativo recalibra a importância de
            // frequência, atraso e padrões.
            let score = (
                freqScore * pesos.frequencia +
                delayScore * pesos.atraso +
                padraoScore * pesos.padrao
            );

            // ============================================
            // APLICA PENALIDADE DE DISPERSÃO
            // A dispersão NÃO faz parte da soma ponderada.
            // Ela é um modificador que penaliza números que
            // apareceram recentemente.
            // ============================================
            score = dispersion.aplicarPenalidade(
                i,
                score
            );

            scores.push({
                numero: i,
                score: Math.max(0, Math.min(1, score)) // Garante [0, 1]
            });
        }

        return scores;
    }

    /**
     * Converte os pesos aprendidos pelo cérebro central em pesos
     * compatíveis com a identidade da Especialista.
     *
     * Frequência:
     * - frequencia
     *
     * Atraso:
     * - atraso
     * - atrasoRelativo
     * - regularidadeAtraso
     *
     * Padrão:
     * - suportePadrao
     *
     * Os pesos nativos 40/30/30 continuam sendo a estrutura do motor;
     * o aprendizado atua como recalibração multiplicativa e o resultado
     * é renormalizado para manter soma 1.
     */
    private obterPesosAdaptativos(): {
        frequencia: number;
        atraso: number;
        padrao: number;
    } {
        if (!this.specialistLearning) {
            throw new Error(
                '[SpecialistEngine] Conhecimento adaptativo não foi preparado antes do cálculo de scores.'
            );
        }

        const aprendidos =
            this.specialistLearning.conhecimento.pesosAdaptativos;

        const fatorFrequencia = aprendidos.frequencia;

        const fatoresAtraso = [
            aprendidos.atraso,
            aprendidos.atrasoRelativo,
            aprendidos.regularidadeAtraso
        ];

        const somaAtraso = fatoresAtraso.reduce(
            (soma, valor) => soma + valor,
            0
        );

        const fatorAtraso =
            somaAtraso / fatoresAtraso.length;

        const fatorPadrao =
            aprendidos.suportePadrao;

        const pesosBrutos = {
            frequencia:
                this.weights.frequencia * fatorFrequencia,
            atraso:
                this.weights.atraso * fatorAtraso,
            padrao:
                this.weights.padrao * fatorPadrao
        };

        const soma = Object.values(pesosBrutos).reduce(
            (total, valor) => total + valor,
            0
        );

        if (
            !Number.isFinite(soma) ||
            soma <= 0
        ) {
            throw new Error(
                `[SpecialistEngine] Não foi possível normalizar os pesos adaptativos da Especialista. Soma=${soma}.`
            );
        }

        return {
            frequencia: pesosBrutos.frequencia / soma,
            atraso: pesosBrutos.atraso / soma,
            padrao: pesosBrutos.padrao / soma
        };
    }

    /**
     * Seleciona números SEM diversificação
     * Usado para gerar candidatos independentes
     */
    private selecionarNumerosSemDiversificacao(
        scores: ScoreItem[],
        quantidade: number,
        seed: number
    ): number[] {
        const pesos = this.scoreNormalizer.normalizar(scores);
        const pool = this.candidatePool.criarPool(scores, this.config.lotteryType);
        const selecionados = this.selectionStrategy.selecionar(pesos, quantidade, { seed, poolSize: this.config.maxNumero });
        return selecionados;
    }

    private obterResumoPesosAdaptativos(): string {
        const pesos = this.obterPesosAdaptativos();

        return (
            `F ${ (pesos.frequencia * 100).toFixed(1)}% | ` +
            `A ${ (pesos.atraso * 100).toFixed(1)}% | ` +
            `P ${ (pesos.padrao * 100).toFixed(1)}%`
        );
    }

    // ============================================
    // MÉTODOS DE VALIDAÇÃO
    // ============================================

    /**
     * Valida dependências no construtor
     */
    private validarDependencias(): void {
        if (!this.dados) {
            throw new Error(
                '[SpecialistEngine] Dados históricos não carregados.'
            );
        }
    }

    /**
     * Valida contexto antes de gerar jogos
     */
    private validarContexto(): void {
        if (!this.context) {
            throw new Error(
                '[SpecialistEngine] StatisticsContext não foi inicializado. ' +
                `Dados disponíveis: ${this.dados?.length || 0} concursos.`
            );
        }
    }

    /**
     * Valida quantidade de dados (mínimo 10 concursos)
     */
    private validarDadosSuficientes(): void {
        if (this.dados.length < 10) {
            throw new Error(
                `[SpecialistEngine] Dados insuficientes: ${this.dados.length} concursos. ` +
                'Mínimo esperado: 10 concursos para análise especialista.'
            );
        }
    }

    /**
     * Valida quantidade de jogos
     */
    private validarQuantidade(quantidade: number): void {
        if (quantidade <= 0) {
            throw new Error(
                `[SpecialistEngine] Quantidade inválida: ${quantidade}. ` +
                'Deve ser maior que 0.'
            );
        }

        if (quantidade > 100) {
            throw new Error(
                `[SpecialistEngine] Quantidade excede o limite: ${quantidade}. ` +
                'Máximo permitido: 100 jogos por chamada.'
            );
        }
    }

    // ============================================
    // MÉTODOS DE OBTENÇÃO DE ANALISADORES
    // ============================================

    /**
     * Obtém FrequencyAnalyzer com validação
     */
    private obterFrequency(): FrequencyAnalyzer {
        if (!this.context) {
            throw new Error(
                '[SpecialistEngine] StatisticsContext indisponível ao obter FrequencyAnalyzer.'
            );
        }

        if (!this.context.frequency) {
            throw new Error(
                '[SpecialistEngine] FrequencyAnalyzer não foi inicializado.'
            );
        }

        return this.context.frequency;
    }

    /**
     * Obtém DelayAnalyzer com validação
     */
    private obterDelay(): DelayAnalyzer {
        if (!this.context) {
            throw new Error(
                '[SpecialistEngine] StatisticsContext indisponível ao obter DelayAnalyzer.'
            );
        }

        if (!this.context.delay) {
            throw new Error(
                '[SpecialistEngine] DelayAnalyzer não foi inicializado.'
            );
        }

        return this.context.delay;
    }

    /**
     * Obtém DispersionAnalyzer com validação
     */
    private obterDispersion(dispersao: number): DispersionAnalyzer {
        if (!this.context) {
            throw new Error(
                '[SpecialistEngine] StatisticsContext indisponível ao obter DispersionAnalyzer.'
            );
        }

        if (!this.context.dispersion) {
            throw new Error(
                '[SpecialistEngine] DispersionAnalyzer não foi inicializado.'
            );
        }

        const dispersion = this.context.dispersion;
        dispersion.setWindowSize(dispersao);
        
        return dispersion;
    }

    /**
     * Obtém PatternAnalyzer com validação
     */
    private obterPatterns(): PatternAnalyzer {
        if (!this.context) {
            throw new Error(
                '[SpecialistEngine] StatisticsContext indisponível ao obter PatternAnalyzer.'
            );
        }

        if (!this.context.patterns) {
            throw new Error(
                '[SpecialistEngine] PatternAnalyzer não foi inicializado.'
            );
        }

        return this.context.patterns;
    }

    // ============================================
    // MÉTODOS DE CONFIGURAÇÃO
    // ============================================

    /**
     * Define o multiplicador de candidatos
     */
    setCandidatoMultiplier(multiplier: number): void {
        if (multiplier < 1) {
            throw new Error(
                `[SpecialistEngine] Multiplicador inválido: ${multiplier}. Deve ser >= 1.`
            );
        }
        this.candidatoMultiplier = multiplier;
    }

    /**
     * Obtém o multiplicador de candidatos atual
     */
    getCandidatoMultiplier(): number {
        return this.candidatoMultiplier;
    }

    /**
     * Atualiza os pesos do score
     * 
     * Nota: A soma dos pesos deve ser 1
     */
    setWeights(weights: Partial<typeof this.weights>): void {
        const novosPesos = {
            ...this.weights,
            ...weights
        };

        // Valida soma dos pesos
        const soma = Object.values(novosPesos).reduce((acc, val) => acc + val, 0);
        if (Math.abs(soma - 1) > 0.001) {
            throw new Error(
                `[SpecialistEngine] Soma dos pesos é ${soma.toFixed(3)}, esperado 1.`
            );
        }

        this.weights = novosPesos;
    }

    /**
     * Obtém os pesos atuais
     */
    getWeights(): typeof this.weights {
        return { ...this.weights };
    }

    /**
     * Define o fator de penalidade da dispersão
     */
    setDispersionPenaltyFactor(factor: number): void {
        if (factor < 0) {
            throw new Error(
                `[SpecialistEngine] Fator de penalidade inválido: ${factor}. Deve ser >= 0.`
            );
        }
        this.dispersionPenaltyFactor = factor;
    }

    /**
     * Obtém o fator de penalidade atual
     */
    getDispersionPenaltyFactor(): number {
        return this.dispersionPenaltyFactor;
    }

    /**
     * Valida se os pesos são válidos
     */
    validarPesos(): boolean {
        const soma = Object.values(this.weights).reduce((acc, val) => acc + val, 0);
        return Math.abs(soma - 1) < 0.001;
    }
}

// ============================================
// SEÇÃO 5: EXPORTS
// ============================================
export default SpecialistEngine;
