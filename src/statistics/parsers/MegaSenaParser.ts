// ============================================
// CAMINHO: src/statistics/parsers/MegaSenaParser.ts
// ============================================
// PARSER ESPECÍFICO PARA MEGA-SENA  03/09/2026
// ============================================

import { BaseParser, ParseResult } from './BaseParser';

export class MegaSenaParser extends BaseParser {
    constructor() {
        super({
            maxNumero: 60,
            incluirZero: false,
            numerosPadrao: 6,
            manterOrdem: false // ← ORDENA OS NÚMEROS
        });
    }

    parse(texto: string): ParseResult {
        const linhas = texto
            .split('\n')
            .filter(l => l.trim() && !l.startsWith('Data'));

        const concursos: number[] = [];
        const dados: number[][] = [];
        const datas: string[] = [];

        const sep = this.detectarSeparador(linhas);

        for (const linha of linhas) {
            if (!linha.trim()) continue;

            let colunas = linha.split(sep);
            colunas = this.limparColunas(colunas);

            if (colunas.length < 2) continue;

            const { data, dataIndex } = this.extrairData(colunas);
            if (!data) continue;

            // ============================================
            // CONCURSO
            // ============================================

            const concursoIndex = dataIndex - 1;

            if (concursoIndex < 0) {
                throw new Error(
                    'MegaSenaParser: coluna de concurso não encontrada antes da data.'
                );
            }

            const concursoValor = colunas[concursoIndex]?.trim();

            if (!concursoValor || !/^\d+$/.test(concursoValor)) {
                throw new Error(
                    `MegaSenaParser: número do concurso inválido: "${concursoValor ?? ''}".`
                );
            }

            const concurso = parseInt(concursoValor, 10);

            if (!Number.isInteger(concurso) || concurso < 1) {
                throw new Error(
                    `MegaSenaParser: número do concurso inválido: "${concursoValor}".`
                );
            }

            const numeros: number[] = [];

            // ============================================
            // NÚMEROS DA MEGA-SENA
            // ============================================

            // Mega-Sena: números de 1 a 60
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

                if (num >= 1 && num <= 60) {
                    numeros.push(num);
                }
            }

            // ============================================
            // RESULTADO
            // ============================================

            if (numeros.length >= 6) {
                const numerosOrdenados = numeros
                    .slice(0, 6)
                    .sort((a, b) => a - b);

                concursos.push(concurso);
                dados.push(numerosOrdenados);
                datas.push(data);
            }
        }

        return {
            concursos,
            dados,
            datas
        };
    }
}
