// ============================================================
// src/ai/tests/runLearningPipelineTest.ts  04/09/2026
// ============================================================
// EXECUTOR LOCAL DO TESTE WALK-FORWARD ADAPTATIVO
// ============================================================

import { CsvParser } from '../../statistics/utils/CsvParser';
import {
    executarWalkForwardAdaptativo,
    LearningPipelineTestConfig
} from './LearningPipeline.test';

async function main(): Promise<void> {

    const loteria = 'megasena';

    console.log('');
    console.log('============================================================');
    console.log('🧠 TESTE REAL - WALK-FORWARD ADAPTATIVO');
    console.log('============================================================');
    console.log(`Loteria: ${loteria}`);
    console.log('');

    const csvParser = new CsvParser();

    const contexto = await csvParser.load(loteria);

    if (!contexto) {
        throw new Error(
            `[Runner] Não foi possível carregar os dados da loteria "${loteria}".`
        );
    }

    if (!Array.isArray(contexto.dados) || contexto.dados.length === 0) {
        throw new Error(
            `[Runner] Dados inválidos para "${loteria}".`
        );
    }

    if (!contexto.config) {
        throw new Error(
            `[Runner] Configuração ausente para "${loteria}".`
        );
    }

    const config: LearningPipelineTestConfig = {
        loteria,

        maxNumero: contexto.config.maxNumero,

        incluirZero: contexto.config.incluirZero,

        quantidadeNumeros:
            contexto.config.numerosPadrao,

        minTreino: 300,

        passo: 1,

        baselineMediaAcertos: 0,

        adaptiveLearning: {
            pesoMinimo: 0.25,
            pesoMaximo: 4.0,
            alteracaoMaxima: 0.15,
            amostrasMinimas: 100,
            sensibilidade: 0.50,
            suavizacao: 0.20
        }
    };

    console.log('Dados carregados:', contexto.dados.length);
    console.log('Máximo:', config.maxNumero);
    console.log('Números por jogo:', config.quantidadeNumeros);
    console.log('Mínimo de treino:', config.minTreino);
    console.log('Passo:', config.passo);
    console.log('');

    const resultado =
        executarWalkForwardAdaptativo(
            contexto.dados,
            config
        );

    console.log('');
    console.log('============================================================');
    console.log('📊 RESULTADO');
    console.log('============================================================');

    console.log(`Aprovado: ${resultado.aprovado}`);
    console.log(`Loteria: ${resultado.loteria}`);
    console.log(`Concursos: ${resultado.concursos}`);
    console.log(`Testes: ${resultado.testesBacktest}`);
    console.log(`Média de acertos: ${resultado.mediaAcertos.toFixed(4)}`);
    console.log(
        `Baseline: ${resultado.baselineMediaAcertos.toFixed(4)}`
    );
    console.log(
        `Ganho sobre baseline: ${resultado.ganhoSobreBaseline.toFixed(4)}`
    );

    console.log('');
    console.log('Pesos antes:');
    console.log(
        JSON.stringify(resultado.pesosAntes, null, 2)
    );

    console.log('');
    console.log('Pesos depois:');
    console.log(
        JSON.stringify(resultado.pesosDepois, null, 2)
    );

    console.log('');
    console.log(`Estabilidade: ${resultado.estabilidade.toFixed(4)}`);
    console.log(`Ciclos: ${resultado.ciclo}`);

    console.log('');
    console.log('Fatores avaliados:');
    console.log(
        resultado.fatoresAvaliados.join(', ')
    );

    if (resultado.erros.length > 0) {
        console.log('');
        console.log('Erros:');

        resultado.erros.forEach(
            erro => console.log(`- ${erro}`)
        );
    }

    console.log('');
    console.log('============================================================');
    console.log('TESTE FINALIZADO');
    console.log('============================================================');
}

main().catch(error => {

    console.error('');
    console.error('============================================================');
    console.error('❌ FALHA NO TESTE');
    console.error('============================================================');

    console.error(
        error instanceof Error
            ? error.message
            : error
    );

    process.exitCode = 1;
});