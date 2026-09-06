import { FactorEvaluation } from '../services/FactorEvaluation';

function aucBruta(
    positivos: number[],
    negativos: number[]
): number {
    if (positivos.length === 0 || negativos.length === 0) {
        return 0.5;
    }

    let soma = 0;

    for (const positivo of positivos) {
        for (const negativo of negativos) {
            if (positivo > negativo) {
                soma += 1;
            } else if (positivo === negativo) {
                soma += 0.5;
            }
        }
    }

    return soma / (positivos.length * negativos.length);
}

function gerarValores(
    quantidade: number,
    seed: number
): number[] {
    let estado = seed >>> 0;
    const valores: number[] = [];

    for (let i = 0; i < quantidade; i++) {
        estado =
            (estado * 1664525 + 1013904223) >>> 0;

        // Valores discretos são intencionais:
        // forçam a existência de empates.
        valores.push(
            Number((estado % 21) / 10)
        );
    }

    return valores;
}

function testarCaso(
    positivos: number[],
    negativos: number[],
    nome: string
): void {
    const entradas = [
        ...positivos.map((fator, i) => ({
            numero: i + 1,
            fator,
            resultadoReal: true
        })),
        ...negativos.map((fator, i) => ({
            numero: positivos.length + i + 1,
            fator,
            resultadoReal: false
        }))
    ];

    const avaliador = new FactorEvaluation();

    const resultado =
        avaliador.avaliar(
            nome,
            entradas
        );

    const esperado =
        aucBruta(
            positivos,
            negativos
        );

    const desempenhoEsperado =
        Math.min(
            1,
            Math.max(
                -1,
                (2 * esperado) - 1
            )
        );

    const diferenca =
        Math.abs(
            resultado.desempenho -
            desempenhoEsperado
        );

    if (diferenca > 1e-12) {
        throw new Error(
            `❌ Divergência no caso "${nome}": ` +
            `resultado=${resultado.desempenho}, ` +
            `esperado=${desempenhoEsperado}, ` +
            `diferença=${diferenca}`
        );
    }

    console.log(
        `✅ ${nome}: ` +
        `desempenho=${resultado.desempenho.toFixed(12)}`
    );
}

function main(): void {
    console.log('============================================');
    console.log('🧪 TESTE — FACTOR EVALUATION / AUC');
    console.log('============================================');

    // Casos determinísticos.
    testarCaso(
        [1, 2, 3],
        [0, 0, 0],
        'positivos acima'
    );

    testarCaso(
        [0, 0, 0],
        [1, 2, 3],
        'negativos acima'
    );

    testarCaso(
        [1, 1, 1],
        [1, 1, 1],
        'todos empatados'
    );

    testarCaso(
        [0, 1, 2],
        [1, 2, 3],
        'empates parciais'
    );

    testarCaso(
        [0.1, 0.5, 0.9, 0.9],
        [0.2, 0.5, 0.7, 0.9],
        'empates mistos'
    );

    // Casos aleatórios determinísticos.
    for (let caso = 1; caso <= 50; caso++) {
        const quantidadePositivos =
            1 + (caso % 15);

        const quantidadeNegativos =
            1 + ((caso * 7) % 25);

        const positivos =
            gerarValores(
                quantidadePositivos,
                caso * 101
            );

        const negativos =
            gerarValores(
                quantidadeNegativos,
                caso * 997
            );

        testarCaso(
            positivos,
            negativos,
            `caso determinístico ${caso}`
        );
    }

    // Classes vazias.
    testarCaso([], [1, 2, 3], 'classe positiva vazia');
    testarCaso([1, 2, 3], [], 'classe negativa vazia');

    console.log('');
    console.log('============================================');
    console.log('✅ AUC VALIDADA');
    console.log('============================================');
    console.log(
        'A implementação por ranks reproduz a definição'
    );
    console.log(
        'da AUC baseada em pares, inclusive nos empates.'
    );
}

main();
