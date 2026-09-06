import { CsvLoader } from '../../services/CsvLoader';

import { AdaptiveCalibration } from '../services/AdaptiveCalibration';

import {
    AdaptiveLearning,
    AdaptiveLearningConfig
} from '../services/AdaptiveLearning';

import { AdaptiveLearningState } from '../services/AdaptiveLearningState';

import {
    FactorEvaluation,
    FactorEvaluationInput
} from '../services/FactorEvaluation';

import {
    FeatureEngineering,
    NumberFeatures
} from '../services/FeatureEngineering';

import {
    PredictiveScoring,
    PredictiveFeatures,
    PredictiveScoringWeights
} from '../services/PredictiveScoring';

import { StatisticsContext } from '../services/StatisticsContext';

async function main() {

    console.log('============================================');
    console.log('🔬 COMPARAÇÃO REAL');
    console.log('ADAPTIVE CALIBRATION × WALK-FORWARD ORIGINAL');
    console.log('============================================');

    const lottery = 'megasena';

    const dataset = await CsvLoader.load(lottery);

    if (!dataset) {
        throw new Error(
            `[compareAdaptiveCalibration] Dataset não carregado: ${lottery}`
        );
    }

    const dados = dataset.dados.slice(0, 450);

    const adaptiveConfig: AdaptiveLearningConfig = {
        pesoMinimo: 0.25,
        pesoMaximo: 4,
        alteracaoMaxima: 0.15,
        amostrasMinimas: 100,
        sensibilidade: 0.50,
        suavizacao: 0.20
    };

    const config = {
        loteria: lottery,
        maxNumero: 60,
        incluirZero: false,
        quantidadeNumeros: 6,
        minTreino: 300,
        passo: 10,
        topPatternsCount: 10,
        numbersPerPattern: 5,
        recentWindow: 20,
        adaptiveLearning: adaptiveConfig
    };

    console.log(`📊 Concursos: ${dados.length}`);
    console.log(`🔢 Min treino: ${config.minTreino}`);
    console.log(`➡️ Passo: ${config.passo}`);

    // ========================================================
    // 1. NOVO SERVIÇO
    // ========================================================

    console.log('');
    console.log('🚀 Executando AdaptiveCalibration...');

    const calibration =
        new AdaptiveCalibration(config);

    const novo =
        calibration.executar(dados);

    // ========================================================
    // 2. CIRCUITO WALK-FORWARD ORIGINAL
    // ========================================================

    console.log('');
    console.log('🚀 Executando Walk-Forward Original...');

    const predictiveScoring =
        new PredictiveScoring();

    const factorEvaluation =
        new FactorEvaluation();

    const adaptiveLearning =
        new AdaptiveLearning(adaptiveConfig);

    const state =
        new AdaptiveLearningState(
            lottery,
            { ...predictiveScoring.getWeights() }
        );

    const previsoesOriginais: Array<{
        concursoIndex: number;
        numerosPrevistos: number[];
        numerosReais: number[];
        acertos: number;
    }> = [];

    const fatoresAcumulados:
        Record<string, FactorEvaluationInput[]> = {};

    const fatores: Array<
        keyof PredictiveScoringWeights
    > = [
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

    for (const fator of fatores) {
        fatoresAcumulados[fator] = [];
    }

    for (
        let indice = config.minTreino;
        indice < dados.length;
        indice += config.passo
    ) {

        const dadosTreino =
            dados
                .slice(0, indice)
                .map(concurso => [...concurso]);

        const resultadoReal =
            [...dados[indice]];

        // ----------------------------------------------------
        // FEATURES — somente passado
        // ----------------------------------------------------

        const context =
            new StatisticsContext(dadosTreino);

        const featureEngineering =
            new FeatureEngineering(
                context,
                {
                    maxNumero: config.maxNumero,
                    incluirZero: config.incluirZero,
                    topPatternsCount:
                        config.topPatternsCount,
                    numbersPerPattern:
                        config.numbersPerPattern,
                    recentWindow:
                        config.recentWindow
                }
            );

        const features =
            featureEngineering.extrairFeatures();

        const predictiveFeatures:
            PredictiveFeatures[] =
            features.map(feature => ({
                numero: feature.numero,
                frequencia: feature.frequencia,
                tendenciaFrequencia:
                    feature.tendenciaFrequencia,
                estabilidadeFrequencia:
                    feature.estabilidadeFrequencia,
                atraso: feature.atraso,
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

        // ----------------------------------------------------
        // PREVISÃO — pesos atuais
        // ----------------------------------------------------

        const scores =
            predictiveScoring.calcularScores(
                predictiveFeatures
            );

        const numerosPrevistos =
            [...scores]
                .sort((a, b) => {
                    if (b.score !== a.score) {
                        return b.score - a.score;
                    }

                    return a.numero - b.numero;
                })
                .slice(0, config.quantidadeNumeros)
                .map(item => item.numero);

        const acertos =
            numerosPrevistos.filter(numero =>
                resultadoReal.includes(numero)
            ).length;

        previsoesOriginais.push({
            concursoIndex: indice,
            numerosPrevistos,
            numerosReais: resultadoReal,
            acertos
        });

        // ----------------------------------------------------
        // APRENDIZADO — somente depois da previsão
        // ----------------------------------------------------

        for (const fator of fatores) {

            for (const feature of features) {

                fatoresAcumulados[fator].push({
                    numero: feature.numero,
                    fator: feature[fator],
                    resultadoReal:
                        resultadoReal.includes(feature.numero)
                });
            }
        }

        const avaliacao =
            factorEvaluation.avaliarFatores(
                fatoresAcumulados
            );

        const aprendizado =
            adaptiveLearning.ajustar(
                state.getPesosAtuais(),
                avaliacao.fatores
            );

        if (aprendizado.alteracoesAplicadas > 0) {

            state.aplicarResultado(
                aprendizado
            );

            predictiveScoring.setWeights(
                aprendizado.pesosNovos
            );
        }
    }

    // ========================================================
    // 3. COMPARAÇÃO
    // ========================================================

    console.log('');
    console.log('============================================');
    console.log('📊 COMPARAÇÃO');
    console.log('============================================');

    let previsoesIguais = 0;
    let previsoesDiferentes = 0;

    for (
        let i = 0;
        i < novo.previsoes.length;
        i++
    ) {

        const a = novo.previsoes[i];
        const b = previsoesOriginais[i];

        const numerosIguais =
            JSON.stringify(a.numerosPrevistos) ===
            JSON.stringify(b.numerosPrevistos);

        const acertosIguais =
            a.acertos === b.acertos;

        if (numerosIguais && acertosIguais) {
            previsoesIguais++;
        } else {
            previsoesDiferentes++;

            console.log('');
            console.log(
                `⚠️ Divergência no índice ${a.concursoIndex}`
            );

            console.log(
                'AdaptiveCalibration:',
                a
            );

            console.log(
                'Walk-Forward Original:',
                b
            );
        }
    }

    const pesosNovos =
        novo.pesosFinais;

    const pesosOriginais =
        predictiveScoring.getWeights();

    let pesosIguais = true;

    for (const fator of fatores) {

        const diferenca =
            Math.abs(
                pesosNovos[fator] -
                pesosOriginais[fator]
            );

        if (diferenca > 1e-12) {
            pesosIguais = false;

            console.log(
                `⚠️ Peso diferente: ${fator}`
            );

            console.log(
                'Novo:',
                pesosNovos[fator]
            );

            console.log(
                'Original:',
                pesosOriginais[fator]
            );
        }
    }

    const mediaOriginal =
        previsoesOriginais.reduce(
            (total, previsao) =>
                total + previsao.acertos,
            0
        ) / previsoesOriginais.length;

    console.log('');
    console.log(`Previsões iguais: ${previsoesIguais}`);
    console.log(
        `Previsões diferentes: ${previsoesDiferentes}`
    );

    console.log('');
    console.log(
        `Média AdaptiveCalibration: ${novo.mediaAcertos.toFixed(6)}`
    );

    console.log(
        `Média Walk-Forward Original: ${mediaOriginal.toFixed(6)}`
    );

    console.log(
        `Ciclo AdaptiveCalibration: ${novo.ciclo}`
    );

    console.log(
        `Ciclo Walk-Forward Original: ${state.getSnapshot().cicloAtual}`
    );

    console.log('');
    console.log(
        `Pesos equivalentes: ${pesosIguais ? 'SIM ✅' : 'NÃO ❌'}`
    );

    console.log('');
    console.log('============================================');

    if (
        previsoesDiferentes === 0 &&
        Math.abs(
            novo.mediaAcertos -
            mediaOriginal
        ) < 1e-12 &&
        pesosIguais &&
        novo.ciclo ===
        state.getSnapshot().cicloAtual
    ) {
        console.log(
            '✅ EQUIVALÊNCIA CONFIRMADA'
        );
        console.log(
            'O AdaptiveCalibration reproduz o circuito walk-forward original.'
        );
    } else {
        console.log(
            '❌ EQUIVALÊNCIA NÃO CONFIRMADA'
        );
        console.log(
            'Existe alguma divergência entre os dois circuitos.'
        );
    }

    console.log('============================================');
}

main().catch(error => {
    console.error('');
    console.error('❌ TESTE FALHOU');
    console.error(error);
    process.exit(1);
});
