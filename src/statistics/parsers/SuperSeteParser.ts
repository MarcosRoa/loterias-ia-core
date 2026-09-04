// ============================================
// CAMINHO: src/statistics/parsers/SuperSeteParser.ts
// ============================================
// PARSER ESPECÍFICO PARA SUPER SETE   03/09/2026
// ============================================

import { BaseParser, ParseResult } from './BaseParser';

export class SuperSeteParser extends BaseParser {
    constructor() {
        super({
            maxNumero: 9,
            incluirZero: true,
            numerosPadrao: 7,
            manterOrdem: true // ← SUPER SETE: PRESERVA A ORDEM DAS COLUNAS
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
                    `SuperSeteParser: concurso não encontrado antes da data "${data}".`
                );
            }

            const concursoValor = colunas[concursoIndex]?.trim();

            if (!concursoValor || !/^\d+$/.test(concursoValor)) {
                throw new Error(
                    `SuperSeteParser: concurso inválido na linha com data "${data}". Valor encontrado: "${concursoValor}".`
                );
            }

            const concurso = parseInt(concursoValor, 10);

            if (!Number.isInteger(concurso) || concurso < 1) {
                throw new Error(
                    `SuperSeteParser: número de concurso inválido na linha com data "${data}". Valor: "${concursoValor}".`
                );
            }

            const numeros: number[] = [];

            // Super Sete: exatamente 7 colunas, valores de 0 a 9.
            // A ordem das colunas deve ser preservada.
            for (let j = dataIndex + 1; j < dataIndex + 8; j++) {
                const valor = colunas[j]?.trim();

                if (valor === '' || valor === undefined) continue;

                if (!/^\d+$/.test(valor)) continue;

                const num = parseInt(valor, 10);

                if (num >= 0 && num <= 9) {
                    numeros.push(num);
                }
            }

            if (numeros.length === 7) {
                concursos.push(concurso);
                dados.push(numeros);
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
