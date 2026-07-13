// ============================================
// CAMINHO: src/statistics/analyzers/SequenceAnalyzer.ts
// ============================================
// ANALISADOR DE SEQUÊNCIAS - INDEPENDENTE
// ============================================

export class SequenceAnalyzer {
    analyze(dados: number[][]): { inicio: number; fim: number; quantidade: number }[] {
        if (!dados || dados.length === 0) {
            throw new Error('❌ Nenhum dado disponível para análise de sequências');
        }

        const sequencias: { inicio: number; fim: number; quantidade: number }[] = [];

        dados.forEach(jogo => {
            const sorted = [...jogo].sort((a, b) => a - b);
            let inicio = sorted[0];
            let fim = sorted[0];
            let count = 0;

            for (let i = 0; i < sorted.length; i++) {
                if (i < sorted.length - 1 && sorted[i + 1] === sorted[i] + 1) {
                    if (count === 0) {
                        inicio = sorted[i];
                    }
                    count++;
                    fim = sorted[i + 1];
                } else if (count > 0) {
                    sequencias.push({ inicio, fim, quantidade: count + 1 });
                    count = 0;
                }
            }
        });

        return sequencias;
    }
}
