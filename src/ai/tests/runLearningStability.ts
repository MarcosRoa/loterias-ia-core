// ============================================================
// src/ai/tests/runLearningStability.ts  04/09/2026
// ============================================================
// TESTE FINAL DE ESTABILIDADE TEMPORAL
//
// Executa o mesmo holdout em três pontos de corte:
// 50%, 60% e 70% de calibração.
//
// Não altera serviços de produção.
// Reutiliza executarHoldout() já validado.
// O holdout de cada janela permanece intacto.
// ============================================================

import { CsvParser } from '../../statistics/utils/CsvParser';
import { executarHoldout } from './compareLearningHoldout';

interface ResultadoJanela {
    percentualCalibracao: number;
    testesCalibracao: number;
    testesHoldout: number;
    baseline: number;
    adaptativo: number;
    diferenca: number;
    ganhoPercentual: number | null;
    adaptativoMelhor: number;
    baselineMelhor: number;
    empates: number;
}

async function main(): Promise<void> {

    const loteria = 'megasena';

    const percentuais = [0.50, 0.60, 0.70];

    console.log('');
    console.log('============================================================');
    console.log('🧪 TESTE FINAL — ESTABILIDADE TEMPORAL');
    console.log('============================================================');
    console.log(`Loteria: ${loteria}`);
    console.log('Janelas de calibração: 50%, 60%, 70%');
    console.log('');

    const csvParser = new CsvParser();
    const contexto = await csvParser.load(loteria);

    if (!contexto) {
        throw new Error(
            `[LearningStability] Não foi possível carregar "${loteria}".`
        );
    }

    if (
        !Array.isArray(contexto.dados) ||
        contexto.dados.length === 0
    ) {
        throw new Error(
            `[LearningStability] Dados inválidos para "${loteria}".`
        );
    }

    const resultados: ResultadoJanela[] = [];

    for (const percentualCalibracao of percentuais) {

        console.log('');
        console.log('############################################################');
        console.log(
            `### JANELA DE ESTABILIDADE: ` +
            `${(percentualCalibracao * 100).toFixed(0)}% CALIBRAÇÃO`
        );
        console.log('############################################################');

        const resultado = executarHoldout(
            contexto.dados,
            {
                loteria,
                maxNumero: contexto.config.maxNumero,
                incluirZero: contexto.config.incluirZero,
                quantidadeNumeros: contexto.config.numerosPadrao,
                minTreino: 300,
                passo: 1,
                percentualCalibracao,
                adaptiveLearning: {
                    pesoMinimo: 0.25,
                    pesoMaximo: 4.0,
                    alteracaoMaxima: 0.15,
                    amostrasMinimas: 100,
                    sensibilidade: 0.50,
                    suavizacao: 0.20
                }
            }
        );

        resultados.push({
            percentualCalibracao,
            testesCalibracao: resultado.testesCalibracao,
            testesHoldout: resultado.testesHoldout,
            baseline:
                resultado.baselineHoldout.mediaAcertos,
            adaptativo:
                resultado.adaptativoHoldout.mediaAcertos,
            diferenca:
                resultado.comparacaoHoldout.diferencaMedia,
            ganhoPercentual:
                resultado.comparacaoHoldout.ganhoPercentual,
            adaptativoMelhor:
                resultado.comparacaoHoldout.testesAdaptativoMelhor,
            baselineMelhor:
                resultado.comparacaoHoldout.testesBaselineMelhor,
            empates:
                resultado.comparacaoHoldout.testesEmpate
        });

        console.log('');
        console.log(
            `✅ Janela ${(percentualCalibracao * 100).toFixed(0)}% concluída.`
        );
    }

    console.log('');
    console.log('============================================================');
    console.log('📊 RESULTADO — ESTABILIDADE TEMPORAL');
    console.log('============================================================');

    console.table(
        resultados.map(resultado => ({
            calibracao:
                `${(resultado.percentualCalibracao * 100).toFixed(0)}%`,
            testesCalibracao:
                resultado.testesCalibracao,
            testesHoldout:
                resultado.testesHoldout,
            baseline:
                resultado.baseline.toFixed(6),
            adaptativo:
                resultado.adaptativo.toFixed(6),
            diferenca:
                resultado.diferenca.toFixed(6),
            ganho:
                resultado.ganhoPercentual === null
                    ? 'N/A'
                    : `${(
                        resultado.ganhoPercentual * 100
                    ).toFixed(4)}%`,
            adaptativoMelhor:
                resultado.adaptativoMelhor,
            baselineMelhor:
                resultado.baselineMelhor,
            empates:
                resultado.empates
        }))
    );

    const janelasPositivas =
        resultados.filter(
            resultado => resultado.diferenca > 0
        ).length;

    const janelasNegativas =
        resultados.filter(
            resultado => resultado.diferenca < 0
        ).length;

    const janelasNeutras =
        resultados.filter(
            resultado => resultado.diferenca === 0
        ).length;

    const mediaDiferencas =
        resultados.reduce(
            (soma, resultado) =>
                soma + resultado.diferenca,
            0
        ) / resultados.length;

    console.log('');
    console.log('------------------------------------------------------------');
    console.log('🔎 SÍNTESE');
    console.log('------------------------------------------------------------');
    console.log(
        `Janelas positivas: ${janelasPositivas}/${resultados.length}`
    );
    console.log(
        `Janelas negativas: ${janelasNegativas}/${resultados.length}`
    );
    console.log(
        `Janelas neutras: ${janelasNeutras}/${resultados.length}`
    );
    console.log(
        `Média das diferenças: ${mediaDiferencas.toFixed(6)}`
    );

    if (janelasNegativas === 0 && janelasPositivas > 0) {
        console.log('');
        console.log(
            '🟢 SINAL DE ESTABILIDADE: o adaptativo não ficou abaixo '
            + 'do baseline em nenhuma janela.'
        );
    } else if (janelasPositivas > janelasNegativas) {
        console.log('');
        console.log(
            '🟡 SINAL MISTO, MAS FAVORÁVEL: o adaptativo venceu '
            + 'mais janelas do que perdeu.'
        );
    } else if (janelasNegativas > janelasPositivas) {
        console.log('');
        console.log(
            '🔴 SINAL DE INSTABILIDADE: o adaptativo perdeu '
            + 'mais janelas do que venceu.'
        );
    } else {
        console.log('');
        console.log(
            '⚪ RESULTADO EQUILIBRADO: não há vantagem temporal clara.'
        );
    }

    console.log('');
    console.log('============================================================');
    console.log('TESTE DE ESTABILIDADE FINALIZADO');
    console.log('============================================================');
}

main().catch(error => {
    console.error('');
    console.error('============================================================');
    console.error('❌ FALHA NO TESTE DE ESTABILIDADE');
    console.error('============================================================');
    console.error(
        error instanceof Error
            ? error.message
            : error
    );
    process.exitCode = 1;
});
