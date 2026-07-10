// ============================================
// CAMINHO: src/ai/analysis/DispersionAnalyzer.ts
// ============================================
// Análise de dispersão (números recentes)
// ============================================

export class DispersionAnalyzer {
    private dados: number[][];
    private recentes: Set<number> = new Set();
    private windowSize: number = 15;

    constructor(dados: number[][], windowSize: number = 15) {
        this.dados = dados;
        this.windowSize = windowSize;
        this.analisar();
    }

    private analisar(): void {
        this.recentes = new Set<number>();
        const start = Math.max(0, this.dados.length - this.windowSize);

        for (let i = start; i < this.dados.length; i++) {
            for (const num of this.dados[i]) {
                this.recentes.add(num);
            }
        }
    }

    isRecente(numero: number): boolean {
        return this.recentes.has(numero);
    }

    getRecentes(): Set<number> {
        return new Set(this.recentes);
    }

    getPenalidade(numero: number): number {
        if (!this.isRecente(numero)) return 0;

        let ultimaPosicao = -1;
        for (let i = this.dados.length - 1; i >= 0; i--) {
            if (this.dados[i].includes(numero)) {
                ultimaPosicao = i;
                break;
            }
        }

        if (ultimaPosicao === -1) return 0;

        const distancia = this.dados.length - 1 - ultimaPosicao;
        const fator = 1 - (distancia / this.windowSize);
        return Math.max(0, Math.min(1, fator));
    }

    aplicarPenalidade(numero: number, score: number): number {
        const penalidade = this.getPenalidade(numero);
        return score * (1 - penalidade * 0.7);
    }

    setWindowSize(size: number): void {
        this.windowSize = size;
        this.analisar();
    }
}
