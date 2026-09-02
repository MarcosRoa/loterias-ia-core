// ============================================
// CAMINHO: src/ai/analysis/DelayAnalyzer.ts
// ============================================
// Análise de atraso e regularidade temporal
// VERSÃO: 3.0.0  02/02/2026
// ============================================

export interface DelayProfile {
    numero: number;
    atrasoAtual: number;
    atrasoMedio: number;
    atrasoMaximo: number;
    regularidade: number; // 0 a 1
    atrasoRelativo: number; // 0 a 1
}

export class DelayAnalyzer {
    private dados: number[][];
    private atrasos: Map<number, number> = new Map();
    private maxAtraso = 0;
    private intervalos: Map<number, number[]> = new Map();

    constructor(dados: number[][]) {
        this.validarDados(dados);
        this.dados = dados.map(jogo => [...jogo]);
        this.analisar();
    }

    private validarDados(dados: number[][]): void {
        if (!Array.isArray(dados) || dados.length === 0) {
            throw new Error('[DelayAnalyzer] Dados históricos vazios.');
        }
        if (dados.some(jogo => !Array.isArray(jogo) || jogo.length === 0)) {
            throw new Error('[DelayAnalyzer] Existem concursos inválidos.');
        }
    }

    private analisar(): void {
        const atrasos = new Map<number, number>();
        const ultimaOcorrencia = new Map<number, number>();
        const numeros = this.getTodosNumeros();

        for (let i = this.dados.length - 1; i >= 0; i--) {
            for (const num of new Set(this.dados[i])) {
                if (!ultimaOcorrencia.has(num)) {
                    ultimaOcorrencia.set(num, this.dados.length - 1 - i);
                }
            }
        }

        for (const num of numeros) {
            atrasos.set(num, ultimaOcorrencia.get(num) ?? this.dados.length);
        }

        this.atrasos = atrasos;
        this.maxAtraso = Math.max(...Array.from(atrasos.values()), 0);
        this.calcularIntervalos();
    }

    private calcularIntervalos(): void {
        const posicoes = new Map<number, number[]>();

        for (let i = 0; i < this.dados.length; i++) {
            for (const num of new Set(this.dados[i])) {
                if (!posicoes.has(num)) posicoes.set(num, []);
                posicoes.get(num)!.push(i);
            }
        }

        this.intervalos.clear();

        for (const [numero, indices] of posicoes) {
            const gaps: number[] = [];

            for (let i = 1; i < indices.length; i++) {
                gaps.push(indices[i] - indices[i - 1]);
            }

            this.intervalos.set(numero, gaps);
        }
    }

    private getTodosNumeros(): number[] {
        const numeros = new Set<number>();

        for (const jogo of this.dados) {
            for (const num of jogo) numeros.add(num);
        }

        return Array.from(numeros).sort((a, b) => a - b);
    }

    getAtraso(numero: number): number {
        return this.atrasos.get(numero) ?? this.dados.length;
    }

    getAtrasoNormalizado(numero: number): number {
        return this.maxAtraso > 0
            ? (this.getAtraso(numero) / this.maxAtraso) * 100
            : 0;
    }

    getRanking(limit?: number): { numero: number; atraso: number }[] {
        const sorted = Array.from(this.atrasos.entries())
            .map(([numero, atraso]) => ({ numero, atraso }))
            .sort((a, b) =>
                b.atraso - a.atraso || a.numero - b.numero
            );

        return limit === undefined ? sorted : sorted.slice(0, limit);
    }

    getMaisAtrasados(quantidade: number): number[] {
        return this.getRanking(quantidade).map(item => item.numero);
    }

    getMap(): Map<number, number> {
        return new Map(this.atrasos);
    }

    isAtrasado(numero: number): boolean {
        const media = this.getAtrasoMedio();
        return media > 0 && this.getAtraso(numero) > media * 1.2;
    }

    /**
     * Atraso relativo ao atraso médio histórico do próprio número.
     * Isso evita interpretar atraso absoluto como "probabilidade de sair".
     */
    getAtrasoRelativo(numero: number): number {
        const media = this.getAtrasoMedioNumero(numero);
        if (media <= 0) return 0.5;

        return Math.max(
            0,
            Math.min(1, this.getAtraso(numero) / (media * 2))
        );
    }

    /**
     * Mede regularidade dos intervalos históricos.
     * Quanto menor o coeficiente de variação, maior a regularidade.
     */
    getRegularidade(numero: number): number {
        const gaps = this.intervalos.get(numero) || [];

        if (gaps.length < 2) return 0.5;

        const media = gaps.reduce((a, b) => a + b, 0) / gaps.length;
        if (media <= 0) return 0.5;

        const variancia =
            gaps.reduce((soma, gap) => soma + Math.pow(gap - media, 2), 0) /
            gaps.length;

        const cv = Math.sqrt(variancia) / media;

        return Math.max(0, Math.min(1, 1 / (1 + cv)));
    }

    getAtrasoMedioNumero(numero: number): number {
        const gaps = this.intervalos.get(numero) || [];

        if (gaps.length === 0) {
            return this.dados.length / 2;
        }

        return gaps.reduce((a, b) => a + b, 0) / gaps.length;
    }

    getPerfil(numero: number): DelayProfile {
        const gaps = this.intervalos.get(numero) || [];
        const media = this.getAtrasoMedioNumero(numero);
        const maximo = gaps.length > 0 ? Math.max(...gaps) : media;

        return {
            numero,
            atrasoAtual: this.getAtraso(numero),
            atrasoMedio: media,
            atrasoMaximo: maximo,
            regularidade: this.getRegularidade(numero),
            atrasoRelativo: this.getAtrasoRelativo(numero)
        };
    }

    private getAtrasoMedio(): number {
        if (this.atrasos.size === 0) return 0;

        const total = Array.from(this.atrasos.values())
            .reduce((a, b) => a + b, 0);

        return total / this.atrasos.size;
    }
}

export default DelayAnalyzer;
