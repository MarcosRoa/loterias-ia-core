// ============================================
// CAMINHO: src/statistics/parsers/LotomaniaParser.ts
// ============================================
// PARSER ESPECÍFICO PARA LOTOMANIA
// ============================================

import { BaseParser, ParseResult } from './BaseParser';

export class LotomaniaParser extends BaseParser {
    constructor() {
        super({
            maxNumero: 99,
            incluirZero: true, // ← INCLUI 00
            numerosPadrao: 20,
            manterOrdem: false // ← ORDENA OS NÚMEROS
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

            // Lotomania: números de 00 a 99 (inclui zero)
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

            // ✅ Lotomania: ORDENAR os números
            if (numeros.length >= 20) {
                const numerosOrdenados = numeros.slice(0, 20).sort((a, b) => a - b);
                dados.push(numerosOrdenados);
                datas.push(data);
            }
        }

        return { dados, datas };
    }
}
