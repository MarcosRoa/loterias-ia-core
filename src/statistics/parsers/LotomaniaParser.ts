```ts
// ============================================
// CAMINHO: src/statistics/parsers/LotomaniaParser.ts
// ============================================
// PARSER ESPECÍFICO PARA LOTOMANIA  03/09/2026
// ============================================

import { BaseParser, ParseResult } from './BaseParser';

export class LotomaniaParser extends BaseParser {
    constructor() {
        super({
            maxNumero: 99,
            incluirZero: true,
            numerosPadrao: 20,
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
                    `LotomaniaParser: concurso não encontrado antes da data "${data}".`
                );
            }

            const concursoValor = colunas[concursoIndex]?.trim();

            if (!concursoValor || !/^\d+$/.test(concursoValor)) {
                throw new Error(
                    `LotomaniaParser: concurso inválido na linha com data "${data}". Valor encontrado: "${concursoValor}".`
                );
            }

            const concurso = parseInt(concursoValor, 10);

            if (!Number.isInteger(concurso) || concurso < 1) {
                throw new Error(
                    `LotomaniaParser: número de concurso inválido na linha com data "${data}". Valor: "${concursoValor}".`
                );
            }

            const numeros: number[] = [];

            // Lotomania: números de 00 a 99
            // O 00 é um número válido e deve ser preservado.
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

                if (num >= 0 && num <= 99) {
                    numeros.push(num);
                }
            }

            if (numeros.length >= 20) {
                const numerosOrdenados = numeros
                    .slice(0, 20)
                    .sort((a, b) => a - b);

                concursos.push(concurso);
                dados.push(numerosOrdenados);
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
