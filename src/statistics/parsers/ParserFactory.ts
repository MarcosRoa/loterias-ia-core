// ============================================
// CAMINHO: src/statistics/parsers/ParserFactory.ts
// ============================================
// FÁBRICA DE PARSERS - VERSÃO COMPLETA
// ============================================

import { BaseParser } from './BaseParser';
import { SuperSeteParser } from './SuperSeteParser';
import { MegaSenaParser } from './MegaSenaParser';
import { QuinaParser } from './QuinaParser';
import { LotofacilParser } from './LotofacilParser';
import { LotomaniaParser } from './LotomaniaParser';
import { DuplasenaParser } from './DuplasenaParser';
import { TimemaniaParser } from './TimemaniaParser';
import { MilionariaParser } from './MilionariaParser';
import { DiaDeSorteParser } from './DiaDeSorteParser';

export class ParserFactory {
    static create(lottery: string): BaseParser {
        switch (lottery) {
            // LOTERIAS COM DADOS EXTRAS (POSICIONAIS)
            case 'supersete':
                return new SuperSeteParser(); // ← NÃO ORDENA!

            // LOTERIAS COM DADOS EXTRAS (NÃO POSICIONAIS)
            case 'timemania':
                return new TimemaniaParser(); // ← ORDENA + TIME
            case 'milionaria':
                return new MilionariaParser(); // ← ORDENA + TREVOS
            case 'diadesorte':
                return new DiaDeSorteParser(); // ← ORDENA + MÊS

            // LOTERIAS SEM DADOS EXTRAS (ORDENAM)
            case 'megasena':
                return new MegaSenaParser(); // ← ORDENA
            case 'quina':
                return new QuinaParser(); // ← ORDENA
            case 'lotofacil':
                return new LotofacilParser(); // ← ORDENA
            case 'lotomania':
                return new LotomaniaParser(); // ← ORDENA (inclui 00)
            case 'duplasena':
                return new DuplasenaParser(); // ← ORDENA (6 + 2º sorteio)

            default:
                // Fallback: ordena os números
                return new MegaSenaParser();
        }
    }
}
