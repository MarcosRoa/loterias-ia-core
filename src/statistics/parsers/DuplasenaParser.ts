```ts
// ============================================
// CAMINHO: src/statistics/parsers/DuplasenaParser.ts
// ============================================
// PARSER ESPECÍFICO PARA DUPLA SENA  03/09/2026
// ============================================

import { BaseParser, ParseResult } from './BaseParser';

export class DuplasenaParser extends BaseParser {
    constructor() {
        super({
            maxNumero: 50,
            incluirZero: false,
            numerosPadrao: 6,
            manterOrdem: false
        });
    }

    parse(texto: string): ParseResult {
        const linhas = texto.split('\n').filter(l => l.trim() && !l.startsWith('Data'));
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
                    `DuplasenaParser: concurso não encontrado antes da data "${data}".`
                );
            }

            const concursoValor = colunas[concursoIndex]?.trim();

            if (!concursoValor || !/^\d+$/.test(concursoValor)) {
                throw new Error(
                    `DuplasenaParser: concurso inválido na linha com data "${data}". Valor encontrado: "${concursoValor}".`
                );
            }

            const concurso = parseInt(concursoValor, 10);

            if (!Number.isInteger(concurso) || concurso < 1) {
                throw new Error(
                    `DuplasenaParser: número de concurso inválido na linha com data "${data}". Valor: "${concursoValor}".`
                );
            }

            const numeros: number[] = [];

            // Dupla Sena: números de 1 a 50
            for (let j = dataIndex + 1; j < colunas.length; j++) {
                let valor = colunas[j]?.trim();

                if (valor === '' || valor === undefined) continue;

                let num = parseInt(valor);

                if (isNaN(num)) {
                    const numStr = valor.toString().trim();

                    if (/^\d+$/.test(numStr)) {
                        num = parseInt(numStr);
                    } else {
                        continue;
                    }
                }

                if (num >= 1 && num <= 50) {
                    numeros.push(num);
                }
            }

            /*
             * Cada concurso da Dupla Sena possui dois sorteios.
             *
             * O CSV contém os 12 números na mesma linha:
             * 6 números do 1º sorteio
             * 6 números do 2º sorteio
             *
             * Mantemos os dois sorteios como duas entradas em `dados`,
             * mas repetimos o mesmo número de concurso para preservar
             * a identidade do concurso original.
             */
            if (numeros.length >= 12) {
                const primeiroSorteio = numeros
                    .slice(0, 6)
                    .sort((a, b) => a - b);

                const segundoSorteio = numeros
                    .slice(6, 12)
                    .sort((a, b) => a - b);

                dados.push(primeiroSorteio);
                datas.push(data);
                concursos.push(concurso);

                dados.push(segundoSorteio);
                datas.push(data);
                concursos.push(concurso);
            } else if (numeros.length >= 6) {
                const numerosOrdenados = numeros
                    .slice(0, 6)
                    .sort((a, b) => a - b);

                dados.push(numerosOrdenados);
                datas.push(data);
                concursos.push(concurso);
            }
        }

        return {
            concursos,
            dados,
            datas
        };
    }
}
