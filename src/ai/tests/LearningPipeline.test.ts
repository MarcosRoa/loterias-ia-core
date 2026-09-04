// ============================================================
// src/ai/tests/LearningPipeline.test.ts
// ============================================================
// ============================================================
// TESTE DE INTEGRAÇÃO - LEARNING PIPELINE  04/09/2026
// ============================================================
//
// IMPORTANTE:
// Este arquivo é SOMENTE para validação.
// Não altera BaseEngine.
// Não altera os Engines.
// Não altera CandidatePool.
// Não altera ScoreNormalizer.
// Não altera a geração de jogos.
//
// Fluxo testado (walk-forward do modelo):
//
// HISTÓRICO
//    ↓
// StatisticsContext
//    ↓
// FeatureEngineering
//    ↓
// PredictiveScoring
//    ↓
// Backtesting
//    ↓
// BacktestMetrics
//    ↓
// FactorEvaluation
//    ↓
// AdaptiveLearning
//    ↓
// AdaptiveLearningState
//    ↓
// LearningPipeline
//
// ============================================================

import { StatisticsContext } from '../services/StatisticsContext';
import {
    FeatureEngineering,
    NumberFeatures
} from '../services/FeatureEngineering';

import {
    PredictiveScoring,
    PredictiveFeatures
} from '../services/PredictiveScoring';

import {
    LearningPipeline,
    LearningPipelineFactorProvider
} from '../services/LearningPipeline';

import { BacktestModel } from '../services/Backtesting';
import { FactorEvaluationInput } from '../services/FactorEvaluation';

// ============================================================
// CONFIGURAÇÃO
// ============================================================

export interface LearningPipelineTestConfig {
    loteria: string;

    maxNumero: number;

    incluirZero: boolean;

    quantidadeNumeros: number;

    minTreino: number;

    passo: number;

    baselineMediaAcertos: number;

    topPatternsCount?: number;

    numbersPerPattern?: number;

    recentWindow?: number;
}

// ============================================================
// RESULTADO
// ============================================================

export interface LearningPipelineTestResult {
    aprovado: boolean;

    loteria: string;

    concursos: number;

    testesBacktest: number;

    mediaAcertos: number;

    baselineMediaAcertos: number;

    ganhoSobreBaseline: number;

    pesosAntes: Record<string, number>;

    pesosDepois: Record<string, number>;

    estabilidade: number;

    ciclo: number;

    fatoresAvaliados: string[];

    erros: string[];
}

// ============================================================
// TESTE
// ============================================================

export function executarTesteLearningPipeline(
    dados: number[][],
    config: LearningPipelineTestConfig
): LearningPipelineTestResult {

    const erros: string[] = [];

    console.log('');
    console.log('============================================================');
    console.log('🧠 TESTE DE INTEGRAÇÃO - LEARNING PIPELINE');
    console.log('============================================================');
    console.log(`Loteria: ${config.loteria}`);
    console.log(`Concursos: ${dados.length}`);
    console.log(`Máximo número: ${config.maxNumero}`);
    console.log(`Quantidade por jogo: ${config.quantidadeNumeros}`);
    console.log('');

    // ========================================================
    // 1. VALIDAR DADOS
    // ========================================================

    validarDados(dados, config);

    console.log('✅ [1/8] Dados históricos válidos');

    // ========================================================
    // 2. CRIAR MODELO PREDITIVO
    // ========================================================

    const predictiveScoring = new PredictiveScoring();

    const model: BacktestModel = {

        prever(dadosTreino: number[][]): number[] {

            if (!Array.isArray(dadosTreino) || dadosTreino.length === 0) {
                throw new Error(
                    '[LearningPipelineTest] dadosTreino inválidos.'
                );
            }

            // ------------------------------------------------
            // O modelo recebe SOMENTE os dados disponíveis
            // até aquele concurso.
            // ------------------------------------------------

            const context = new StatisticsContext(dadosTreino);

            const featureEngineering = new FeatureEngineering(
                context,
                {
                    maxNumero: config.maxNumero,
                    incluirZero: config.incluirZero,
                    topPatternsCount:
                        config.topPatternsCount ?? 10,
                    numbersPerPattern:
                        config.numbersPerPattern ?? 5,
                    recentWindow:
                        config.recentWindow ??
                        context.dispersion.getWindowSize()
                }
            );

            const features =
                featureEngineering.extrairFeatures();

            if (!Array.isArray(features) || features.length === 0) {
                throw new Error(
                    '[LearningPipelineTest] FeatureEngineering não retornou features.'
                );
            }

            const predictiveFeatures =
                converterParaPredictiveFeatures(features);

            const scores =
                predictiveScoring.calcularScores(
                    predictiveFeatures
                );

            if (!Array.isArray(scores) || scores.length === 0) {
                throw new Error(
                    '[LearningPipelineTest] PredictiveScoring não retornou scores.'
                );
            }

            // ------------------------------------------------
            // Ordenação determinística.
            // ------------------------------------------------

            const ordenados = [...scores].sort(
                (a, b) => {

                    if (b.score !== a.score) {
                        return b.score - a.score;
                    }

                    return a.numero - b.numero;
                }
            );

            const selecionados =
                ordenados
                    .slice(0, config.quantidadeNumeros)
                    .map(item => item.numero);

            if (
                selecionados.length !==
                config.quantidadeNumeros
            ) {
                throw new Error(
                    `[LearningPipelineTest] Modelo retornou ` +
                    `${selecionados.length} números; esperado ` +
                    `${config.quantidadeNumeros}.`
                );
            }

            if (
                new Set(selecionados).size !==
                selecionados.length
            ) {
                throw new Error(
                    '[LearningPipelineTest] Modelo retornou números duplicados.'
                );
            }

            return selecionados;
        }
    };

    console.log('✅ [2/8] Modelo preditivo criado');

    // ========================================================
    // 3. FACTOR PROVIDER
    // ========================================================

    const factorProvider:
        LearningPipelineFactorProvider = {

        extrair(
            dadosTreino: number[][],
            numerosPrevistos: number[],
            resultadoReal: number[]
        ): Record<string, FactorEvaluationInput[]> {

            if (
                !Array.isArray(dadosTreino) ||
                dadosTreino.length === 0
            ) {
                throw new Error(
                    '[LearningPipelineTest] dadosTreino inválidos no factorProvider.'
                );
            }

            if (
                !Array.isArray(numerosPrevistos) ||
                numerosPrevistos.length === 0
            ) {
                throw new Error(
                    '[LearningPipelineTest] numerosPrevistos inválidos.'
                );
            }

            if (
                !Array.isArray(resultadoReal) ||
                resultadoReal.length === 0
            ) {
                throw new Error(
                    '[LearningPipelineTest] resultadoReal inválido.'
                );
            }

            const context =
                new StatisticsContext(dadosTreino);

            const featureEngineering =
                new FeatureEngineering(
                    context,
                    {
                        maxNumero: config.maxNumero,
                        incluirZero: config.incluirZero,
                        topPatternsCount:
                            config.topPatternsCount ?? 10,
                        numbersPerPattern:
                            config.numbersPerPattern ?? 5,
                        recentWindow:
                            config.recentWindow ??
                            context.dispersion.getWindowSize()
                    }
                );

            const features =
                featureEngineering.extrairFeatures();

            const featureMap =
                new Map<number, NumberFeatures>();

            for (const feature of features) {
                featureMap.set(
                    feature.numero,
                    feature
                );
            }

            const fatores: Record<
                string,
                FactorEvaluationInput[]
            > = {};

            const numerosPrevistosSet =
                new Set(numerosPrevistos);

            if (
                numerosPrevistosSet.size !==
                numerosPrevistos.length
            ) {
                throw new Error(
                    '[LearningPipelineTest] numerosPrevistos contém duplicados.'
                );
            }

            const nomesFatores = [
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
            ] as const;

            for (const nomeFator of nomesFatores) {

                fatores[nomeFator] = [];

                const numerosElegiveis =
                    features.map(feature => feature.numero);

                for (const numero of numerosElegiveis) {

                    const feature =
                        featureMap.get(numero);

                    if (!feature) {
                        throw new Error(
                            `[LearningPipelineTest] Feature não encontrada para o número ${numero}.`
                        );
                    }

                    const resultadoRealNumero =
                        resultadoReal.includes(numero);

                    fatores[nomeFator].push({
                        numero,
                        fator: feature[nomeFator],
                        resultadoReal:
                            resultadoRealNumero
                    });
                }
            }

            return fatores;
        }
    };

    console.log('✅ [3/8] FactorProvider criado');

    // ========================================================
    // 4. PESOS INICIAIS
    // ========================================================

    const pesosIniciais: Record<string, number> = {

        frequencia: 1,

        tendenciaFrequencia: 1,

        estabilidadeFrequencia: 1,

        atraso: 1,

        atrasoRelativo: 1,

        regularidadeAtraso: 1,

        taxaRecente: 1,

        intensidadeRecente: 1,

        persistenciaRecente: 1,

        distanciaRecente: 1,

        probabilidade: 1,

        suportePadrao: 1
    };

    // ========================================================
    // 5. CRIAR PIPELINE
    // ========================================================

    const pipeline =
        new LearningPipeline(
            config.loteria,
            pesosIniciais,
            {
                backtesting: {
                    minTreino: config.minTreino,
                    passo: config.passo
                },

                baseline: {
                    mediaAcertos:
                        config.baselineMediaAcertos
                }
            }
        );

    console.log('✅ [4/8] LearningPipeline criado');

    // ========================================================
    // 6. EXECUTAR
    // ========================================================

    let resultado;

    try {

        resultado =
            pipeline.executar(
                dados,
                model,
                factorProvider
            );

    } catch (erro) {

        const mensagem =
            erro instanceof Error
                ? erro.message
                : String(erro);

        erros.push(mensagem);

        console.error('');
        console.error('❌ ERRO NO LEARNING PIPELINE');
        console.error(mensagem);
        console.error('');

        return {
            aprovado: false,
            loteria: config.loteria,
            concursos: dados.length,
            testesBacktest: 0,
            mediaAcertos: 0,
            baselineMediaAcertos:
                config.baselineMediaAcertos,
            ganhoSobreBaseline: 0,
            pesosAntes: pesosIniciais,
            pesosDepois: pesosIniciais,
            estabilidade: 0,
            ciclo: 0,
            fatoresAvaliados: [],
            erros
        };
    }

    console.log('✅ [5/8] LearningPipeline executado');

    // ========================================================
    // 7. ANALISAR RESULTADO
    // ========================================================

    const metrics =
        resultado.metrics;

    const avaliacao =
        resultado.factors;

    const estado =
        resultado.state;

    const pesosDepois =
        resultado.learning.pesosNovos;

    console.log('');
    console.log('------------------------------------------------------------');
    console.log('📊 RESULTADOS DO BACKTEST');
    console.log('------------------------------------------------------------');

    console.log(
        `Testes: ${metrics.totalTestes}`
    );

    console.log(
        `Total de acertos: ${metrics.totalAcertos}`
    );

    console.log(
        `Média de acertos: ${formatar(metrics.mediaAcertos)}`
    );

    console.log(
        `Baseline: ${formatar(metrics.baselineMedia)}`
    );

    console.log(
        `Ganho sobre baseline: ${formatar(metrics.ganhoSobreBaseline)}`
    );

    console.log(
        `Consistência: ${formatar(metrics.consistencia)}`
    );

    console.log(
        `Testes acima do baseline: ${metrics.testesAcimaBaseline}`
    );

    console.log(
        `Testes abaixo do baseline: ${metrics.testesAbaixoBaseline}`
    );

    console.log('');

    console.log('------------------------------------------------------------');
    console.log('🧠 AVALIAÇÃO DOS FATORES');
    console.log('------------------------------------------------------------');

    for (const fator of avaliacao.fatores) {

        console.log(
            `${fator.fator.padEnd(25)} ` +
            `amostras=${fator.amostras} ` +
            `taxa=${formatar(fator.taxaAcerto)} ` +
            `discriminação=${formatar(fator.discriminacao)} ` +
            `desempenho=${formatar(fator.desempenho)}`
        );
    }

    console.log('');

    console.log('------------------------------------------------------------');
    console.log('⚖️ PESOS');
    console.log('------------------------------------------------------------');

    console.log('Pesos anteriores:');
    console.table(pesosIniciais);

    console.log('Pesos atuais:');
    console.table(pesosDepois);

    console.log(
        `Estabilidade: ${formatar(estado.estabilidade)}`
    );

    console.log(
        `Ciclo: ${estado.ciclo}`
    );

    console.log('');

    // ========================================================
    // 8. VALIDAÇÕES FINAIS
    // ========================================================

    validarResultadoFinal(
        resultado,
        pesosIniciais,
        config
    );

    console.log('✅ [6/8] Métricas válidas');
    console.log('✅ [7/8] Aprendizado válido');
    console.log('✅ [8/8] Estado válido');

    console.log('');
    console.log('============================================================');
    console.log('🎯 RESULTADO FINAL');
    console.log('============================================================');

    console.log('✅ LEARNING PIPELINE APROVADO');
    console.log('');
    console.log('O circuito de aprendizado funcionou isoladamente.');
    console.log('Nenhum Engine de produção foi utilizado.');
    console.log('Nenhum jogo de produção foi alterado.');
    console.log('============================================================');
    console.log('');

    return {
        aprovado: true,
        loteria: config.loteria,
        concursos: dados.length,
        testesBacktest: metrics.totalTestes,
        mediaAcertos: metrics.mediaAcertos,
        baselineMediaAcertos:
            metrics.baselineMedia,
        ganhoSobreBaseline:
            metrics.ganhoSobreBaseline,
        pesosAntes: pesosIniciais,
        pesosDepois,
        estabilidade:
            estado.estabilidade,
        ciclo:
            estado.ciclo,
        fatoresAvaliados:
            avaliacao.fatores.map(
                fator => fator.fator
            ),
        erros
    };
}

// ============================================================
// CONVERSÃO
// ============================================================

function converterParaPredictiveFeatures(
    features: NumberFeatures[]
): PredictiveFeatures[] {

    return features.map(feature => ({
        numero: feature.numero,

        frequencia:
            feature.frequencia,

        tendenciaFrequencia:
            feature.tendenciaFrequencia,

        estabilidadeFrequencia:
            feature.estabilidadeFrequencia,

        atraso:
            feature.atraso,

        atrasoRelativo:
            feature.atrasoRelativo,

        regularidadeAtraso:
            feature.regularidadeAtraso,

        taxaRecente:
            feature.taxaRecente,

        intensidadeRecente:
            feature.intensidadeRecente,

        persistenciaRecente:
            feature.persistenciaRecente,

        distanciaRecente:
            feature.distanciaRecente,

        probabilidade:
            feature.probabilidade,

        suportePadrao:
            feature.suportePadrao
    }));
}

// ============================================================
// VALIDAÇÃO DOS DADOS
// ============================================================

function validarDados(
    dados: number[][],
    config: LearningPipelineTestConfig
): void {

    if (!Array.isArray(dados)) {
        throw new Error(
            '[LearningPipelineTest] dados devem ser um array.'
        );
    }

    if (dados.length < config.minTreino + 2) {
        throw new Error(
            `[LearningPipelineTest] Dados insuficientes. ` +
            `Recebidos ${dados.length}; mínimo recomendado ` +
            `é ${config.minTreino + 2}.`
        );
    }

    if (
        !Number.isInteger(config.maxNumero) ||
        config.maxNumero < 0
    ) {
        throw new Error(
            '[LearningPipelineTest] maxNumero inválido.'
        );
    }

    if (
        !Number.isInteger(config.quantidadeNumeros) ||
        config.quantidadeNumeros < 1 ||
        config.quantidadeNumeros > config.maxNumero +
        (config.incluirZero ? 1 : 0)
    ) {
        throw new Error(
            '[LearningPipelineTest] quantidadeNumeros inválida.'
        );
    }

    for (let i = 0; i < dados.length; i++) {

        const concurso = dados[i];

        if (!Array.isArray(concurso)) {
            throw new Error(
                `[LearningPipelineTest] Concurso ${i} inválido.`
            );
        }

        if (concurso.length === 0) {
            throw new Error(
                `[LearningPipelineTest] Concurso ${i} vazio.`
            );
        }

        const unicos = new Set<number>();

        for (const numero of concurso) {

            if (!Number.isInteger(numero)) {
                throw new Error(
                    `[LearningPipelineTest] Número inválido no concurso ${i}: ${numero}.`
                );
            }

            const minimo =
                config.incluirZero ? 0 : 1;

            if (
                numero < minimo ||
                numero > config.maxNumero
            ) {
                throw new Error(
                    `[LearningPipelineTest] Número ${numero} ` +
                    `fora do intervalo no concurso ${i}.`
                );
            }

            if (unicos.has(numero)) {
                throw new Error(
                    `[LearningPipelineTest] Número ${numero} ` +
                    `duplicado no concurso ${i}.`
                );
            }

            unicos.add(numero);
        }
    }
}

// ============================================================
// VALIDAÇÃO DO RESULTADO
// ============================================================

function validarResultadoFinal(
    resultado: any,
    pesosAntes: Record<string, number>,
    config: LearningPipelineTestConfig
): void {

    if (!resultado) {
        throw new Error(
            '[LearningPipelineTest] Resultado vazio.'
        );
    }

    if (!resultado.metrics) {
        throw new Error(
            '[LearningPipelineTest] Métricas ausentes.'
        );
    }

    if (
        !Number.isInteger(
            resultado.metrics.totalTestes
        ) ||
        resultado.metrics.totalTestes <= 0
    ) {
        throw new Error(
            '[LearningPipelineTest] Nenhum teste de backtesting foi executado.'
        );
    }

    if (!Number.isFinite(
        resultado.metrics.mediaAcertos
    )) {
        throw new Error(
            '[LearningPipelineTest] Média de acertos inválida.'
        );
    }

    if (!Number.isFinite(
        resultado.metrics.baselineMedia
    )) {
        throw new Error(
            '[LearningPipelineTest] Baseline inválido.'
        );
    }

    if (!resultado.factors) {
        throw new Error(
            '[LearningPipelineTest] Avaliação dos fatores ausente.'
        );
    }

    if (
        !Array.isArray(
            resultado.factors.fatores
        )
    ) {
        throw new Error(
            '[LearningPipelineTest] Lista de fatores inválida.'
        );
    }

    if (
        resultado.factors.fatores.length === 0
    ) {
        throw new Error(
            '[LearningPipelineTest] Nenhum fator foi avaliado.'
        );
    }

    if (!resultado.state) {
        throw new Error(
            '[LearningPipelineTest] Estado adaptativo ausente.'
        );
    }

    if (
        resultado.state.ciclo < 1
    ) {
        throw new Error(
            '[LearningPipelineTest] Estado não registrou o ciclo.'
        );
    }

    if (!Number.isFinite(
        resultado.state.estabilidade
    )) {
        throw new Error(
            '[LearningPipelineTest] Estabilidade inválida.'
        );
    }

    if (!resultado.learning?.pesosNovos) {
        throw new Error(
            '[LearningPipelineTest] Pesos não retornados.'
        );
    }

    for (const [nome, peso] of Object.entries(
        resultado.learning.pesosNovos
    )) {

        if (!Number.isFinite(peso)) {
            throw new Error(
                `[LearningPipelineTest] Peso inválido: ${nome}.`
            );
        }

        if (peso <= 0) {
            throw new Error(
                `[LearningPipelineTest] Peso não positivo: ${nome}=${peso}.`
            );
        }

        const pesoAnterior =
            pesosAntes[nome];

        if (
            pesoAnterior !== undefined &&
            peso > 4
        ) {
            throw new Error(
                `[LearningPipelineTest] Peso ${nome} ` +
                `ultrapassou o limite esperado: ${peso}.`
            );
        }
    }

    if (
        resultado.metrics.totalTestes <
        1
    ) {
        throw new Error(
            `[LearningPipelineTest] Configuração inválida para ${config.loteria}.`
        );
    }
}

// ============================================================
// FORMATAÇÃO
// ============================================================

function formatar(valor: number): string {

    if (!Number.isFinite(valor)) {
        return 'INVALIDO';
    }

    return valor.toFixed(4);
}
