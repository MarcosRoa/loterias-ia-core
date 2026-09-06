import { CsvLoader } from '../../services/CsvLoader';
import { AdaptiveCalibration } from '../services/AdaptiveCalibration';

async function main() {
    console.log('============================================');
    console.log('🧠 TESTE CURTO — ADAPTIVE CALIBRATION');
    console.log('============================================');

    const lottery = 'megasena';

    const csvLoader = new CsvLoader();
    const dataset = await CsvLoader.load(lottery);

    if (!dataset) {
        throw new Error(
            `[TestAdaptiveCalibration] Dataset não carregado: ${lottery}`
        );
    }

    console.log(`📊 Concursos carregados: ${dataset.dados.length}`);

    // Amostra curta para validar o circuito.
    // Não é calibração definitiva.
    const dadosTeste = dataset.dados.slice(0, 450);

    console.log(`🔬 Concursos utilizados no teste: ${dadosTeste.length}`);

    const calibration = new AdaptiveCalibration({
        loteria: lottery,
        maxNumero: 60,
        incluirZero: false,
        quantidadeNumeros: 6,
        minTreino: 300,
        passo: 10,
        topPatternsCount: 10,
        numbersPerPattern: 5,
        recentWindow: 20,

        adaptiveLearning: {
            amostrasMinimas: 100
        }
    });

    console.log('🚀 Executando calibração curta...');

    const resultado = calibration.executar(dadosTeste);

    console.log('');
    console.log('============================================');
    console.log('📈 RESULTADO');
    console.log('============================================');

    console.log(`Loteria: ${resultado.loteria}`);
    console.log(`Concursos: ${resultado.concursos}`);
    console.log(`Testes: ${resultado.testes}`);
    console.log(
        `Média de acertos: ${resultado.mediaAcertos.toFixed(6)}`
    );
    console.log(`Ciclo: ${resultado.ciclo}`);
    console.log(
        `Estabilidade: ${resultado.estabilidade.toFixed(6)}`
    );

    console.log('');
    console.log('Pesos iniciais:');
    console.table(resultado.pesosIniciais);

    console.log('Pesos finais:');
    console.table(resultado.pesosFinais);

    const pesosMudaram =
        JSON.stringify(resultado.pesosIniciais) !==
        JSON.stringify(resultado.pesosFinais);

    console.log('');
    console.log(
        pesosMudaram
            ? '✅ Os pesos foram adaptados.'
            : '⚠️ Os pesos permaneceram iguais.'
    );

    const previsaoInicial = resultado.previsoes[0];
    const previsaoFinal =
        resultado.previsoes[resultado.previsoes.length - 1];

    console.log('');
    console.log('Primeira previsão:');
    console.log(previsaoInicial);

    console.log('');
    console.log('Última previsão:');
    console.log(previsaoFinal);

    console.log('');
    console.log('============================================');
    console.log('✅ TESTE CONCLUÍDO');
    console.log('============================================');
}

main().catch(error => {
    console.error('');
    console.error('❌ TESTE FALHOU');
    console.error(error);
    process.exit(1);
});
