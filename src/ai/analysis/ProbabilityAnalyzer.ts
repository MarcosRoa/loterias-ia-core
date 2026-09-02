// ============================================
// CAMINHO: src/ai/analysis/ProbabilityAnalyzer.ts
// ============================================
// Análise probabilística e relações condicionais
// VERSÃO: 3.0.0  02/09/2026
// ============================================

export interface ConditionalRelation {
    numeroA: number;
    numeroB: number;
    pB_given_A: number;
    pA_given_B: number;
    coocorrencias: number;
    suporte: number;
}

export class ProbabilityAnalyzer {
    private dados: number[][];
    private distribuicao: Map<number, number> = new Map();
    private frequenciasConcursos: Map<number, number> = new Map();
    private totalConcursos: number;

    constructor(dados: number[][]) {
        if (!Array.isArray(dados) || dados.length === 0) {
            throw new Error('[ProbabilityAnalyzer] Dados históricos vazios.');
        }

        if (dados.some(jogo => !Array.isArray(jogo) || jogo.length === 0)) {
            throw new Error('[ProbabilityAnalyzer] Existem concursos inválidos.');
        }

        this.dados = dados.map(jogo => [...jogo]);
        this.totalConcursos = this.dados.length;
        this.calcularDistribuicao();
    }

    private calcularDistribuicao(): void {
        const ocorrencias = new Map<number, number>();
        const concursos = new Map<number, number>();

        for (const jogo of this.dados) {
            const unicos = new Set(jogo);

            for (const num of unicos) {
                ocorrencias.set(num, (ocorrencias.get(num) || 0) + 1);
                concursos.set(num, (concursos.get(num) || 0) + 1);
            }
        }

        this.distribuicao.clear();
        this.frequenciasConcursos = concursos;

        for (const [num, count] of ocorrencias) {
            this.distribuicao.set(
                num,
                this.totalConcursos > 0 ? count / this.totalConcursos : 0
            );
        }
    }

    getProbabilidade(numero: number): number {
        return this.distribuicao.get(numero) || 0;
    }

    /**
     * Probabilidade binomial usando p histórico por concurso.
     */
    getBinomial(numero: number, k: number, n: number): number {
        this.validarParametrosBinomial(k, n);

        const p = this.getProbabilidade(numero);
        if (p === 0) return 0;

        return this.combinacao(n, k) *
            Math.pow(p, k) *
            Math.pow(1 - p, n - k);
    }

    getHipergeometrica(
        numero: number,
        k: number,
        n: number,
        N: number
    ): number {
        if (!Number.isInteger(k) || !Number.isInteger(n) || !Number.isInteger(N)) {
            throw new Error('[ProbabilityAnalyzer] Parâmetros hipergeométricos devem ser inteiros.');
        }

        const K = this.getFrequencia(numero);

        if (K === 0 || k < 0 || k > K || n < 0 || n > N) return 0;

        const denominador = this.combinacao(N, n);
        if (denominador === 0) return 0;

        return (
            this.combinacao(K, k) *
            this.combinacao(N - K, n - k)
        ) / denominador;
    }

    getEntropia(): number {
        let entropia = 0;

        for (const prob of this.distribuicao.values()) {
            if (prob > 0) {
                entropia -= prob * Math.log2(prob);
            }
        }

        return entropia;
    }

    getVariancia(): number {
        const valores = Array.from(this.distribuicao.values());
        if (valores.length === 0) return 0;

        const media =
            valores.reduce((a, b) => a + b, 0) / valores.length;

        return valores.reduce(
            (soma, valor) => soma + Math.pow(valor - media, 2),
            0
        ) / valores.length;
    }

    /**
     * P(B | A): entre os concursos que contêm A,
     * quantos também contêm B.
     */
    getProbabilidadeCondicional(A: number, B: number): number {
        const freqA = this.getFrequencia(A);
        const freqAB = this.getFrequenciaConjunta(A, B);

        return freqA > 0 ? freqAB / freqA : 0;
    }

    /**
     * Mantém a assinatura conceitual anterior: P(A | B).
     */
    getProbabilidadeACondicionalB(A: number, B: number): number {
        const freqB = this.getFrequencia(B);
        const freqAB = this.getFrequenciaConjunta(A, B);

        return freqB > 0 ? freqAB / freqB : 0;
    }

    getRelacaoCondicional(A: number, B: number): ConditionalRelation {
        const coocorrencias = this.getFrequenciaConjunta(A, B);

        return {
            numeroA: A,
            numeroB: B,
            pB_given_A: this.getProbabilidadeCondicional(A, B),
            pA_given_B: this.getProbabilidadeACondicionalB(A, B),
            coocorrencias,
            suporte: this.totalConcursos > 0
                ? coocorrencias / this.totalConcursos
                : 0
        };
    }

    /**
     * Mede a força da associação acima do que seria esperado
     * pela ocorrência independente dos dois números.
     *
     * > 1  associação positiva
     * = 1  aproximadamente independente
     * < 1  associação negativa
     */
    getForcaAssociacao(A: number, B: number): number {
        const pA = this.getProbabilidade(A);
        const pB = this.getProbabilidade(B);
        const pAB = this.totalConcursos > 0
            ? this.getFrequenciaConjunta(A, B) / this.totalConcursos
            : 0;

        const esperado = pA * pB;

        if (esperado === 0) return 0;

        return pAB / esperado;
    }

    getFrequencia(numero: number): number {
        return this.frequenciasConcursos.get(numero) || 0;
    }

    getFrequenciaConjunta(A: number, B: number): number {
        let count = 0;

        for (const jogo of this.dados) {
            const set = new Set(jogo);
            if (set.has(A) && set.has(B)) count++;
        }

        return count;
    }

    getRankingProbabilidades(limit?: number): {
        numero: number;
        probabilidade: number;
    }[] {
        const ranking = Array.from(this.distribuicao.entries())
            .map(([numero, probabilidade]) => ({
                numero,
                probabilidade
            }))
            .sort((a, b) =>
                b.probabilidade - a.probabilidade || a.numero - b.numero
            );

        return limit === undefined ? ranking : ranking.slice(0, limit);
    }

    /**
     * Seleção probabilística determinística por seed.
     * Não usa Math.random().
     */
    gerarPorProbabilidade(quantidade: number, seed: number): number[] {
        if (!Number.isInteger(quantidade) || quantidade <= 0) {
            throw new Error('[ProbabilityAnalyzer] Quantidade deve ser inteiro positivo.');
        }

        const candidatos = Array.from(this.distribuicao.entries())
            .filter(([, prob]) => prob > 0)
            .sort((a, b) =>
                b[1] - a[1] || a[0] - b[0]
            );

        if (candidatos.length < quantidade) {
            throw new Error(
                `[ProbabilityAnalyzer] Não existem candidatos suficientes: ` +
                `${candidatos.length} para solicitar ${quantidade}.`
            );
        }

        const random = this.criarPRNG(seed);
        const disponiveis = candidatos.map(([num, prob]) => ({ num, prob }));
        const selecionados: number[] = [];

        while (selecionados.length < quantidade) {
            const soma = disponiveis.reduce((s, item) => s + item.prob, 0);

            if (!(soma > 0)) {
                throw new Error(
                    '[ProbabilityAnalyzer] Soma probabilística inválida durante a seleção.'
                );
            }

            const alvo = random() * soma;
            let acumulado = 0;
            let indiceSelecionado = -1;

            for (let i = 0; i < disponiveis.length; i++) {
                acumulado += disponiveis[i].prob;
                if (alvo < acumulado) {
                    indiceSelecionado = i;
                    break;
                }
            }

            if (indiceSelecionado < 0) {
                throw new Error(
                    '[ProbabilityAnalyzer] Falha numérica na seleção probabilística.'
                );
            }

            selecionados.push(disponiveis[indiceSelecionado].num);
            disponiveis.splice(indiceSelecionado, 1);
        }

        return selecionados.sort((a, b) => a - b);
    }

    private validarParametrosBinomial(k: number, n: number): void {
        if (!Number.isInteger(k) || !Number.isInteger(n) || k < 0 || n < 0 || k > n) {
            throw new Error('[ProbabilityAnalyzer] Parâmetros binomiais inválidos.');
        }
    }

    private combinacao(n: number, k: number): number {
        if (!Number.isInteger(n) || !Number.isInteger(k)) return 0;
        if (k < 0 || k > n || n < 0) return 0;

        const r = Math.min(k, n - k);
        let resultado = 1;

        for (let i = 1; i <= r; i++) {
            resultado *= (n - r + i) / i;
        }

        return resultado;
    }

    private criarPRNG(seed: number): () => number {
        let state = seed >>> 0;

        return (): number => {
            state = (state + 0x6D2B79F5) >>> 0;
            let z = state;
            z = Math.imul(z ^ (z >>> 15), z | 1);
            z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
            return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
        };
    }
}

export default ProbabilityAnalyzer;
