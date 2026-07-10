// ============================================
// CAMINHO: src/ai/analysis/FrequencyAnalyzer.ts
// ============================================
// Análise de frequência de números
// ============================================

export class FrequencyAnalyzer {
    private dados: number[][];
    private frequencias: Map<number, number> = new Map();
    private maxFrequencia: number = 0;

    constructor(dados: number[][]) {
        this.dados = dados;
        this.analisar();
    }

    private analisar(): void {
        const freq = new Map<number, number>();
        
        for (const jogo of this.dados) {
            for (const num of jogo) {
                freq.set(num, (freq.get(num) || 0) + 1);
            }
        }

        this.frequencias = freq;
        this.maxFrequencia = Math.max(...Array.from(freq.values()), 1);
    }

    getFrequencia(numero: number): number {
        return this.frequencias.get(numero) || 0;
    }

    getFrequenciaRelativa(numero: number): number {
        const total = this.dados.length * (this.dados[0]?.length || 1);
        return total > 0 ? this.getFrequencia(numero) / total : 0;
    }

    getFrequenciaNormalizada(numero: number): number {
        return this.maxFrequencia > 0 ? (this.getFrequencia(numero) / this.maxFrequencia) * 100 : 0;
    }

    getRanking(limit?: number): { numero: number; frequencia: number }[] {
        const sorted = Array.from(this.frequencias.entries())
            .map(([numero, frequencia]) => ({ numero, frequencia }))
            .sort((a, b) => b.frequencia - a.frequencia);

        return limit ? sorted.slice(0, limit) : sorted;
    }

    getMaisFrequentes(quantidade: number): number[] {
        return this.getRanking(quantidade).map(item => item.numero);
    }

    getMenosFrequentes(quantidade: number): number[] {
        const sorted = Array.from(this.frequencias.entries())
            .map(([numero, frequencia]) => ({ numero, frequencia }))
            .sort((a, b) => a.frequencia - b.frequencia);

        return sorted.slice(0, quantidade).map(item => item.numero);
    }

    getMap(): Map<number, number> {
        return new Map(this.frequencias);
    }

    isQuente(numero: number): boolean {
        const media = this.getFrequenciaMedia();
        return this.getFrequencia(numero) > media * 1.2;
    }

    isFrio(numero: number): boolean {
        const media = this.getFrequenciaMedia();
        return this.getFrequencia(numero) < media * 0.8;
    }

    private getFrequenciaMedia(): number {
        if (this.frequencias.size === 0) return 0;
        const total = Array.from(this.frequencias.values()).reduce((a, b) => a + b, 0);
        return total / this.frequencias.size;
    }
}
