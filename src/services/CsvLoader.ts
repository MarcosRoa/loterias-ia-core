// ============================================
// CAMINHO: src/services/CsvLoader.ts
// ============================================
// CARREGADOR DE CSVs - FONTE ÚNICA DE DADOS
// ============================================

import fs from 'fs';
import path from 'path';
import { ParserFactory } from '../statistics/parsers/ParserFactory';

export interface LotteryDataset {
    concursos: number[];
    dados: number[][];
    dadosExtras: any[];
    datas: string[];
    totalDraws: number;
}

export class CsvLoader {
    static load(lotteryType: string, period: string = 'all'): LotteryDataset {
        // 1. Caminho do CSV
        const csvPath = path.join(
            __dirname,
            '..',
            '..',
            'public',
            'csv',
            `${lotteryType}.csv`
        );

        if (!fs.existsSync(csvPath)) {
            throw new Error(
                `CSV não encontrado: ${lotteryType} (caminho: ${csvPath})`
            );
        }

        // 2. Ler o arquivo
        const content = fs.readFileSync(csvPath, 'utf8');

        // 3. Parser específico da loteria
        const parser = ParserFactory.create(lotteryType);
        const result = parser.parse(content);

        // 4. Dados extraídos pelo parser
        let {
            concursos,
            dados,
            dadosExtras,
            datas
        } = result;

        // 5. Aplicar filtro de período (se necessário)
        if (period !== 'all') {
            const resultadoFiltrado = CsvLoader.filterByPeriod(
                concursos,
                dados,
                dadosExtras || [],
                datas,
                period
            );

            concursos = resultadoFiltrado.concursos;
            dados = resultadoFiltrado.dados;
            dadosExtras = resultadoFiltrado.dadosExtras;
            datas = resultadoFiltrado.datas;
        }

        return {
            concursos: concursos || [],
            dados,
            dadosExtras: dadosExtras || [],
            datas: datas || [],
            totalDraws: dados.length
        };
    }

    private static filterByPeriod(
        concursos: number[],
        dados: number[][],
        dadosExtras: any[],
        datas: string[],
        period: string
    ): {
        concursos: number[];
        dados: number[][];
        dadosExtras: any[];
        datas: string[];
    } {
        const now = new Date();
        let limitDate = new Date();

        if (period === '1y') {
            limitDate.setFullYear(now.getFullYear() - 1);
        } else if (period === '2y') {
            limitDate.setFullYear(now.getFullYear() - 2);
        } else if (period === '3y') {
            limitDate.setFullYear(now.getFullYear() - 3);
        } else if (period === '5y') {
            limitDate.setFullYear(now.getFullYear() - 5);
        } else if (period === '6m') {
            limitDate.setMonth(now.getMonth() - 6);
        } else {
            return {
                concursos,
                dados,
                dadosExtras,
                datas
            };
        }

        const indicesFiltrados: number[] = [];

        datas.forEach((dataStr, index) => {
            const data = new Date(dataStr);

            if (!isNaN(data.getTime()) && data >= limitDate) {
                indicesFiltrados.push(index);
            }
        });

        return {
            concursos: indicesFiltrados.map(i => concursos[i]),
            dados: indicesFiltrados.map(i => dados[i]),
            dadosExtras: dadosExtras.length > 0
                ? indicesFiltrados.map(i => dadosExtras[i])
                : [],
            datas: indicesFiltrados.map(i => datas[i])
        };
    }
}
