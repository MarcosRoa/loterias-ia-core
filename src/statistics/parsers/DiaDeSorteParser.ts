// ============================================
// CAMINHO: src/statistics/parsers/DiaDeSorteParser.ts
// ============================================
// PARSER ESPECÍFICO PARA DIA DE SORTE (CORRIGIDO)
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

            // ✅ CORREÇÃO: Usar posição fixa das colunas
            // Estrutura do CSV: [Data, Bola1, Bola2, Bola3, Bola4, Bola5, Bola6, Bola7, Mes]
            
            // 1. Extrair os 7 números (posições 1 a 7 após a data)
            for (let i = 1; i <= 7; i++) {
                const colIndex = dataIndex + i;
                if (colIndex < colunas.length) {
                    const valor = colunas[colIndex]?.trim();
                    if (valor) {
                        const num = parseInt(valor);
                        if (!isNaN(num) && num >= 1 && num <= 31) {
                            numeros.push(num);
                        }
                    }
                }
            }

            // 2. Extrair o mês (posição 8 após a data - SEMPRE a última coluna)
            const mesIndex = dataIndex + 8;
            if (mesIndex < colunas.length) {
                const valorMes = colunas[mesIndex]?.trim();
                if (valorMes) {
                    // Tenta converter para número
                    const num = parseInt(valorMes);
                    if (!isNaN(num) && num >= 1 && num <= 12) {
                        mesSorte = num;
                    } else {
                        // Tenta converter do mapa de meses
                        mesSorte = mesesMap[valorMes.toUpperCase()] ?? null;
                    }
                }
            }

            // ✅ Dia de Sorte: ORDENAR os números
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
