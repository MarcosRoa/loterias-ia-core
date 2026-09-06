// ============================================================
// src/ai/tests/compareLearningBaseline.ts  04/09/2026
// ============================================================
// COMPARAÇÃO EXPERIMENTAL: MODELO FIXO x MODELO ADAPTATIVO
// SOMENTE TESTE/VALIDAÇÃO. NÃO ALTERA PRODUÇÃO.
// ============================================================

import { AdaptiveLearning } from '../services/AdaptiveLearning';
import { AdaptiveLearningState } from '../services/AdaptiveLearningState';
import { FactorEvaluation, FactorEvaluationInput } from '../services/FactorEvaluation';
import { FeatureEngineering, NumberFeatures } from '../services/FeatureEngineering';
import { PredictiveScoring, PredictiveFeatures } from '../services/PredictiveScoring';
import { StatisticsContext } from '../services/StatisticsContext';
import { CsvParser } from '../../statistics/utils/CsvParser';

export interface LearningComparisonConfig {
    loteria: string;
    maxNumero: number;
    incluirZero: boolean;
    quantidadeNumeros: number;
    minTreino: number;
    passo: number;
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

export interface LearningComparisonResult {
    loteria: string;
    concursos: number;
    testes: number;
    baseline: ComparisonStats;
    adaptativo: ComparisonStats;
    comparacao: {
        diferencaMedia: number;
        ganhoPercentual: number | null;
        testesAdaptativoMelhor: number;
        testesBaselineMelhor: number;
        testesEmpate: number;
    };
    pesosIniciais: Record<string, number>;
    pesosFinais: Record<string, number>;
    ciclosAprendizado: number;
}

interface ComparisonStats {
    mediaAcertos: number;
    totalAcertos: number;
    medianaAcertos: number;
    desvioPadraoAcertos: number;
    distribuicaoAcertos: Record<number, number>;
}

const NOMES_FATORES = [
    'frequencia', 'tendenciaFrequencia', 'estabilidadeFrequencia',
    'atraso', 'atrasoRelativo', 'regularidadeAtraso',
    'taxaRecente', 'intensidadeRecente', 'persistenciaRecente',
    'distanciaRecente', 'probabilidade', 'suportePadrao'
] as const;

export function executarComparacaoLearning(
    dados: number[][],
    config: LearningComparisonConfig
): LearningComparisonResult {
    validarDados(dados, config);

    const pesosIniciais = criarPesosIniciais();
    const baselineScoring = new PredictiveScoring();
    const adaptiveScoring = new PredictiveScoring();
    const factorEvaluation = new FactorEvaluation();
    const adaptiveLearning = new AdaptiveLearning(config.adaptiveLearning);
    const state = new AdaptiveLearningState(config.loteria, pesosIniciais);

    const acertosBaseline: number[] = [];
    const acertosAdaptativo: number[] = [];
    const fatoresAcumulados: Record<string, FactorEvaluationInput[]> = {};

    for (const nomeFator of NOMES_FATORES) {
        fatoresAcumulados[nomeFator] = [];
    }

    for (let indice = config.minTreino; indice < dados.length; indice += config.passo) {
        const dadosTreino = dados.slice(0, indice).map(concurso => [...concurso]);
        const resultadoReal = [...dados[indice]];

        const context = new StatisticsContext(dadosTreino);
        const featureEngineering = new FeatureEngineering(context, {
            maxNumero: config.maxNumero,
            incluirZero: config.incluirZero,
            topPatternsCount: config.topPatternsCount ?? 10,
            numbersPerPattern: config.numbersPerPattern ?? 5,
            recentWindow: config.recentWindow ?? context.dispersion.getWindowSize()
        });

        const features = featureEngineering.extrairFeatures();
        if (!Array.isArray(features) || features.length === 0) {
            throw new Error(`[LearningComparison] FeatureEngineering não retornou features no concurso ${indice}.`);
        }

        const predictiveFeatures = converterParaPredictiveFeatures(features);

        // BASELINE: pesos fixos em 1.0 durante todo o experimento.
        const scoresBaseline = baselineScoring.calcularScores(predictiveFeatures);
        const numerosBaseline = selecionarTopNumeros(scoresBaseline, config.quantidadeNumeros);
        acertosBaseline.push(contarAcertos(numerosBaseline, resultadoReal));

        // ADAPTATIVO: usa somente os pesos aprendidos antes deste concurso.
        const scoresAdaptativo = adaptiveScoring.calcularScores(predictiveFeatures);
        const numerosAdaptativo = selecionarTopNumeros(scoresAdaptativo, config.quantidadeNumeros);
        acertosAdaptativo.push(contarAcertos(numerosAdaptativo, resultadoReal));

        // O resultado real só é usado depois das duas previsões.
        const featureMap = new Map<number, NumberFeatures>();
        for (const feature of features) featureMap.set(feature.numero, feature);

        for (const nomeFator of NOMES_FATORES) {
            for (const numero of features.map(feature => feature.numero)) {
                const feature = featureMap.get(numero);
                if (!feature) {
                    throw new Error(`[LearningComparison] Feature ausente para o número ${numero}.`);
                }
                fatoresAcumulados[nomeFator].push({
                    numero,
                    fator: feature[nomeFator],
                    resultadoReal: resultadoReal.includes(numero)
                });
            }
        }

        const avaliacao = factorEvaluation.avaliarFatores(fatoresAcumulados);
        const aprendizado = adaptiveLearning.ajustar(state.getPesosAtuais(), avaliacao.fatores);

        if (aprendizado.alteracoesAplicadas > 0) {
            state.aplicarResultado(aprendizado);
            adaptiveScoring.setWeights(aprendizado.pesosNovos);
        }
    }

    if (acertosBaseline.length === 0) {
        throw new Error('[LearningComparison] Nenhum teste foi executado.');
    }

    const baseline = calcularEstatisticas(acertosBaseline);
    const adaptativo = calcularEstatisticas(acertosAdaptativo);
    const diferencaMedia = adaptativo.mediaAcertos - baseline.mediaAcertos;
    const ganhoPercentual = baseline.mediaAcertos === 0
        ? null
        : diferencaMedia / baseline.mediaAcertos;

    let testesAdaptativoMelhor = 0;
    let testesBaselineMelhor = 0;
    let testesEmpate = 0;

    for (let i = 0; i < acertosBaseline.length; i++) {
        if (acertosAdaptativo[i] > acertosBaseline[i]) testesAdaptativoMelhor++;
        else if (acertosBaseline[i] > acertosAdaptativo[i]) testesBaselineMelhor++;
        else testesEmpate++;
    }

    return {
        loteria: config.loteria,
        concursos: dados.length,
        testes: acertosBaseline.length,
        baseline,
        adaptativo,
        comparacao: {
            diferencaMedia,
            ganhoPercentual,
            testesAdaptativoMelhor,
            testesBaselineMelhor,
            testesEmpate
        },
        pesosIniciais,
        pesosFinais: { ...adaptiveScoring.getWeights() },
        ciclosAprendizado: state.getCicloAtual()
    };
}

function selecionarTopNumeros(scores: Array<{ numero: number; score: number }>, quantidade: number): number[] {
    const ordenados = [...scores].sort((a, b) => b.score !== a.score ? b.score - a.score : a.numero - b.numero);
    const selecionados = ordenados.slice(0, quantidade).map(item => item.numero);
    if (selecionados.length !== quantidade) {
        throw new Error(`[LearningComparison] Quantidade inválida: ${selecionados.length}; esperado=${quantidade}.`);
    }
    if (new Set(selecionados).size !== selecionados.length) {
        throw new Error('[LearningComparison] Seleção retornou números duplicados.');
    }
    return selecionados;
}

function converterParaPredictiveFeatures(features: NumberFeatures[]): PredictiveFeatures[] {
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

function contarAcertos(previstos: number[], reais: number[]): number {
    return previstos.filter(numero => reais.includes(numero)).length;
}

function calcularEstatisticas(valores: number[]): ComparisonStats {
    const totalAcertos = valores.reduce((total, valor) => total + valor, 0);
    const mediaAcertos = totalAcertos / valores.length;
    const ordenados = [...valores].sort((a, b) => a - b);
    const meio = Math.floor(ordenados.length / 2);
    const medianaAcertos = ordenados.length % 2 === 0
        ? (ordenados[meio - 1] + ordenados[meio]) / 2
        : ordenados[meio];
    const variancia = valores.reduce((soma, valor) => soma + Math.pow(valor - mediaAcertos, 2), 0) / valores.length;
    const distribuicaoAcertos: Record<number, number> = {};
    for (const valor of valores) distribuicaoAcertos[valor] = (distribuicaoAcertos[valor] ?? 0) + 1;

    return {
        mediaAcertos,
        totalAcertos,
        medianaAcertos,
        desvioPadraoAcertos: Math.sqrt(variancia),
        distribuicaoAcertos
    };
}

function criarPesosIniciais(): Record<string, number> {
    return {
        frequencia: 1, tendenciaFrequencia: 1, estabilidadeFrequencia: 1,
        atraso: 1, atrasoRelativo: 1, regularidadeAtraso: 1,
        taxaRecente: 1, intensidadeRecente: 1, persistenciaRecente: 1,
        distanciaRecente: 1, probabilidade: 1, suportePadrao: 1
    };
}

function validarDados(dados: number[][], config: LearningComparisonConfig): void {
    if (!Array.isArray(dados)) throw new Error('[LearningComparison] dados devem ser um array.');
    if (dados.length < config.minTreino + 1) throw new Error(`[LearningComparison] Dados insuficientes: ${dados.length}.`);
    if (!Number.isInteger(config.maxNumero) || config.maxNumero < 0) throw new Error('[LearningComparison] maxNumero inválido.');
    if (!Number.isInteger(config.quantidadeNumeros) || config.quantidadeNumeros < 1 || config.quantidadeNumeros > config.maxNumero + (config.incluirZero ? 1 : 0)) {
        throw new Error('[LearningComparison] quantidadeNumeros inválida.');
    }
    if (!Number.isInteger(config.minTreino) || config.minTreino < 1) throw new Error('[LearningComparison] minTreino inválido.');
    if (!Number.isInteger(config.passo) || config.passo < 1) throw new Error('[LearningComparison] passo inválido.');

    for (let i = 0; i < dados.length; i++) {
        const concurso = dados[i];
        if (!Array.isArray(concurso) || concurso.length === 0) throw new Error(`[LearningComparison] Concurso ${i} inválido.`);
        const unicos = new Set<number>();
        for (const numero of concurso) {
            if (!Number.isInteger(numero)) throw new Error(`[LearningComparison] Número inválido no concurso ${i}: ${numero}.`);
            const minimo = config.incluirZero ? 0 : 1;
            if (numero < minimo || numero > config.maxNumero) throw new Error(`[LearningComparison] Número ${numero} fora do intervalo no concurso ${i}.`);
            if (unicos.has(numero)) throw new Error(`[LearningComparison] Número ${numero} duplicado no concurso ${i}.`);
            unicos.add(numero);
        }
    }
}

async function main(): Promise<void> {
    const loteria = 'megasena';
    const csvParser = new CsvParser();
    const contexto = await csvParser.load(loteria);
    if (!contexto) throw new Error(`[LearningComparison] Não foi possível carregar "${loteria}".`);

    console.log('');
    console.log('============================================================');
    console.log('🧪 COMPARAÇÃO BASELINE x ADAPTATIVO');
    console.log('============================================================');
    console.log(`Loteria: ${loteria}`);
    console.log(`Concursos: ${contexto.dados.length}`);
    console.log('Mínimo de treino: 300');
    console.log('Passo: 1');

    const resultado = executarComparacaoLearning(contexto.dados, {
        loteria,
        maxNumero: contexto.config.maxNumero,
        incluirZero: contexto.config.incluirZero,
        quantidadeNumeros: contexto.config.numerosPadrao,
        minTreino: 300,
        passo: 1,
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
    console.log('---------------- BASELINE ----------------');
    console.log(`Testes: ${resultado.testes}`);
    console.log(`Média: ${resultado.baseline.mediaAcertos.toFixed(6)}`);
    console.log(`Mediana: ${resultado.baseline.medianaAcertos.toFixed(6)}`);
    console.log(`Desvio-padrão: ${resultado.baseline.desvioPadraoAcertos.toFixed(6)}`);

    console.log('');
    console.log('---------------- ADAPTATIVO ----------------');
    console.log(`Média: ${resultado.adaptativo.mediaAcertos.toFixed(6)}`);
    console.log(`Mediana: ${resultado.adaptativo.medianaAcertos.toFixed(6)}`);
    console.log(`Desvio-padrão: ${resultado.adaptativo.desvioPadraoAcertos.toFixed(6)}`);

    console.log('');
    console.log('---------------- COMPARAÇÃO ----------------');
    console.log(`Diferença de média: ${resultado.comparacao.diferencaMedia.toFixed(6)}`);
    console.log(`Ganho percentual: ${resultado.comparacao.ganhoPercentual === null ? 'N/A' : (resultado.comparacao.ganhoPercentual * 100).toFixed(4) + '%'}`);
    console.log(`Adaptativo melhor: ${resultado.comparacao.testesAdaptativoMelhor}`);
    console.log(`Baseline melhor: ${resultado.comparacao.testesBaselineMelhor}`);
    console.log(`Empates: ${resultado.comparacao.testesEmpate}`);

    console.log('');
    console.log('---------------- PESOS FINAIS ----------------');
    console.table(resultado.pesosFinais);
    console.log(`Ciclos de aprendizado: ${resultado.ciclosAprendizado}`);
    console.log('');
    console.log('============================================================');
    console.log('TESTE FINALIZADO');
    console.log('============================================================');
}

if (typeof require !== 'undefined' && require.main === module) {
    main().catch(error => {
        console.error('❌ FALHA NA COMPARAÇÃO');
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    });
}
