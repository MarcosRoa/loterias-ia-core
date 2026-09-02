// ============================================
// CAMINHO: src/ai/analysis/FrequencyAnalyzer.ts
// ============================================
// Análise de frequência histórica e temporal
// VERSÃO: 3.0.0  02/09/2026
// ============================================

export interface FrequencyTrend {
    numero: number;
    global: number;
    recente: number;
    mediaRecente: number;
    tendencia: number; // -1 a 1
    estabilidade: number; // 0 a 1
}

export class FrequencyAnalyzer {
    private dados: number[][];
    private frequencias: Map<number, number> = new Map();
    private maxFrequencia = 0;

    constructor(dados: number[][]) {
        this.validarDados(dados);
        this.dados = dados.map(jogo => [...jogo]);
        this.analisar();
    }

    private validarDados(dados: number[][]): void {
        if (!Array.isArray(dados) || dados.length === 0) {
            throw new Error('[FrequencyAnalyzer] Dados históricos vazios.');
        }
        if (dados.some(jogo => !Array.isArray(jogo) || jogo.length === 0)) {
            throw new Error('[FrequencyAnalyzer] Existem concursos inválidos.');
        }
    }

    private analisar(): void {
        const freq = new Map<number, number>();

        for (const jogo of this.dados) {
            const unicos = new Set(jogo);
            for (const num of unicos) {
                freq.set(num, (freq.get(num) || 0) + 1);
            }
        }

        this.frequencias = freq;
        this.maxFrequencia = Math.max(...Array.from(freq.values()), 0);
    }

    getFrequencia(numero: number): number {
        return this.frequencias.get(numero) || 0;
    }

    getFrequenciaRelativa(numero: number): number {
        const totalConcursos = this.dados.length;
        return totalConcursos > 0
            ? this.getFrequencia(numero) / totalConcursos
            : 0;
    }

    getFrequenciaNormalizada(numero: number): number {
        return this.maxFrequencia > 0
            ? (this.getFrequencia(numero) / this.maxFrequencia) * 100
            : 0;
    }

    getRanking(limit?: number): { numero: number; frequencia: number }[] {
        const sorted = Array.from(this.frequencias.entries())
            .map(([numero, frequencia]) => ({ numero, frequencia }))
            .sort((a, b) =>
                b.frequencia - a.frequencia || a.numero - b.numero
            );

        return limit === undefined ? sorted : sorted.slice(0, limit);
    }

    getMaisFrequentes(quantidade: number): number[] {
        return this.getRanking(quantidade).map(item => item.numero);
    }

    getMenosFrequentes(quantidade: number): number[] {
        const sorted = Array.from(this.frequencias.entries())
            .map(([numero, frequencia]) => ({ numero, frequencia }))
            .sort((a, b) =>
                a.frequencia - b.frequencia || a.numero - b.numero
            );

        return sorted.slice(0, quantidade).map(item => item.numero);
    }

    getMap(): Map<number, number> {
        return new Map(this.frequencias);
    }

    isQuente(numero: number): boolean {
        const media = this.getFrequenciaMedia();
        return media > 0 && this.getFrequencia(numero) > media * 1.2;
    }

    isFrio(numero: number): boolean {
        const media = this.getFrequenciaMedia();
        return media > 0 && this.getFrequencia(numero) < media * 0.8;
    }

    /**
     * Mede a mudança entre a frequência global e uma janela recente.
     * O resultado fica aproximadamente em [-1, 1].
     */
    getTendencia(numero: number, windowSize = 30): number {
        const recente = this.getFrequenciaNaJanela(numero, windowSize);
        const tamanho = Math.min(windowSize, this.dados.length);

        if (tamanho === 0) return 0;

        const globalRate = this.getFrequenciaRelativa(numero);
        const recentRate = recente / tamanho;

        if (globalRate === 0) {
            return recentRate > 0 ? 1 : 0;
        }

        return Math.max(-1, Math.min(1, (recentRate - globalRate) / globalRate));
    }

    /**
     * Retorna um sinal temporal normalizado [0,1].
     * 0.5 representa comportamento próximo da média histórica.
     */
    getScoreTendencia(numero: number, windowSize = 30): number {
        return (this.getTendencia(numero, windowSize) + 1) / 2;
    }

    getFrequenciaNaJanela(numero: number, windowSize = 30): number {
        const inicio = Math.max(0, this.dados.length - Math.max(1, windowSize));
        let count = 0;

        for (let i = inicio; i < this.dados.length; i++) {
            if (this.dados[i].includes(numero)) count++;
        }

        return count;
    }

    /**
     * Mede estabilidade comparando duas metades recentes.
     * 1 = muito estável, 0 = grande mudança.
     */
    getEstabilidade(numero: number, windowSize = 30): number {
        const tamanho = Math.max(4, Math.min(windowSize, this.dados.length));
        const metade = Math.floor(tamanho / 2);

        if (metade < 2) return 1;

        const inicio = this.dados.length - tamanho;
        let anterior = 0;
        let recente = 0;

        for (let i = inicio; i < inicio + metade; i++) {
            if (this.dados[i].includes(numero)) anterior++;
        }

        for (let i = inicio + metade; i < this.dados.length; i++) {
            if (this.dados[i].includes(numero)) recente++;
        }

        const anteriorRate = anterior / metade;
        const recenteRate = recente / (tamanho - metade);
        const denominador = Math.max(anteriorRate, recenteRate, 1 / tamanho);

        return Math.max(
            0,
            Math.min(1, 1 - Math.abs(recenteRate - anteriorRate) / denominador)
        );
    }

    getPerfil(numero: number, windowSize = 30): FrequencyTrend {
        const tamanho = Math.min(windowSize, this.dados.length);

        return {
            numero,
            global: this.getFrequencia(numero),
            recente: this.getFrequenciaNaJanela(numero, tamanho),
            mediaRecente: tamanho > 0
                ? this.getFrequenciaNaJanela(numero, tamanho) / tamanho
                : 0,
            tendencia: this.getTendencia(numero, tamanho),
            estabilidade: this.getEstabilidade(numero, tamanho)
        };
    }

    private getFrequenciaMedia(): number {
        if (this.frequencias.size === 0) return 0;

        const total = Array.from(this.frequencias.values())
            .reduce((a, b) => a + b, 0);

        return total / this.frequencias.size;
    }
}

export default FrequencyAnalyzer;
