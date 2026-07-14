// ============================================
// CAMINHO: src/statistics/utils/CsvParser.ts
// ============================================
// PARSER DE CSV - VERSÃO REFATORADA COM FACTORY
// ============================================

import fs from 'fs';
import path from 'path';
import { LotteryContext } from '../models/StatisticsResult';
import { ParserFactory } from '../parsers/ParserFactory';

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
            const filePath = path.join(process.cwd(), 'public', 'csv', `${lottery}.csv`);
            
            if (!fs.existsSync(filePath)) {
                console.error(`❌ Arquivo CSV não encontrado: ${filePath}`);
                return null;
            }

            const fileContent = fs.readFileSync(filePath, 'utf-8');
            
            // ✅ USAR PARSER ESPECÍFICO VIA FACTORY
            const parser = ParserFactory.create(lottery);
            const result = parser.parse(fileContent);

            const config = this.configs[lottery];
            if (!config) return null;

            // ✅ ADICIONAR dadosExtras se existirem
            const dadosExtras = result.dadosExtras || [];

            return {
                dados: result.dados,
                datas: result.datas,
                dadosExtras,
                config
            };

        } catch (error) {
            console.error(`❌ Erro ao carregar CSV ${lottery}:`, error);
            return null;
        }
    }
}
