// ============================================
// CAMINHO: src/tests/CsvLoader.validation.ts
// ============================================
// VALIDAÇÃO DOS DATASETS REAIS - 03/09/2026
// ============================================

import { CsvLoader } from '../services/CsvLoader';

interface LotteryConfig {
    nome: string;
    tipo: string;
    quantidadeNumeros: number;
    maxNumero: number;
    possuiExtras: boolean;
}

const LOTERIAS: LotteryConfig[] = [
    {
        nome: 'Mega-Sena',
        tipo: 'megasena',
        quantidadeNumeros: 6,
        maxNumero: 60,
        possuiExtras: false
    },
    {
        nome: 'Quina',
        tipo: 'quina',
        quantidadeNumeros: 5,
        maxNumero: 80,
        possuiExtras: false
    },
    {
        nome: 'Lotofácil',
        tipo: 'lotofacil',
        quantidadeNumeros: 15,
        maxNumero: 25,
        possuiExtras: false
    },
    {
        nome: 'Lotomania',
        tipo: 'lotomania',
        quantidadeNumeros: 20,
        maxNumero: 99,
        possuiExtras: false
    },
    {
        nome: 'Dupla Sena',
        tipo: 'duplasena',
        quantidadeNumeros: 6,
        maxNumero: 50,
        possuiExtras: false
    },
    {
        nome: 'Timemania',
        tipo: 'timemania',
        quantidadeNumeros: 7,
        maxNumero: 80,
        possuiExtras: true
    },
    {
        nome: '+Milionária',
        tipo: 'milionaria',
        quantidadeNumeros: 6,
        maxNumero: 50,
        possuiExtras: true
    },
    {
        nome: 'Dia de Sorte',
        tipo: 'diadesorte',
        quantidadeNumeros: 7,
        maxNumero: 31,
        possuiExtras: true
    },
    {
        nome: 'Super Sete',
        tipo: 'supersete',
        quantidadeNumeros: 7,
        maxNumero: 9,
        possuiExtras: false
    },
    {
        nome: 'Loteca',
        tipo: 'loteca',
        quantidadeNumeros: 14,
        maxNumero: 2,
        possuiExtras: false
    }
];

function validarDataset(config: LotteryConfig): void {
    console.log('');
    console.log('============================================');
    console.log(`VALIDANDO: ${config.nome}`);
    console.log('============================================');

    const dataset = CsvLoader.load(config.tipo, 'all');

    console.log(`Concursos: ${dataset.concursos.length}`);
    console.log(`Dados: ${dataset.dados.length}`);
    console.log(`Datas: ${dataset.datas.length}`);
    console.log(`Extras: ${dataset.dadosExtras.length}`);
    console.log(`TotalDraws: ${dataset.totalDraws}`);

    // --------------------------------------------
    // 1. Arrays principais devem estar alinhados
    // --------------------------------------------

    if (dataset.concursos.length !== dataset.dados.length) {
        throw new Error(
            `${config.nome}: concursos (${dataset.concursos.length}) ` +
            `!= dados (${dataset.dados.length})`
        );
    }

    if (dataset.datas.length !== dataset.dados.length) {
        throw new Error(
            `${config.nome}: datas (${dataset.datas.length}) ` +
            `!= dados (${dataset.dados.length})`
        );
    }

    if (dataset.totalDraws !== dataset.dados.length) {
        throw new Error(
            `${config.nome}: totalDraws (${dataset.totalDraws}) ` +
            `!= dados (${dataset.dados.length})`
        );
    }

    // --------------------------------------------
    // 2. Deve existir pelo menos um concurso
    // --------------------------------------------

    if (dataset.dados.length === 0) {
        throw new Error(
            `${config.nome}: nenhum concurso foi carregado.`
        );
    }

    // --------------------------------------------
    // 3. Validar números de cada resultado
    // --------------------------------------------

    dataset.dados.forEach((jogo, index) => {
        if (config.nome === 'Loteca') {
            if (jogo.length !== 14) {
                throw new Error(
                    `${config.nome}: concurso índice ${index} possui ` +
                    `${jogo.length} resultados; esperado: 14.`
                );
            }

            jogo.forEach((resultado, posicao) => {
                if (![0, 1, 2].includes(resultado)) {
                    throw new Error(
                        `${config.nome}: resultado inválido na posição ` +
                        `${posicao + 1} do índice ${index}: ${resultado}`
                    );
                }
            });

            return;
        }

        if (jogo.length !== config.quantidadeNumeros) {
            throw new Error(
                `${config.nome}: concurso índice ${index} possui ` +
                `${jogo.length} números; esperado: ${config.quantidadeNumeros}.`
            );
        }

        jogo.forEach((numero, posicao) => {
            if (
                !Number.isInteger(numero) ||
                numero < (config.nome === 'Lotomania' ? 0 : 1) ||
                numero > config.maxNumero
            ) {
                throw new Error(
                    `${config.nome}: número inválido no índice ${index}, ` +
                    `posição ${posicao + 1}: ${numero}`
                );
            }
        });
    });

    // --------------------------------------------
    // 4. Validar concursos
    // --------------------------------------------

    dataset.concursos.forEach((concurso, index) => {
        if (!Number.isInteger(concurso) || concurso < 1) {
            throw new Error(
                `${config.nome}: concurso inválido no índice ${index}: ${concurso}`
            );
        }
    });

    // --------------------------------------------
    // 5. Validar datas
    // --------------------------------------------

    dataset.datas.forEach((data, index) => {
        if (!data || typeof data !== 'string') {
            throw new Error(
                `${config.nome}: data inválida no índice ${index}: ${data}`
            );
        }
    });

    // --------------------------------------------
    // 6. Validar extras
    // --------------------------------------------

    if (config.possuiExtras) {
        if (dataset.dadosExtras.length !== dataset.dados.length) {
            throw new Error(
                `${config.nome}: extras (${dataset.dadosExtras.length}) ` +
                `!= dados (${dataset.dados.length})`
            );
        }
    }

    // --------------------------------------------
    // 7. Validação específica da Dupla Sena
    // --------------------------------------------

    if (config.nome === 'Dupla Sena') {
        if (dataset.dados.length % 2 !== 0) {
            throw new Error(
                'Dupla Sena: quantidade de sorteios não é par.'
            );
        }

        for (let i = 0; i < dataset.concursos.length; i += 2) {
            const concurso1 = dataset.concursos[i];
            const concurso2 = dataset.concursos[i + 1];

            if (concurso1 !== concurso2) {
                throw new Error(
                    `Dupla Sena: concurso ${concurso1} não está ` +
                    `corretamente associado aos dois sorteios.`
                );
            }

            if (dataset.datas[i] !== dataset.datas[i + 1]) {
                throw new Error(
                    `Dupla Sena: datas diferentes nos dois sorteios ` +
                    `do concurso ${concurso1}.`
                );
            }
        }

        console.log('✓ 1º e 2º sorteios estão associados ao mesmo concurso.');
    }

    // --------------------------------------------
    // 8. Validação específica do Super Sete
    // --------------------------------------------

    if (config.nome === 'Super Sete') {
        dataset.dados.forEach((jogo, index) => {
            if (jogo.length !== 7) {
                throw new Error(
                    `Super Sete: concurso índice ${index} não possui 7 posições.`
                );
            }
        });

        console.log('✓ 7 posições preservadas.');
    }

    // --------------------------------------------
    // RESULTADO
    // --------------------------------------------

    console.log(`✓ ${config.nome}: VALIDADO`);
}

console.log('');
console.log('############################################');
console.log('# VALIDAÇÃO DOS 10 DATASETS - Loterias IA #');
console.log('############################################');

for (const config of LOTERIAS) {
    validarDataset(config);
}

console.log('');
console.log('############################################');
console.log('# TODOS OS DATASETS FORAM VALIDADOS       #');
console.log('############################################');
