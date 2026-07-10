// ============================================
// CAMINHO: src/ai/analysis/ProbabilityAnalyzer.ts
// ============================================
// Análise probabilística: binomial, entropia, variância, etc.
// ============================================

export class ProbabilityAnalyzer {
    private dados: number[][];
    private distribuicao: Map<number, number> = new Map();

    constructor(dados: number[][]) {
        this.dados = dados;
        this.calcularDistribuicao();
    }

    private calcularDistribuicao(): void {
        const freq = new Map<number, number>();
        const total = this.dados.length * (this.dados[0]?.length || 1);

        for (const jogo of this.dados) {
            for (const num of jogo) {
                freq.set(num, (freq.get(num) || 0) + 1);
            }
        }

        for (const [num, count] of freq) {
            this.distribuicao.set(num, count / total);
        }
    }

    getProbabilidade(numero: number): number {
        return this.distribuicao.get(numero) || 0;
    }

    getBinomial(numero: number, k: number, n: number): number {
        const p = this.getProbabilidade(numero);
        if (p === 0) return 0;

        const combinacao = this.fatorial(n) / (this.fatorial(k) * this.fatorial(n - k));
        return combinacao * Math.pow(p, k) * Math.pow(1 - p, n - k);
    }

    getHipergeometrica(numero: number, k: number, n: number, N: number): number {
        const K = this.getFrequencia(numero);
        if (K === 0) return 0;

        const c1 = this.combinacao(K, k);
        const c2 = this.combinacao(N - K, n - k);
        const c3 = this.combinacao(N, n);

        return (c1 * c2) / c3;
    }

    getEntropia(): number {
        let entropia = 0;
        for (const [_, prob] of this.distribuicao) {
            if (prob > 0) {
                entropia += prob * Math.log2(prob);
            }
        }
        return -entropia;
    }

    getVariancia(): number {
        const valores = Array.from(this.distribuicao.values());
        const media = valores.reduce((a, b) => a + b, 0) / valores.length;
        return valores.reduce((a, b) => a + Math.pow(b - media, 2), 0) / valores.length;
    }

    getProbabilidadeCondicional(A: number, B: number): number {
        const freqA = this.getFrequencia(A);
        const freqB = this.getFrequencia(B);
        const freqAB = this.getFrequenciaConjunta(A, B);

        return freqB > 0 ? freqAB / freqB : 0;
    }

    private getFrequencia(numero: number): number {
        let count = 0;
        for (const jogo of this.dados) {
            if (jogo.includes(numero)) count++;
        }
        return count;
    }

    private getFrequenciaConjunta(A: number, B: number): number {
        let count = 0;
        for (const jogo of this.dados) {
            if (jogo.includes(A) && jogo.includes(B)) count++;
        }
        return count;
    }

    private fatorial(n: number): number {
        if (n <= 1) return 1;
        let result = 1;
        for (let i = 2; i <= n; i++) {
            result *= i;
        }
        return result;
    }

    private combinacao(n: number, k: number): number {
        if (k < 0 || k > n) return 0;
        return this.fatorial(n) / (this.fatorial(k) * this.fatorial(n - k));
    }

    gerarPorProbabilidade(quantidade: number, seed: number): number[] {
        const numeros = new Set<number>();
        const sorted = Array.from(this.distribuicao.entries())
            .sort((a, b) => b[1] - a[1]);

        const random = (s: number) => {
            const x = Math.sin(s + 1) * 10000;
            return x - Math.floor(x);
        };

        while (numeros.size < quantidade) {
            const rand = random(seed + numeros.size);
            let acumulado = 0;
            for (const [num, prob] of sorted) {
                acumulado += prob;
                if (rand <= acumulado) {
                    numeros.add(num);
                    break;
                }
            }
        }

        return Array.from(numeros).sort((a, b) => a - b);
    }
}
