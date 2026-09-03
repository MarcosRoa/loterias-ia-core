// ============================================
// CAMINHO: src/statistics/parsers/DiaDeSorteParser.ts
// ============================================
// PARSER ESPECÍFICO PARA DIA DE SORTE  03/09/2026
// ============================================

import { BaseParser, ParseResult } from './BaseParser';

export class DiaDeSorteParser extends BaseParser {
    constructor() {
        super({
            maxNumero: 31,
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

        const meses: Record<string, number> = {
            janeiro: 1,
            fevereiro: 2,
            marco: 3,
            março: 3,
            abril: 4,
            maio: 5,
            junho: 6,
            julho: 7,
            agosto: 8,
            setembro: 9,
            outubro: 10,
            novembro: 11,
            dezembro: 12
        };

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
                    `DiaDeSorteParser: concurso não encontrado antes da data "${data}".`
                );
            }

            const concursoValor = colunas[concursoIndex]?.trim();

            if (!concursoValor || !/^\d+$/.test(concursoValor)) {
                throw new Error(
                    `DiaDeSorteParser: concurso inválido na linha com data "${data}". Valor encontrado: "${concursoValor}".`
                );
            }

            const concurso = parseInt(concursoValor, 10);

            if (!Number.isInteger(concurso) || concurso < 1) {
                throw new Error(
                    `DiaDeSorteParser: número de concurso inválido na linha com data "${data}". Valor: "${concursoValor}".`
                );
            }

            const numeros: number[] = [];

            // Dia de Sorte: 7 números de 1 a 31
            for (let j = dataIndex + 1; j < dataIndex + 8; j++) {
                const valor = colunas[j]?.trim();

                if (valor === '' || valor === undefined) continue;

                const num = parseInt(valor);

                if (!isNaN(num) && num >= 1 && num <= 31) {
                    numeros.push(num);
                }
            }

            // Mês da Sorte fica imediatamente após os 7 números
            const mesIndex = dataIndex + 8;
            const mesValor = colunas[mesIndex]?.trim() || '';

            let mesSorte: number | null = null;

            if (/^\d+$/.test(mesValor)) {
                const mes = parseInt(mesValor, 10);

                if (mes >= 1 && mes <= 12) {
                    mesSorte = mes;
                }
            } else {
                const mesNormalizado = mesValor
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '');

                if (meses[mesNormalizado] !== undefined) {
                    mesSorte = meses[mesNormalizado];
                }
            }

            if (numeros.length >= 7) {
                const numerosOrdenados = numeros
                    .slice(0, 7)
                    .sort((a, b) => a - b);

                concursos.push(concurso);
                dados.push(numerosOrdenados);
                datas.push(data);

                dadosExtras.push(mesSorte);
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
