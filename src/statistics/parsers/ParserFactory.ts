// ============================================
// CAMINHO: src/statistics/parsers/ParserFactory.ts
// ============================================
// FÁBRICA DE PARSERS
// ============================================

import { BaseParser } from './BaseParser';
import { SuperSeteParser } from './SuperSeteParser';
import { MegaSenaParser } from './MegaSenaParser';
import { QuinaParser } from './QuinaParser';

export class ParserFactory {
    static create(lottery: string): BaseParser {
        switch (lottery) {
            case 'supersete':
                return new SuperSeteParser();
            case 'megasena':
                return new MegaSenaParser();
            case 'quina':
                return new QuinaParser();
            // ... outros parsers
            default:
                // Fallback: usar parser genérico (com ordenação)
                return new MegaSenaParser();
        }
    }
}
