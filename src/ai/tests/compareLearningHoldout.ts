// ============================================================
// src/ai/tests/compareLearningHoldout.ts  04/09/2026
// ============================================================
// VALIDAÇÃO FINAL COM HOLDOUT INTACTO
//
// Fase 1: calibração walk-forward adaptativa.
// Fase 2: holdout final, sem qualquer atualização de pesos.
//
// O baseline e o adaptativo enfrentam exatamente os mesmos
// concursos do holdout. A única diferença é:
// - baseline: pesos fixos em 1.0;
// - adaptativo: pesos aprendidos SOMENTE na calibração.
//
// IMPORTANTE:
// - somente teste/validação;
// - não altera serviços de produção;
// - não altera Engines;
// - não altera geração de jogos;
// - o holdout não participa do aprendizado.
// ============================================================

import { AdaptiveLearning } from '../services/AdaptiveLearning';
import { AdaptiveLearningState } from '../services/AdaptiveLearningState';
import { FactorEvaluation, FactorEvaluationInput } from '../services/FactorEvaluation';
import { FeatureEngineering, NumberFeatures } from '../services/FeatureEngineering';
import { PredictiveScoring, PredictiveFeatures } from '../services/PredictiveScoring';
import { StatisticsContext } from '../services/StatisticsContext';

interface Config {
    loteria: string;
    maxNumero: number;
    incluirZero: boolean;
    quantidadeNumeros: number;
    minTreino: number;
    passo: number;
    percentualCalibracao?: number;
    topPatternsCount?: number;
    numbersPerPattern?: number;
    recentWindow?: number;
    adaptiveLearning?: {
        pesoMinimo?: number;
        pesoMaximo?: number;
        alteracaoMaxima?: number;
        amostrasMinimas?: number;
        sensibilidade?: number;
        suavizacao?: number;
    };
}

interface Estatisticas {
    mediaAcertos: number;
    totalAcertos: number;
    medianaAcertos: number;
    desvioPadraoAcertos: number;
    distribuicaoAcertos: Record<number, number>;
}

interface Resultado {
    loteria: string;
    concursos: number;
    indiceInicioHoldout: number;
    testesCalibracao: number;
    testesHoldout: number;
    baselineHoldout: Estatisticas;
    adaptativoHoldout: Estatisticas;
    comparacaoHoldout: {
        diferencaMedia: number;
        ganhoPercentual: number | null;
        testesAdaptativoMelhor: number;
        testesBaselineMelhor: number;
        testesEmpate: number;
    };
    pesosIniciais: Record<string, number>;
    pesosAprendidos: Record<string, number>;
    ciclosAprendizado: number;
}

const NOMES_FATORES = [
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

export function executarHoldout(
    dados: number[][],
    config: Config
): Resultado {
    validarDados(dados, config);

    const percentualCalibracao = config.percentualCalibracao ?? 0.70;
    if (percentualCalibracao <= 0 || percentualCalibracao >= 1) {
        throw new Error('[LearningHoldout] percentualCalibracao deve estar entre 0 e 1.');
    }

    const indiceInicioHoldout = Math.max(
        config.minTreino,
        Math.floor(dados.length * percentualCalibracao)
    );

    if (indiceInicioHoldout >= dados.length) {
        throw new Error('[LearningHoldout] Holdout vazio.');
    }

    const pesosIniciais = criarPesosIniciais();
    const baselineScoring = new PredictiveScoring();
    const adaptiveScoring = new PredictiveScoring();
    const factorEvaluation = new FactorEvaluation();
    const adaptiveLearning = new AdaptiveLearning(config.adaptiveLearning);
    const state = new AdaptiveLearningState(config.loteria, pesosIniciais);

    const fatoresAcumulados: Record<string, FactorEvaluationInput[]> = {};
    for (const nome of NOMES_FATORES) fatoresAcumulados[nome] = [];

    console.log('');
    console.log('============================================================');
    console.log('🧪 HOLDOUT FINAL — BASELINE x ADAPTATIVO');
    console.log('============================================================');
    console.log(`Loteria: ${config.loteria}`);
    console.log(`Concursos: ${dados.length}`);
    console.log(`Calibração: concursos 0 até ${indiceInicioHoldout - 1}`);
    console.log(`Holdout: concursos ${indiceInicioHoldout} até ${dados.length - 1}`);
    console.log(`Testes de holdout: ${dados.length - indiceInicioHoldout}`);
    console.log('');

    // ========================================================
    // FASE 1 — CALIBRAÇÃO
    // ========================================================
    const inicioCalibracao = Date.now();
    let testesCalibracao = 0;

    for (
        let indice = config.minTreino;
        indice < indiceInicioHoldout;
        indice += config.passo
    ) {
        const dadosTreino = dados.slice(0, indice).map(concurso => [...concurso]);
        const resultadoReal = [...dados[indice]];

        const features = extrairFeatures(dadosTreino, config);
        const predictiveFeatures = converterParaPredictiveFeatures(features);

        // Previsão com os pesos aprendidos até o momento.
        const scores = adaptiveScoring.calcularScores(predictiveFeatures);
        const previstos = selecionarTopNumeros(scores, config.quantidadeNumeros);

        // O resultado real só entra depois da previsão.
        adicionarFatores(fatoresAcumulados, features, resultadoReal);

        const avaliacao = factorEvaluation.avaliarFatores(fatoresAcumulados);
        const aprendizado = adaptiveLearning.ajustar(
            state.getPesosAtuais(),
            avaliacao.fatores
        );

        if (aprendizado.alteracoesAplicadas > 0) {
            state.aplicarResultado(aprendizado);
            adaptiveScoring.setWeights(aprendizado.pesosNovos);
        }

        // Evita variável não utilizada sem interferir na lógica.
        if (previstos.length !== config.quantidadeNumeros) {
            throw new Error('[LearningHoldout] Previsão de calibração inválida.');
        }

        testesCalibracao++;

        if (testesCalibracao % 100 === 0 || indice === indiceInicioHoldout - 1) {
            const segundos = (Date.now() - inicioCalibracao) / 1000;
            console.log(
                `🔄 Calibração: ${testesCalibracao} testes | ` +
                `concurso=${indice} | ciclos=${state.getCicloAtual()} | ` +
                `tempo=${segundos.toFixed(1)}s`
            );
        }
    }

    if (testesCalibracao === 0) {
        throw new Error('[LearningHoldout] Nenhum teste de calibração foi executado.');
    }

    const pesosAprendidos = { ...adaptiveScoring.getWeights() };

    console.log('');
    console.log('✅ CALIBRAÇÃO CONCLUÍDA');
    console.log(`Ciclos de aprendizado: ${state.getCicloAtual()}`);
    console.log('Pesos aprendidos:');
    console.table(pesosAprendidos);
    console.log('');

    // ========================================================
    // FASE 2 — HOLDOUT INTACTO
    // ========================================================
    // Nenhum resultado do holdout entra em FactorEvaluation,
    // AdaptiveLearning ou setWeights().
    // ========================================================
    const acertosBaseline: number[] = [];
    const acertosAdaptativo: number[] = [];
    const inicioHoldout = Date.now();

    for (
        let indice = indiceInicioHoldout;
        indice < dados.length;
        indice += config.passo
    ) {
        const dadosTreino = dados.slice(0, indice).map(concurso => [...concurso]);
        const resultadoReal = [...dados[indice]];

        const features = extrairFeatures(dadosTreino, config);
        const predictiveFeatures = converterParaPredictiveFeatures(features);

        // Baseline: pesos continuam 1.0.
        const scoresBaseline = baselineScoring.calcularScores(predictiveFeatures);
        const previstosBaseline = selecionarTopNumeros(
            scoresBaseline,
            config.quantidadeNumeros
        );

        // Adaptativo: usa APENAS os pesos aprendidos na calibração.
        const scoresAdaptativo = adaptiveScoring.calcularScores(predictiveFeatures);
        const previstosAdaptativo = selecionarTopNumeros(
            scoresAdaptativo,
            config.quantidadeNumeros
        );

        acertosBaseline.push(contarAcertos(previstosBaseline, resultadoReal));
        acertosAdaptativo.push(contarAcertos(previstosAdaptativo, resultadoReal));

        // DELIBERADAMENTE não há aprendizado aqui.
        if (
            acertosBaseline.length % 100 === 0 ||
            indice === dados.length - 1
        ) {
            const segundos = (Date.now() - inicioHoldout) / 1000;
            console.log(
                `🔒 Holdout: ${acertosBaseline.length}/${Math.ceil((dados.length - indiceInicioHoldout) / config.passo)} | ` +
                `concurso=${indice} | ` +
                `média baseline=${media(acertosBaseline).toFixed(6)} | ` +
                `média adaptativo=${media(acertosAdaptativo).toFixed(6)} | ` +
                `tempo=${segundos.toFixed(1)}s`
            );
        }
    }

    if (acertosBaseline.length === 0) {
        throw new Error('[LearningHoldout] Nenhum teste de holdout foi executado.');
    }

    const baselineHoldout = calcularEstatisticas(acertosBaseline);
    const adaptativoHoldout = calcularEstatisticas(acertosAdaptativo);

    let adaptativoMelhor = 0;
    let baselineMelhor = 0;
    let empate = 0;

    for (let i = 0; i < acertosBaseline.length; i++) {
        if (acertosAdaptativo[i] > acertosBaseline[i]) adaptativoMelhor++;
        else if (acertosBaseline[i] > acertosAdaptativo[i]) baselineMelhor++;
        else empate++;
    }

    const diferencaMedia =
        adaptativoHoldout.mediaAcertos - baselineHoldout.mediaAcertos;

    const ganhoPercentual =
        baselineHoldout.mediaAcertos === 0
            ? null
            : diferencaMedia / baselineHoldout.mediaAcertos;

    return {
        loteria: config.loteria,
        concursos: dados.length,
        indiceInicioHoldout,
        testesCalibracao,
        testesHoldout: acertosBaseline.length,
        baselineHoldout,
        adaptativoHoldout,
        comparacaoHoldout: {
            diferencaMedia,
            ganhoPercentual,
            testesAdaptativoMelhor: adaptativoMelhor,
            testesBaselineMelhor: baselineMelhor,
            testesEmpate: empate
        },
        pesosIniciais,
        pesosAprendidos,
        ciclosAprendizado: state.getCicloAtual()
    };
}

function extrairFeatures(
    dadosTreino: number[][],
    config: Config
): NumberFeatures[] {
    const context = new StatisticsContext(dadosTreino);
    const featureEngineering = new FeatureEngineering(context, {
        maxNumero: config.maxNumero,
        incluirZero: config.incluirZero,
        topPatternsCount: config.topPatternsCount ?? 10,
        numbersPerPattern: config.numbersPerPattern ?? 5,
        recentWindow:
            config.recentWindow ?? context.dispersion.getWindowSize()
    });

    const features = featureEngineering.extrairFeatures();
    if (!Array.isArray(features) || features.length === 0) {
        throw new Error('[LearningHoldout] FeatureEngineering não retornou features.');
    }
    return features;
}

function adicionarFatores(
    acumulados: Record<string, FactorEvaluationInput[]>,
    features: NumberFeatures[],
    resultadoReal: number[]
): void {
    const featureMap = new Map<number, NumberFeatures>();
    for (const feature of features) featureMap.set(feature.numero, feature);

    for (const nomeFator of NOMES_FATORES) {
        for (const numero of features.map(feature => feature.numero)) {
            const feature = featureMap.get(numero);
            if (!feature) {
                throw new Error(
                    `[LearningHoldout] Feature ausente para o número ${numero}.`
                );
            }
            acumulados[nomeFator].push({
                numero,
                fator: feature[nomeFator],
                resultadoReal: resultadoReal.includes(numero)
            });
        }
    }
}

function converterParaPredictiveFeatures(
    features: NumberFeatures[]
): PredictiveFeatures[] {
    return features.map(feature => ({
        numero: feature.numero,
        frequencia: feature.frequencia,
        tendenciaFrequencia: feature.tendenciaFrequencia,
        estabilidadeFrequencia: feature.estabilidadeFrequencia,
        atraso: feature.atraso,
        atrasoRelativo: feature.atrasoRelativo,
        regularidadeAtraso: feature.regularidadeAtraso,
        taxaRecente: feature.taxaRecente,
        intensidadeRecente: feature.intensidadeRecente,
        persistenciaRecente: feature.persistenciaRecente,
        distanciaRecente: feature.distanciaRecente,
        probabilidade: feature.probabilidade,
        suportePadrao: feature.suportePadrao
    }));
}

function selecionarTopNumeros(
    scores: Array<{ numero: number; score: number }>,
    quantidade: number
): number[] {
    const ordenados = [...scores].sort((a, b) =>
        b.score !== a.score ? b.score - a.score : a.numero - b.numero
    );
    const selecionados = ordenados.slice(0, quantidade).map(item => item.numero);

    if (selecionados.length !== quantidade) {
        throw new Error(
            `[LearningHoldout] Seleção inválida: ${selecionados.length}; esperado=${quantidade}.`
        );
    }
    if (new Set(selecionados).size !== selecionados.length) {
        throw new Error('[LearningHoldout] Seleção contém duplicados.');
    }
    return selecionados;
}

function contarAcertos(previstos: number[], reais: number[]): number {
    return previstos.filter(numero => reais.includes(numero)).length;
}

function calcularEstatisticas(valores: number[]): Estatisticas {
    if (valores.length === 0) {
        throw new Error('[LearningHoldout] Não há valores para estatísticas.');
    }

    const totalAcertos = valores.reduce((soma, valor) => soma + valor, 0);
    const mediaAcertos = totalAcertos / valores.length;
    const ordenados = [...valores].sort((a, b) => a - b);
    const meio = Math.floor(ordenados.length / 2);
    const medianaAcertos = ordenados.length % 2 === 0
        ? (ordenados[meio - 1] + ordenados[meio]) / 2
        : ordenados[meio];
    const variancia = valores.reduce(
        (soma, valor) => soma + Math.pow(valor - mediaAcertos, 2),
        0
    ) / valores.length;

    const distribuicaoAcertos: Record<number, number> = {};
    for (const valor of valores) {
        distribuicaoAcertos[valor] = (distribuicaoAcertos[valor] ?? 0) + 1;
    }

    return {
        mediaAcertos,
        totalAcertos,
        medianaAcertos,
        desvioPadraoAcertos: Math.sqrt(variancia),
        distribuicaoAcertos
    };
}

function media(valores: number[]): number {
    if (valores.length === 0) return 0;
    return valores.reduce((soma, valor) => soma + valor, 0) / valores.length;
}

function criarPesosIniciais(): Record<string, number> {
    return {
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
}

function validarDados(dados: number[][], config: Config): void {
    if (!Array.isArray(dados)) {
        throw new Error('[LearningHoldout] dados devem ser um array.');
    }
    if (dados.length < config.minTreino + 2) {
        throw new Error(
            `[LearningHoldout] Dados insuficientes: ${dados.length}; ` +
            `mínimo=${config.minTreino + 2}.`
        );
    }
    if (!Number.isInteger(config.maxNumero) || config.maxNumero < 0) {
        throw new Error('[LearningHoldout] maxNumero inválido.');
    }
    if (
        !Number.isInteger(config.quantidadeNumeros) ||
        config.quantidadeNumeros < 1 ||
        config.quantidadeNumeros > config.maxNumero + (config.incluirZero ? 1 : 0)
    ) {
        throw new Error('[LearningHoldout] quantidadeNumeros inválida.');
    }
    if (!Number.isInteger(config.minTreino) || config.minTreino < 1) {
        throw new Error('[LearningHoldout] minTreino inválido.');
    }
    if (!Number.isInteger(config.passo) || config.passo < 1) {
        throw new Error('[LearningHoldout] passo inválido.');
    }
    for (let i = 0; i < dados.length; i++) {
        const concurso = dados[i];
        if (!Array.isArray(concurso) || concurso.length === 0) {
            throw new Error(`[LearningHoldout] Concurso ${i} inválido.`);
        }
        const unicos = new Set<number>();
        for (const numero of concurso) {
            if (!Number.isInteger(numero)) {
                throw new Error(`[LearningHoldout] Número inválido no concurso ${i}: ${numero}.`);
            }
            const minimo = config.incluirZero ? 0 : 1;
            if (numero < minimo || numero > config.maxNumero) {
                throw new Error(
                    `[LearningHoldout] Número ${numero} fora do intervalo no concurso ${i}.`
                );
            }
            if (unicos.has(numero)) {
                throw new Error(`[LearningHoldout] Número ${numero} duplicado no concurso ${i}.`);
            }
            unicos.add(numero);
        }
    }
}

// ============================================================
// RUNNER
// ============================================================

async function main(): Promise<void> {
    const { CsvParser } = await import('../../statistics/utils/CsvParser');
    const loteria = 'megasena';
    const csvParser = new CsvParser();
    const contexto = await csvParser.load(loteria);

    if (!contexto) {
        throw new Error(`[LearningHoldout] Não foi possível carregar "${loteria}".`);
    }

    const resultado = executarHoldout(contexto.dados, {
        loteria,
        maxNumero: contexto.config.maxNumero,
        incluirZero: contexto.config.incluirZero,
        quantidadeNumeros: contexto.config.numerosPadrao,
        minTreino: 300,
        passo: 1,
        percentualCalibracao: 0.70,
        adaptiveLearning: {
            pesoMinimo: 0.25,
            pesoMaximo: 4.0,
            alteracaoMaxima: 0.15,
            amostrasMinimas: 100,
            sensibilidade: 0.50,
            suavizacao: 0.20
        }
    });

    console.log('');
    console.log('============================================================');
    console.log('📊 RESULTADO DO HOLDOUT FINAL');
    console.log('============================================================');
    console.log(`Holdout começa no concurso índice: ${resultado.indiceInicioHoldout}`);
    console.log(`Testes de calibração: ${resultado.testesCalibracao}`);
    console.log(`Testes de holdout: ${resultado.testesHoldout}`);
    console.log('');
    console.log('---------------- BASELINE ----------------');
    console.log(`Média: ${resultado.baselineHoldout.mediaAcertos.toFixed(6)}`);
    console.log(`Mediana: ${resultado.baselineHoldout.medianaAcertos.toFixed(6)}`);
    console.log(`Desvio-padrão: ${resultado.baselineHoldout.desvioPadraoAcertos.toFixed(6)}`);
    console.log('');
    console.log('---------------- ADAPTATIVO ----------------');
    console.log(`Média: ${resultado.adaptativoHoldout.mediaAcertos.toFixed(6)}`);
    console.log(`Mediana: ${resultado.adaptativoHoldout.medianaAcertos.toFixed(6)}`);
    console.log(`Desvio-padrão: ${resultado.adaptativoHoldout.desvioPadraoAcertos.toFixed(6)}`);
    console.log('');
    console.log('---------------- COMPARAÇÃO HOLDOUT ----------------');
    console.log(`Diferença de média: ${resultado.comparacaoHoldout.diferencaMedia.toFixed(6)}`);
    console.log(
        `Ganho percentual: ${
            resultado.comparacaoHoldout.ganhoPercentual === null
                ? 'N/A'
                : (resultado.comparacaoHoldout.ganhoPercentual * 100).toFixed(4) + '%'
        }`
    );
    console.log(`Adaptativo melhor: ${resultado.comparacaoHoldout.testesAdaptativoMelhor}`);
    console.log(`Baseline melhor: ${resultado.comparacaoHoldout.testesBaselineMelhor}`);
    console.log(`Empates: ${resultado.comparacaoHoldout.testesEmpate}`);
    console.log('');
    console.log('---------------- PESOS APRENDIDOS ----------------');
    console.table(resultado.pesosAprendidos);
    console.log(`Ciclos de aprendizado: ${resultado.ciclosAprendizado}`);
    console.log('');
    console.log('============================================================');
    console.log('HOLDOUT FINALIZADO');
    console.log('============================================================');
}

if (typeof require !== 'undefined' && require.main === module) {
    main().catch(error => {
        console.error('');
        console.error('============================================================');
        console.error('❌ FALHA NO HOLDOUT');
        console.error('============================================================');
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    });
}
