// ============================================
// CAMINHO: src/statistics/analyzers/HeatmapAnalyzer.ts
// ============================================
// ANALISADOR DE HEATMAP - INDEPENDENTE
// ============================================

export class HeatmapAnalyzer {
    analyze(dados: number[][], categorias: number = 7, maxCategoria: number = 9): number[][] {
        if (!dados || dados.length === 0) {
            throw new Error('❌ Nenhum dado disponível para análise de heatmap');
        }

        const heatmap: number[][] = [];
        for (let i = 0; i < categorias; i++) {
            heatmap[i] = new Array(maxCategoria + 1).fill(0);
        }

        dados.forEach(item => {
            item.forEach((valor, idx) => {
                if (idx < categorias && valor >= 0 && valor <= maxCategoria) {
                    heatmap[idx][valor]++;
                }
            });
        });

        return heatmap;
    }
}
