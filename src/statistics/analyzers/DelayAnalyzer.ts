// ============================================
// CAMINHO: src/statistics/analyzers/DelayAnalyzer.ts
// ============================================
// ANALISADOR DE ATRASO - INDEPENDENTE
// ============================================

export class DelayAnalyzer {
    analyze(dados: number[][], maxNumero: number, incluirZero: boolean = false): { numero: number; atraso: number }[] {
        if (!dados || dados.length === 0) {
            throw new Error('❌ Nenhum dado disponível para análise de atraso');
        }

        const limite = maxNumero + (incluirZero ? 1 : 0);
        const ultimaOcorrencia = new Array(limite).fill(-1);
        const total = dados.length;

        for (let i = dados.length - 1; i >= 0; i--) {
            for (const num of dados[i]) {
                if (num >= 0 && num < limite && ultimaOcorrencia[num] === -1) {
                    ultimaOcorrencia[num] = i;
                }
            }
        }

        const resultados: { numero: number; atraso: number }[] = [];
        const inicio = incluirZero ? 0 : 1;
        for (let i = inicio; i < limite; i++) {
            const ultima = ultimaOcorrencia[i];
            const atraso = ultima === -1 ? total : total - 1 - ultima;
            resultados.push({ numero: i, atraso });
        }

        return resultados.sort((a, b) => b.atraso - a.atraso);
    }
}
