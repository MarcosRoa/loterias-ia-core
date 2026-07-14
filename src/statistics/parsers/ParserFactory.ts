// ============================================
// CAMINHO: src/statistics/parsers/ParserFactory.ts
// ============================================
// FÁBRICA DE PARSERS
// ============================================

// ============================================
// CAMINHO: src/statistics/parsers/ParserFactory.ts
// ============================================
// FÁBRICA DE PARSERS - VERSÃO COMPLETA
// ============================================

import { BaseParser } from './BaseParser';
import { SuperSeteParser } from './SuperSeteParser';
import { MegaSenaParser } from './MegaSenaParser';
import { QuinaParser } from './QuinaParser';
import { TimemaniaParser } from './TimemaniaParser';
import { MilionariaParser } from './MilionariaParser';
import { DiaDeSorteParser } from './DiaDeSorteParser';

export class ParserFactory {
    static create(lottery: string): BaseParser {
        switch (lottery) {
            case 'supersete':
                return new SuperSeteParser();
            case 'timemania':
                return new TimemaniaParser();
            case 'milionaria':
                return new MilionariaParser();
            case 'diadesorte':
                return new DiaDeSorteParser();
            case 'megasena':
                return new MegaSenaParser();
            case 'quina':
                return new QuinaParser();
            // ... outras loterias
            default:
                return new MegaSenaParser(); // Fallback
        }
    }
}
