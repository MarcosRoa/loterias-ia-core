// ============================================
// CAMINHO: src/statistics/parsers/DiaDeSorteParser.ts
// ============================================
// PARSER ESPECÍFICO PARA DIA DE SORTE
// ============================================

import { BaseParser, ParseResult } from './BaseParser';

export class DiaDeSorteParser extends BaseParser {
    constructor() {
        super({
            maxNumero: 31,
            incluirZero: false,
            numerosPadrao: 7,
            manterOrdem: false // Ordena os números (como Mega-Sena)
        });
    }

    parse(texto: string): ParseResult {
        const linhas = texto.split('\n').filter(l => l.trim() && !l.startsWith('Data'));
        const dados: number[][] = [];
        const datas: string[] = [];
        const dadosExtras: any[] = []; // ← Mês da Sorte

        const sep = this.detectarSeparador(linhas);

        // Mapeamento de meses em texto para número
        const mesesMap: Record<string, number> = {
            'JANEIRO': 1, 'JAN': 1,
            'FEVEREIRO': 2, 'FEV': 2,
            'MARÇO': 3, 'MAR': 3,
            'ABRIL': 4, 'ABR': 4,
            'MAIO': 5, 'MAI': 5,
            'JUNHO': 6, 'JUN': 6,
            'JULHO': 7, 'JUL': 7,
            'AGOSTO': 8, 'AGO': 8,
            'SETEMBRO': 9, 'SET': 9,
            'OUTUBRO': 10, 'OUT': 10,
            'NOVEMBRO': 11, 'NOV': 11,
            'DEZEMBRO': 12, 'DEZ': 12
        };

        for (const linha of linhas) {
            if (!linha.trim()) continue;

            let colunas = linha.split(sep);
            colunas = this.limparColunas(colunas);

            if (colunas.length < 2) continue;

            const { data, dataIndex } = this.extrairData(colunas);
            if (!data) continue;

            const numeros: number[] = [];
            let mesSorte: number | null = null;

            // Dia de Sorte: 7 números (1-31) + 1 Mês (1-12)
            for (let j = dataIndex + 1; j < colunas.length; j++) {
                let valor = colunas[j]?.trim();
                if (valor === '' || valor === undefined) continue;

                // ✅ DIA DE SORTE: Capturar mês
                let num = parseInt(valor);
                if (isNaN(num)) {
                    // Tenta converter mês em texto para número
                    const mesNum = mesesMap[valor.toUpperCase()];
                    if (mesNum !== undefined) {
                        mesSorte = mesNum;
                        continue;
                    }
                    continue;
                }

                if (num >= 1 && num <= 31) {
                    numeros.push(num);
                } else if (num >= 1 && num <= 12 && numeros.length >= 7) {
                    // Se já tiver 7 números, é o mês
                    mesSorte = num;
                }
            }

            // ✅ Dia de Sorte: ORDENAR os números (como Mega-Sena)
            if (numeros.length >= 7) {
                const numerosOrdenados = numeros.slice(0, 7).sort((a, b) => a - b);
                dados.push(numerosOrdenados);
                datas.push(data);
                dadosExtras.push(mesSorte);
            }
        }

        return { dados, datas, dadosExtras };
    }
}
