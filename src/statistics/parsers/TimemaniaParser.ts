// ============================================
// CAMINHO: src/statistics/parsers/TimemaniaParser.ts
// ============================================
// PARSER ESPECÍFICO PARA TIMEMANIA
// ============================================

import { BaseParser, ParseResult } from './BaseParser';

export class TimemaniaParser extends BaseParser {
    constructor() {
        super({
            maxNumero: 80,
            incluirZero: false,
            numerosPadrao: 7,
            manterOrdem: false // Ordena os números (como Mega-Sena)
        });
    }

    parse(texto: string): ParseResult {
        const linhas = texto.split('\n').filter(l => l.trim() && !l.startsWith('Data'));
        const dados: number[][] = [];
        const datas: string[] = [];
        const dadosExtras: any[] = []; // ← Times do Coração

        const sep = this.detectarSeparador(linhas);

        for (const linha of linhas) {
            if (!linha.trim()) continue;

            let colunas = linha.split(sep);
            colunas = this.limparColunas(colunas);

            if (colunas.length < 2) continue;

            const { data, dataIndex } = this.extrairData(colunas);
            if (!data) continue;

            const numeros: number[] = [];
            let timeCoracao: string | null = null;

            // Timemania: números de 1 a 80 + 1 Time do Coração
            for (let j = dataIndex + 1; j < colunas.length; j++) {
                let valor = colunas[j]?.trim();
                if (valor === '' || valor === undefined) continue;

                // ✅ TIMEMANIA: Capturar time do coração
                const numTeste = parseInt(valor);
                if (isNaN(numTeste) || valor.includes('/') || /[A-Za-zÀ-ú]/.test(valor)) {
                    timeCoracao = valor; // Captura o time
                    continue;
                }

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

            // ✅ Timemania: ORDENAR os números (como Mega-Sena)
            if (numeros.length >= 7) {
                const numerosOrdenados = numeros.slice(0, 7).sort((a, b) => a - b);
                dados.push(numerosOrdenados);
                datas.push(data);
                dadosExtras.push(timeCoracao);
            }
        }

        return { dados, datas, dadosExtras };
    }
}
