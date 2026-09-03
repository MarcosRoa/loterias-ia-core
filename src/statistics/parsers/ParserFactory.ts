// ============================================
// CAMINHO: src/statistics/parsers/ParserFactory.ts
// ============================================
// FACTORY DOS PARSERS DE LOTERIAS  03/09/2026
// ============================================

import { BaseParser } from './BaseParser';

import { MegaSenaParser } from './MegaSenaParser';
import { QuinaParser } from './QuinaParser';
import { LotofacilParser } from './LotofacilParser';
import { LotomaniaParser } from './LotomaniaParser';
import { DuplasenaParser } from './DuplasenaParser';
import { TimemaniaParser } from './TimemaniaParser';
import { MilionariaParser } from './MilionariaParser';
import { DiaDeSorteParser } from './DiaDeSorteParser';
import { SuperSeteParser } from './SuperSeteParser';
import { LotecaParser } from './LotecaParser';

export class ParserFactory {
    static create(lotteryType: string): BaseParser {
        switch (lotteryType.toLowerCase()) {
            case 'supersete':
                return new SuperSeteParser();

            case 'timemania':
                return new TimemaniaParser();

            case 'milionaria':
            case '+milionaria':
                return new MilionariaParser();

            case 'diadesorte':
            case 'dia-de-sorte':
                return new DiaDeSorteParser();

            case 'megasena':
            case 'mega-sena':
                return new MegaSenaParser();

            case 'quina':
                return new QuinaParser();

            case 'lotofacil':
            case 'lotofácil':
                return new LotofacilParser();

            case 'lotomania':
                return new LotomaniaParser();

            case 'duplasena':
            case 'dupla-sena':
                return new DuplasenaParser();

            case 'loteca':
                return new LotecaParser();

            default:
                throw new Error(
                    `ParserFactory: tipo de loteria não suportado: "${lotteryType}".`
                );
        }
    }
}
