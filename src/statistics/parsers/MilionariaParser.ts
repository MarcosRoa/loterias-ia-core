// ============================================
// CAMINHO: src/statistics/parsers/MilionariaParser.ts
// ============================================
// PARSER ESPECÍFICO PARA +MILIONÁRIA
// ============================================

import { BaseParser, ParseResult } from './BaseParser';

export class MilionariaParser extends BaseParser {
    constructor() {
        super({
            maxNumero: 50,
            incluirZero: false,
            numerosPadrao: 6,
            manterOrdem: false // Ordena os números (como Mega-Sena)
        });
    }

    parse(texto: string): ParseResult {
        const linhas = texto.split('\n').filter(l => l.trim() && !l.startsWith('Data'));
        const dados: number[][] = [];
        const datas: string[] = [];
        const dadosExtras: any[] = []; // ← Trevos

        const sep = this.detectarSeparador(linhas);

        for (const linha of linhas) {
            if (!linha.trim()) continue;

            let colunas = linha.split(sep);
            colunas = this.limparColunas(colunas);

            if (colunas.length < 2) continue;

            const { data, dataIndex } = this.extrairData(colunas);
            if (!data) continue;

            const numeros: number[] = [];
            const trevos: number[] = [];

            // +Milionária: 6 números (1-50) + 2 trevos (1-6)
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

                // ✅ Se for trevo (1-6) e já tiver 6 números, guarda como trevo
                if (num >= 1 && num <= 6 && numeros.length >= 6) {
                    trevos.push(num);
                } 
                // ✅ Senão, guarda como número normal (1-50)
                else if (num >= 1 && num <= 50) {
                    numeros.push(num);
                }
            }

            // ✅ +Milionária: ORDENAR os números (como Mega-Sena)
            if (numeros.length >= 6) {
                const numerosOrdenados = numeros.slice(0, 6).sort((a, b) => a - b);
                dados.push(numerosOrdenados);
                datas.push(data);
                dadosExtras.push({ trevos: trevos.slice(0, 2) });
            }
        }

        return { dados, datas, dadosExtras };
    }
}
