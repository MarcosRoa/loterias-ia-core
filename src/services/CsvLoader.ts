// ============================================
// CAMINHO: src/services/CsvLoader.ts
// ============================================
// CARREGADOR DE CSVs - FONTE ÚNICA DE DADOS
// ============================================

import fs from 'fs';
import path from 'path';
import { ParserFactory } from '../statistics/parsers/ParserFactory';

export interface LotteryDataset {
    dados: number[][];
    dadosExtras: any[];
    datas: string[];
    totalDraws: number;
}

export class CsvLoader {
    static load(lotteryType: string, period: string = 'all'): LotteryDataset {
        // 1. Caminho do CSV
        const csvPath = path.join(__dirname, '..', '..', 'public', 'csv', `${lotteryType}.csv`);
        
        if (!fs.existsSync(csvPath)) {
            throw new Error(`CSV não encontrado: ${lotteryType} (caminho: ${csvPath})`);
        }

        // 2. Ler o arquivo
        const content = fs.readFileSync(csvPath, 'utf8');

        // 3. Parser específico da loteria
        const parser = ParserFactory.create(lotteryType);
        const result = parser.parse(content);

        // 4. Aplicar filtro de período (se necessário)
        let { dados, dadosExtras, datas } = result;
        
        if (period !== 'all' && dadosExtras && dadosExtras.length > 0) {
            const { dados: dadosFiltrados, dadosExtras: extrasFiltrados, datas: datasFiltradas } = 
                CsvLoader.filterByPeriod(dados, dadosExtras, datas, period);
            dados = dadosFiltrados;
            dadosExtras = extrasFiltrados;
            datas = datasFiltradas;
        }

        return {
            dados,
            dadosExtras: dadosExtras || [],
            datas: datas || [],
            totalDraws: dados.length
        };
    }

    private static filterByPeriod(
        dados: number[][],
        dadosExtras: any[],
        datas: string[],
        period: string
    ): { dados: number[][]; dadosExtras: any[]; datas: string[] } {
        if (!dadosExtras || dadosExtras.length === 0) {
            return { dados, dadosExtras: [], datas };
        }

        const now = new Date();
        let limitDate = new Date();
        
        if (period === '1y') limitDate.setFullYear(now.getFullYear() - 1);
        else if (period === '2y') limitDate.setFullYear(now.getFullYear() - 2);
        else if (period === '3y') limitDate.setFullYear(now.getFullYear() - 3);
        else if (period === '5y') limitDate.setFullYear(now.getFullYear() - 5);
        else if (period === '6m') limitDate.setMonth(now.getMonth() - 6);
        else return { dados, dadosExtras, datas };

        const indicesFiltrados: number[] = [];
        datas.forEach((dataStr, index) => {
            const data = new Date(dataStr);
            if (!isNaN(data.getTime()) && data >= limitDate) {
                indicesFiltrados.push(index);
            }
        });

        return {
            dados: indicesFiltrados.map(i => dados[i]),
            dadosExtras: indicesFiltrados.map(i => dadosExtras[i]),
            datas: indicesFiltrados.map(i => datas[i])
        };
    }
}
console.log(`📊 CsvLoader: ${dadosExtras.length} registros extras carregados`);
console.log(`📊 Primeiros extras:`, JSON.stringify(dadosExtras.slice(0, 3)));
