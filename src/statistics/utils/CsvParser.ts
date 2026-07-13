// ============================================
// CAMINHO: src/statistics/utils/CsvParser.ts
// ============================================
// PARSER DE CSV - LÊ ARQUIVOS LOCALMENTE
// ============================================

import fs from 'fs';
import path from 'path';
import { LotteryContext } from '../models/StatisticsResult';

export class CsvParser {
    private configs: Record<string, { maxNumero: number; incluirZero: boolean; numerosPadrao: number }> = {
        megasena: { maxNumero: 60, incluirZero: false, numerosPadrao: 6 },
        quina: { maxNumero: 80, incluirZero: false, numerosPadrao: 5 },
        lotofacil: { maxNumero: 25, incluirZero: false, numerosPadrao: 15 },
        lotomania: { maxNumero: 99, incluirZero: true, numerosPadrao: 20 },
        duplasena: { maxNumero: 50, incluirZero: false, numerosPadrao: 6 },
        timemania: { maxNumero: 80, incluirZero: false, numerosPadrao: 7 },
        milionaria: { maxNumero: 50, incluirZero: false, numerosPadrao: 6 },
        diadesorte: { maxNumero: 31, incluirZero: false, numerosPadrao: 7 },
        supersete: { maxNumero: 9, incluirZero: true, numerosPadrao: 7 },
        loteca: { maxNumero: 3, incluirZero: true, numerosPadrao: 14 }
    };

    async load(lottery: string): Promise<LotteryContext | null> {
        try {
            // ✅ Lê CSV localmente (mais rápido)
            const filePath = path.join(process.cwd(), 'public', 'csv', `${lottery}.csv`);
            
            if (!fs.existsSync(filePath)) {
                console.error(`❌ Arquivo CSV não encontrado: ${filePath}`);
                return null;
            }

            const fileContent = fs.readFileSync(filePath, 'utf-8');
            return this.parse(fileContent, lottery);
        } catch (error) {
            console.error(`❌ Erro ao carregar CSV ${lottery}:`, error);
            return null;
        }
    }

    parse(texto: string, lottery: string): LotteryContext | null {
        const linhas = texto.split('\n').filter(l => l.trim() && !l.startsWith('Data'));
        const dados: number[][] = [];
        const datas: string[] = [];

        const config = this.configs[lottery];
        if (!config) return null;

        const sep = linhas[0]?.includes(';') ? ';' : ',';

        const isDataValida = (str: string): boolean => {
            return /^\d{2}\/\d{2}\/\d{4}$/.test(str) || /^\d{4}-\d{2}-\d{2}$/.test(str);
        };

        const parseData = (str: string): string | null => {
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str;
            if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
                const [a, m, d] = str.split('-');
                return `${d}/${m}/${a}`;
            }
            return null;
        };

        const minimo = config.incluirZero ? 0 : 1;

        for (const linha of linhas) {
            if (!linha.trim()) continue;

            let colunas = linha.split(sep);
            while (colunas.length > 0 && (colunas[colunas.length - 1].trim() === '' || colunas[colunas.length - 1].trim().includes(';'))) {
                colunas.pop();
            }

            if (colunas.length < 2) continue;

            let data: string | null = null;
            let dataIndex = -1;
            for (let j = 0; j < colunas.length; j++) {
                const valor = colunas[j].trim();
                if (isDataValida(valor)) {
                    data = parseData(valor);
                    dataIndex = j;
                    break;
                }
            }

            if (!data) continue;

            const numeros: number[] = [];
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

                if (num >= minimo && num <= config.maxNumero) {
                    numeros.push(num);
                }
            }

            if (numeros.length >= config.numerosPadrao) {
                const numerosOrdenados = numeros.slice(0, config.numerosPadrao).sort((a, b) => a - b);
                dados.push(numerosOrdenados);
                datas.push(data);
            }
        }

        return { dados, datas, config };
    }
}
