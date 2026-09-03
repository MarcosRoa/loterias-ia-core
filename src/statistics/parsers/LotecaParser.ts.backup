```ts
// ============================================
// CAMINHO: src/statistics/parsers/LotecaParser.ts
// ============================================
// PARSER ESPECÍFICO PARA LOTECA  03/09/2026
// ============================================

import { BaseParser, ParseResult } from './BaseParser';

export class LotecaParser extends BaseParser {
    constructor() {
        super({
            maxNumero: 2,
            incluirZero: false,
            numerosPadrao: 14,
            manterOrdem: true
        });
    }

    parse(texto: string): ParseResult {
        const linhas = texto.split('\n').filter(l => l.trim());
        const dados: number[][] = [];
        const datas: string[] = [];
        const concursos: number[] = [];

        const sep = this.detectarSeparador(linhas);

        for (const linha of linhas) {
            if (!linha.trim()) continue;

            let colunas = linha.split(sep);
            colunas = this.limparColunas(colunas);

            if (colunas.length < 2) continue;

            const { data, dataIndex } = this.extrairData(colunas);
            if (!data) continue;

            // Concurso fica imediatamente antes da data
            const concursoIndex = dataIndex - 1;

            if (concursoIndex < 0) {
                throw new Error(
                    `LotecaParser: concurso não encontrado antes da data "${data}".`
                );
            }

            const concursoValor = colunas[concursoIndex]?.trim();

            if (!concursoValor || !/^\d+$/.test(concursoValor)) {
                throw new Error(
                    `LotecaParser: concurso inválido na linha com data "${data}". Valor encontrado: "${concursoValor}".`
                );
            }

            const concurso = parseInt(concursoValor, 10);

            if (!Number.isInteger(concurso) || concurso < 1) {
                throw new Error(
                    `LotecaParser: número de concurso inválido na linha com data "${data}". Valor: "${concursoValor}".`
                );
            }

            const resultados: number[] = [];

            /*
             * LOTECA:
             *
             * Cada concurso possui 14 jogos.
             *
             * Resultado:
             * 1 = vitória do mandante
             * 0 = empate (X)
             * 2 = vitória do visitante
             *
             * A posição de cada resultado corresponde ao jogo.
             * Portanto, a ordem deve ser preservada.
             */

            for (let j = dataIndex + 1; j < colunas.length; j++) {
                const valor = colunas[j]?.trim();

                if (valor === '' || valor === undefined) continue;

                if (valor === '1') {
                    resultados.push(1);
                } else if (
                    valor.toUpperCase() === 'X' ||
                    valor === '0'
                ) {
                    resultados.push(0);
                } else if (valor === '2') {
                    resultados.push(2);
                }

                if (resultados.length === 14) break;
            }

            if (resultados.length === 14) {
                concursos.push(concurso);
                dados.push(resultados);
                datas.push(data);
            }
        }

        return {
            concursos,
            dados,
            datas
        };
    }
}
```
