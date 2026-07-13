// ============================================
// CAMINHO: src/statistics/analyzers/TrendAnalyzer.ts
// ============================================
// ANALISADOR DE TENDÊNCIA - INDEPENDENTE
// ============================================

export class TrendAnalyzer {
    analyze(dados: number[][], maxNumero: number, incluirZero: boolean = false, ultimosN: number = 30): { numero: number; quantidade: number }[] {
        if (!dados || dados.length === 0) {
            throw new Error('❌ Nenhum dado disponível para análise de tendência');
        }

        const limite = maxNumero + (incluirZero ? 1 : 0);
        const ultimos = dados.slice(-ultimosN);
        const freq = new Array(limite).fill(0);

        ultimos.forEach(jogo => {
            jogo.forEach(num => {
                if (num >= 0 && num < limite) {
                    freq[num]++;
                }
            });
        });

        const resultados: { numero: number; quantidade: number }[] = [];
        const inicio = incluirZero ? 0 : 1;
        for (let i = inicio; i < limite; i++) {
            resultados.push({ numero: i, quantidade: freq[i] });
        }

        return resultados.sort((a, b) => b.quantidade - a.quantidade);
    }
}
