// ============================================
// CAMINHO: src/statistics/parsers/TimemaniaParser.ts
// ============================================
// PARSER ESPECÍFICO PARA TIMEMANIA  03/09/2026
// ============================================

import { BaseParser, ParseResult } from './BaseParser';

export class TimemaniaParser extends BaseParser {
    constructor() {
        super({
            maxNumero: 80,
            incluirZero: false,
            numerosPadrao: 7,
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
                    `TimemaniaParser: concurso não encontrado antes da data "${data}".`
                );
            }

            const concursoValor = colunas[concursoIndex]?.trim();

            if (!concursoValor || !/^\d+$/.test(concursoValor)) {
                throw new Error(
                    `TimemaniaParser: concurso inválido na linha com data "${data}". Valor encontrado: "${concursoValor}".`
                );
            }

            const concurso = parseInt(concursoValor, 10);

            if (!Number.isInteger(concurso) || concurso < 1) {
                throw new Error(
                    `TimemaniaParser: número de concurso inválido na linha com data "${data}". Valor: "${concursoValor}".`
                );
            }

            const numeros: number[] = [];

            // Time do Coração fica na última coluna
            const ultimoIndice = colunas.length - 1;
            const timeCoracao = colunas[ultimoIndice]?.trim() || '';

            // Timemania: números de 1 a 80
            for (let j = dataIndex + 1; j < ultimoIndice; j++) {
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

                if (num >= 1 && num <= 80) {
                    numeros.push(num);
                }
            }

            if (numeros.length >= 7) {
                const numerosOrdenados = numeros
                    .slice(0, 7)
                    .sort((a, b) => a - b);

                concursos.push(concurso);
                dados.push(numerosOrdenados);
                datas.push(data);
                dadosExtras.push(timeCoracao);
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
