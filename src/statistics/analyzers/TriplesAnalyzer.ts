// ============================================
// CAMINHO: src/statistics/analyzers/TriplesAnalyzer.ts
// ============================================
// ANALISADOR DE TRIPLAS - INDEPENDENTE
// ============================================

export class TriplesAnalyzer {
    analyze(dados: number[][]): { tripla: number[]; quantidade: number }[] {
        if (!dados || dados.length === 0) {
            throw new Error('❌ Nenhum dado disponível para análise de triplas');
        }

        const triplas = new Map<string, number>();

        dados.forEach(jogo => {
            for (let i = 0; i < jogo.length; i++) {
                for (let j = i + 1; j < jogo.length; j++) {
                    for (let k = j + 1; k < jogo.length; k++) {
                        const nums = [jogo[i], jogo[j], jogo[k]].sort((a, b) => a - b);
                        const key = `${nums[0]},${nums[1]},${nums[2]}`;
                        triplas.set(key, (triplas.get(key) || 0) + 1);
                    }
                }
            }
        });

        return Array.from(triplas.entries())
            .map(([key, quantidade]) => {
                const [num1, num2, num3] = key.split(',').map(Number);
                return { tripla: [num1, num2, num3], quantidade };
            })
            .sort((a, b) => b.quantidade - a.quantidade)
            .slice(0, 20);
    }
}
