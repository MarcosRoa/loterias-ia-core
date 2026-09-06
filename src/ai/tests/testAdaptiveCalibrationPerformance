import { CsvLoader } from '../../services/CsvLoader';
import { AdaptiveCalibration } from '../services/AdaptiveCalibration';

async function main() {
    console.log('============================================');
    console.log('⚡ TESTE DE DESEMPENHO — ADAPTIVE CALIBRATION');
    console.log('============================================');

    const inicioTotal = Date.now();

    const lottery = 'megasena';

    const dataset = await CsvLoader.load(lottery);

    if (!dataset) {
        throw new Error(
            `[Performance] Dataset não carregado: ${lottery}`
        );
    }

    console.log(`📊 Concursos disponíveis: ${dataset.dados.length}`);

    const config = {
        loteria: lottery,
        maxNumero: 60,
        incluirZero: false,
        quantidadeNumeros: 6,

        // Usa todo o histórico disponível.
        minTreino: 300,
        passo: 10,

        topPatternsCount: 10,
        numbersPerPattern: 5,
        recentWindow: 20,

        adaptiveLearning: {
            pesoMinimo: 0.25,
            pesoMaximo: 4,
            alteracaoMaxima: 0.15,
            amostrasMinimas: 100,
            sensibilidade: 0.50,
            suavizacao: 0.20
        }
    };

    console.log('');
    console.log('⚙️ Configuração:');
    console.log(`   minTreino: ${config.minTreino}`);
    console.log(`   passo: ${config.passo}`);
    console.log(`   concursos: ${dataset.dados.length}`);

    const calibration =
        new AdaptiveCalibration(config);

    console.log('');
    console.log('🚀 Iniciando calibração completa...');
    console.log('⏱️ O tempo será medido.');

    const inicioCalibracao = Date.now();

    const resultado =
        calibration.executar(dataset.dados);

    const tempoCalibracao =
        (Date.now() - inicioCalibracao) / 1000;

    const tempoTotal =
        (Date.now() - inicioTotal) / 1000;

    console.log('');
    console.log('============================================');
    console.log('📈 RESULTADO');
    console.log('============================================');

    console.log(
        `Concursos: ${resultado.concursos}`
    );

    console.log(
        `Testes: ${resultado.testes}`
    );

    console.log(
        `Ciclos: ${resultado.ciclo}`
    );

    console.log(
        `Média de acertos: ${resultado.mediaAcertos.toFixed(6)}`
    );

    console.log(
        `Estabilidade: ${resultado.estabilidade.toFixed(6)}`
    );

    console.log('');
    console.log(
        `⏱️ Tempo calibração: ${tempoCalibracao.toFixed(2)} segundos`
    );

    console.log(
        `⏱️ Tempo total: ${tempoTotal.toFixed(2)} segundos`
    );

    console.log('');
    console.log('Pesos finais:');
    console.table(resultado.pesosFinais);

    console.log('');
    console.log('Última previsão:');

    console.log(
        resultado.previsoes[
            resultado.previsoes.length - 1
        ]
    );

    console.log('');
    console.log('============================================');
    console.log('✅ TESTE DE DESEMPENHO CONCLUÍDO');
    console.log('============================================');
}

main().catch(error => {
    console.error('');
    console.error('❌ TESTE FALHOU');
    console.error(error);
    process.exit(1);
});
