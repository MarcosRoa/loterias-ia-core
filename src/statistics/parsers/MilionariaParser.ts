// ============================================
// CAMINHO: src/statistics/parsers/MilionariaParser.ts
// ============================================
// PARSER ESPECÍFICO PARA +MILIONÁRIA  03/09/2026
// ============================================

import { BaseParser, ParseResult } from './BaseParser';

export class MilionariaParser extends BaseParser {
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
        const dadosExtras: any[] = [];

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
                    `MilionariaParser: concurso não encontrado antes da data "${data}".`
                );
            }

            const concursoValor = colunas[concursoIndex]?.trim();

            if (!concursoValor || !/^\d+$/.test(concursoValor)) {
                throw new Error(
                    `MilionariaParser: concurso inválido na linha com data "${data}". Valor encontrado: "${concursoValor}".`
                );
            }

            const concurso = parseInt(concursoValor, 10);

            if (!Number.isInteger(concurso) || concurso < 1) {
                throw new Error(
                    `MilionariaParser: número de concurso inválido na linha com data "${data}". Valor: "${concursoValor}".`
                );
            }

            const numeros: number[] = [];
            const trevos: number[] = [];

            /*
             * +Milionária:
             * - 6 números de 1 a 50
             * - 2 trevos de 1 a 6
             *
             * Mantemos a mesma lógica existente:
             * primeiro são coletados os 6 números principais;
             * depois, os valores restantes entre 1 e 6 são
             * tratados como trevos.
             */
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

                if (numeros.length < 6 && num >= 1 && num <= 50) {
                    numeros.push(num);
                } else if (numeros.length >= 6 && num >= 1 && num <= 6) {
                    trevos.push(num);
                }
            }

            if (numeros.length >= 6) {
                const numerosOrdenados = numeros
                    .slice(0, 6)
                    .sort((a, b) => a - b);

                concursos.push(concurso);
                dados.push(numerosOrdenados);
                datas.push(data);

                dadosExtras.push({
                    trevos: trevos.slice(0, 2)
                });
            }
        }

        return {
            concursos,
            dados,
            datas,
            dadosExtras
        };
    }
}
