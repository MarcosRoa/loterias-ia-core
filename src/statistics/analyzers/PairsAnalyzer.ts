// ============================================
// CAMINHO: src/statistics/analyzers/PairsAnalyzer.ts
// ============================================
// ANALISADOR DE DUPLAS - INDEPENDENTE
// ============================================

export class PairsAnalyzer {
    analyze(dados: number[][]): { dupla: number[]; quantidade: number }[] {
        if (!dados || dados.length === 0) {
            throw new Error('❌ Nenhum dado disponível para análise de duplas');
        }

        const duplas = new Map<string, number>();

        dados.forEach(jogo => {
            for (let i = 0; i < jogo.length; i++) {
                for (let j = i + 1; j < jogo.length; j++) {
                    const key = `${Math.min(jogo[i], jogo[j])},${Math.max(jogo[i], jogo[j])}`;
                    duplas.set(key, (duplas.get(key) || 0) + 1);
                }
            }
        });

        return Array.from(duplas.entries())
            .map(([key, quantidade]) => {
                const [num1, num2] = key.split(',').map(Number);
                return { dupla: [num1, num2], quantidade };
            })
            .sort((a, b) => b.quantidade - a.quantidade)
            .slice(0, 20);
    }
}
