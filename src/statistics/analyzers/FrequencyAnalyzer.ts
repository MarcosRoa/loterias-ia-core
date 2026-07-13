// ============================================
// CAMINHO: src/statistics/analyzers/FrequencyAnalyzer.ts
// ============================================
// ANALISADOR DE FREQUÊNCIA - INDEPENDENTE
// ============================================

export class FrequencyAnalyzer {
    analyze(dados: number[][], maxNumero: number, incluirZero: boolean = false): { numero: number; quantidade: number }[] {
        if (!dados || dados.length === 0) {
            throw new Error('❌ Nenhum dado disponível para análise de frequência');
        }

        const limite = maxNumero + (incluirZero ? 1 : 0);
        const freq = new Array(limite).fill(0);

        dados.forEach(jogo => {
            jogo.forEach(numero => {
                if (numero >= 0 && numero < limite) {
                    freq[numero]++;
                }
            });
        });

        const resultados: { numero: number; quantidade: number }[] = [];
        const inicio = incluirZero ? 0 : 1;
        for (let i = inicio; i < limite; i++) {
            resultados.push({ numero: i, quantidade: freq[i] });
        }

        return resultados
            .sort((a, b) => b.quantidade - a.quantidade)
            .slice(0, 20);
    }

    getLeastFrequent(dados: number[][], maxNumero: number, incluirZero: boolean = false): { numero: number; quantidade: number }[] {
        if (!dados || dados.length === 0) {
            throw new Error('❌ Nenhum dado disponível para análise de frequência');
        }

        const limite = maxNumero + (incluirZero ? 1 : 0);
        const freq = new Array(limite).fill(0);

        dados.forEach(jogo => {
            jogo.forEach(numero => {
                if (numero >= 0 && numero < limite) {
                    freq[numero]++;
                }
            });
        });

        const resultados: { numero: number; quantidade: number }[] = [];
        const inicio = incluirZero ? 0 : 1;
        for (let i = inicio; i < limite; i++) {
            resultados.push({ numero: i, quantidade: freq[i] });
        }

        return resultados
            .sort((a, b) => a.quantidade - b.quantidade)
            .slice(0, 20);
    }
}
