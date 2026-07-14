// ============================================
// CAMINHO: src/statistics/parsers/MegaSenaParser.ts
// ============================================
// PARSER ESPECÍFICO PARA MEGA-SENA
// ============================================

import { BaseParser, ParseResult } from './BaseParser';

export class MegaSenaParser extends BaseParser {
    constructor() {
        super({
            maxNumero: 60,
            incluirZero: false,
            numerosPadrao: 6,
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

            // Mega-Sena: números de 1 a 60
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

                if (num >= 1 && num <= 60) {
                    numeros.push(num);
                }
            }

            // ✅ Mega-Sena: ORDENAR os números
            if (numeros.length >= 6) {
                const numerosOrdenados = numeros.slice(0, 6).sort((a, b) => a - b);
                dados.push(numerosOrdenados);
                datas.push(data);
            }
        }

        return { dados, datas };
    }
}
