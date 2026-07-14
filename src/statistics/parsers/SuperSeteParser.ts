// ============================================
// CAMINHO: src/statistics/parsers/SuperSeteParser.ts
// ============================================
// PARSER ESPECÍFICO PARA SUPER SETE
// ============================================

import { BaseParser, ParseResult } from './BaseParser';

export class SuperSeteParser extends BaseParser {
    constructor() {
        super({
            maxNumero: 9,
            incluirZero: true,
            numerosPadrao: 7,
            manterOrdem: true // ← SUPER SETE NÃO ORDENA!
        });
    }

    parse(texto: string): ParseResult {
        const linhas = texto.split('\n').filter(l => l.trim() && !l.startsWith('Data'));
        const dados: number[][] = [];
        const datas: string[] = [];

        const sep = this.detectarSeparador(linhas);

        for (const linha of linhas) {
            if (!linha.trim()) continue;

            let colunas = linha.split(sep);
            colunas = this.limparColunas(colunas);

            if (colunas.length < 2) continue;

            const { data, dataIndex } = this.extrairData(colunas);
            if (!data) continue;

            const numeros: number[] = [];

            // ✅ SUPER SETE: Manter a ordem original (POSICIONAL)
            // As 7 colunas após a data são os números
            for (let j = dataIndex + 1; j < colunas.length && j <= dataIndex + 7; j++) {
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

                // ✅ Super Sete: números de 0 a 9 (incluir zero)
                if (num >= 0 && num <= 9) {
                    numeros.push(num);
                }
            }

            // ✅ SUPER SETE: NÃO ORDENAR! Manter a ordem original
            if (numeros.length === 7) {
                dados.push(numeros); // ← SEM SORT!
                datas.push(data);
            }
        }

        return { dados, datas };
    }
}
