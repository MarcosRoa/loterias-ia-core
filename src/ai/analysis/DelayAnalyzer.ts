// ============================================
// CAMINHO: src/ai/analysis/DelayAnalyzer.ts
// ============================================
// Análise de atraso de números (do mais recente para o mais antigo)
// ============================================

export class DelayAnalyzer {
    private dados: number[][];
    private atrasos: Map<number, number> = new Map();
    private maxAtraso: number = 0;

    constructor(dados: number[][]) {
        this.dados = dados;
        this.analisar();
    }

    private analisar(): void {
        const atrasos = new Map<number, number>();
        const ultimaOcorrencia = new Map<number, number>();

        for (let i = this.dados.length - 1; i >= 0; i--) {
            for (const num of this.dados[i]) {
                if (!ultimaOcorrencia.has(num)) {
                    ultimaOcorrencia.set(num, this.dados.length - 1 - i);
                }
            }
        }

        const maxDelay = this.dados.length;
        for (const num of this.getTodosNumeros()) {
            atrasos.set(num, ultimaOcorrencia.get(num) ?? maxDelay);
        }

        this.atrasos = atrasos;
        this.maxAtraso = Math.max(...Array.from(atrasos.values()), 1);
    }

    private getTodosNumeros(): number[] {
        const numeros = new Set<number>();
        for (const jogo of this.dados) {
            for (const num of jogo) {
                numeros.add(num);
            }
        }
        return Array.from(numeros);
    }

    getAtraso(numero: number): number {
        return this.atrasos.get(numero) ?? this.dados.length;
    }

    getAtrasoNormalizado(numero: number): number {
        return this.maxAtraso > 0 ? (this.getAtraso(numero) / this.maxAtraso) * 100 : 0;
    }

    getRanking(limit?: number): { numero: number; atraso: number }[] {
        const sorted = Array.from(this.atrasos.entries())
            .map(([numero, atraso]) => ({ numero, atraso }))
            .sort((a, b) => b.atraso - a.atraso);

        return limit ? sorted.slice(0, limit) : sorted;
    }

    getMaisAtrasados(quantidade: number): number[] {
        return this.getRanking(quantidade).map(item => item.numero);
    }

    getMap(): Map<number, number> {
        return new Map(this.atrasos);
    }

    isAtrasado(numero: number): boolean {
        const media = this.getAtrasoMedio();
        return this.getAtraso(numero) > media * 1.2;
    }

    private getAtrasoMedio(): number {
        if (this.atrasos.size === 0) return 0;
        const total = Array.from(this.atrasos.values()).reduce((a, b) => a + b, 0);
        return total / this.atrasos.size;
    }
}
