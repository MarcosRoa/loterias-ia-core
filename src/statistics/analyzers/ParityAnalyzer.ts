// ============================================
// CAMINHO: src/statistics/analyzers/ParityAnalyzer.ts
// ============================================
// ANALISADOR DE PARIDADE - INDEPENDENTE
// ============================================

export class ParityAnalyzer {
    analyze(dados: number[][]): { pares: number; impares: number; quantidade: number }[] {
        if (!dados || dados.length === 0) {
            throw new Error('❌ Nenhum dado disponível para análise de paridade');
        }

        const proporcoes = new Map<string, number>();

        dados.forEach(jogo => {
            let pares = 0;
            let impares = 0;
            jogo.forEach(num => {
                if (num % 2 === 0) {
                    pares++;
                } else {
                    impares++;
                }
            });
            const key = `${pares}x${impares}`;
            proporcoes.set(key, (proporcoes.get(key) || 0) + 1);
        });

        return Array.from(proporcoes.entries())
            .map(([key, quantidade]) => {
                const [pares, impares] = key.split('x').map(Number);
                return { pares, impares, quantidade };
            })
            .sort((a, b) => b.quantidade - a.quantidade);
    }
}
