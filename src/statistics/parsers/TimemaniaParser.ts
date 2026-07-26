// ============================================
// CAMINHO: src/statistics/parsers/TimemaniaParser.ts
// ============================================
// PARSER ESPECÍFICO PARA TIMEMANIA - CORRIGIDO
// ============================================

import { BaseParser, ParseResult } from './BaseParser';

export class TimemaniaParser extends BaseParser {
    constructor() {
        super({
            maxNumero: 80,
            incluirZero: false,
            numerosPadrao: 7,
            manterOrdem: false
        });
    }

    parse(texto: string): ParseResult {
        const linhas = texto.split('\n').filter(l => l.trim() && !l.startsWith('Data'));
        const dados: number[][] = [];
        const datas: string[] = [];
        const dadosExtras: any[] = [];

        const sep = this.detectarSeparador(linhas);

        for (const linha of linhas) {
            if (!linha.trim()) continue;

            let colunas = linha.split(sep);
            colunas = this.limparColunas(colunas);

            if (colunas.length < 2) continue;

            const { data, dataIndex } = this.extrairData(colunas);
            if (!data) continue;

            const numeros: number[] = [];
            let timeCoracao: string | null = null;

            // ✅ CORREÇÃO: Usar posição fixa (última coluna = Time Coração)
            const timeIndex = colunas.length - 1;
            const timeValue = colunas[timeIndex]?.trim();
            if (timeValue && !this.isDataValida(timeValue) && !/^\d+$/.test(timeValue)) {
                timeCoracao = timeValue;
            }

            // ✅ Extrair números (colunas entre data e time)
            for (let j = dataIndex + 1; j < colunas.length - 1; j++) {
                const valor = colunas[j]?.trim();
                if (!valor) continue;
                const num = parseInt(valor);
                if (!isNaN(num) && num >= 1 && num <= 80) {
                    numeros.push(num);
                }
            }

            if (numeros.length >= 7) {
                const numerosOrdenados = numeros.slice(0, 7).sort((a, b) => a - b);
                dados.push(numerosOrdenados);
                datas.push(data);
                dadosExtras.push(timeCoracao);
            }
        }

        return { dados, datas, dadosExtras };
    }
}
