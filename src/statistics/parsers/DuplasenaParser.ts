// ============================================
// CAMINHO: src/statistics/parsers/DuplasenaParser.ts
// ============================================
// PARSER ESPECÍFICO PARA DUPLA SENA
// ============================================

import { BaseParser, ParseResult } from './BaseParser';

export class DuplasenaParser extends BaseParser {
    constructor() {
        super({
            maxNumero: 50,
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

            // Dupla Sena: números de 1 a 50
            // Pega todos os números após a data (6 do 1º sorteio + 6 do 2º)
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

                if (num >= 1 && num <= 50) {
                    numeros.push(num);
                }
            }

            // ✅ Dupla Sena: ORDENAR os números
            // Se tiver 6 números, é apenas 1 sorteio
            // Se tiver 12 números, são 2 sorteios
            if (numeros.length >= 6) {
                if (numeros.length >= 12) {
                    // Dois sorteios
                    const primeiro = numeros.slice(0, 6).sort((a, b) => a - b);
                    const segundo = numeros.slice(6, 12).sort((a, b) => a - b);
                    dados.push(primeiro);
                    dados.push(segundo);
                    datas.push(data);
                    datas.push(data);
                } else {
                    // Apenas um sorteio
                    const numerosOrdenados = numeros.slice(0, 6).sort((a, b) => a - b);
                    dados.push(numerosOrdenados);
                    datas.push(data);
                }
            }
        }

        return { dados, datas };
    }
}
