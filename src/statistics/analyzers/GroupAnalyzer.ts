// ============================================
// CAMINHO: src/statistics/analyzers/GroupAnalyzer.ts
// ============================================
// ANALISADOR DE GRUPOS - INDEPENDENTE
// ============================================

export class GroupAnalyzer {
    analyze(dados: number[][], maxNumero: number, incluirZero: boolean = false): { grupo: string; quantidade: number; percentual: number }[] {
        if (!dados || dados.length === 0) {
            throw new Error('❌ Nenhum dado disponível para análise de grupos');
        }

        const limite = maxNumero + (incluirZero ? 1 : 0);
        const grupos: { min: number; max: number; label: string }[] = [];
        const step = Math.ceil(limite / 5);

        for (let i = incluirZero ? 0 : 1; i < limite; i += step) {
            const min = i;
            const max = Math.min(i + step - 1, limite - 1);
            const label = `${String(min).padStart(2, '0')}-${String(max).padStart(2, '0')}`;
            grupos.push({ min, max, label });
        }

        const resultado = grupos.map(grupo => ({
            ...grupo,
            quantidade: 0,
            percentual: 0
        }));

        dados.forEach(jogo => {
            jogo.forEach(num => {
                grupos.forEach((grupo, idx) => {
                    if (num >= grupo.min && num <= grupo.max) {
                        resultado[idx].quantidade++;
                    }
                });
            });
        });

        const total = resultado.reduce((acc, r) => acc + r.quantidade, 0);
        return resultado.map(r => ({
            grupo: r.label,
            quantidade: r.quantidade,
            percentual: total > 0 ? (r.quantidade / total) * 100 : 0
        }));
    }
}
