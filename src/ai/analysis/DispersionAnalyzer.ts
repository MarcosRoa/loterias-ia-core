// ============================================
// CAMINHO: src/ai/analysis/DispersionAnalyzer.ts
// ============================================
// Análise de comportamento recente 02/02/2026
// VERSÃO: 3.0.0
// ============================================

export interface DispersionProfile {
    numero: number;
    frequenciaRecente: number;
    taxaRecente: number;
    distanciaUltima: number;
    intensidade: number; // 0 a 1
    persistencia: number; // 0 a 1
}

export class DispersionAnalyzer {
    private dados: number[][];
    private recentes: Set<number> = new Set();
    private windowSize: number;

    constructor(dados: number[][], windowSize: number = 15) {
        if (!Array.isArray(dados) || dados.length === 0) {
            throw new Error('[DispersionAnalyzer] Dados históricos vazios.');
        }

        if (!Number.isInteger(windowSize) || windowSize < 1) {
            throw new Error('[DispersionAnalyzer] windowSize deve ser inteiro positivo.');
        }

        this.dados = dados.map(jogo => [...jogo]);
        this.windowSize = windowSize;
        this.analisar();
    }

    private analisar(): void {
        this.recentes.clear();

        const start = Math.max(0, this.dados.length - this.windowSize);

        for (let i = start; i < this.dados.length; i++) {
            for (const num of new Set(this.dados[i])) {
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

    getFrequenciaRecente(numero: number): number {
        const start = Math.max(0, this.dados.length - this.windowSize);
        let count = 0;

        for (let i = start; i < this.dados.length; i++) {
            if (this.dados[i].includes(numero)) count++;
        }

        return count;
    }

    getTaxaRecente(numero: number): number {
        const tamanho = Math.min(this.windowSize, this.dados.length);
        return tamanho > 0
            ? this.getFrequenciaRecente(numero) / tamanho
            : 0;
    }

    /**
     * Intensidade recente. Não é uma "probabilidade".
     * Mede apenas a concentração do número na janela atual.
     */
    getIntensidade(numero: number): number {
        const taxa = this.getTaxaRecente(numero);

        if (taxa <= 0) return 0;
        if (taxa >= 1) return 1;

        return taxa;
    }

    getPenalidade(numero: number): number {
        if (!this.isRecente(numero)) return 0;

        const distancia = this.getDistanciaUltima(numero);
        const fator = 1 - (distancia / this.windowSize);

        return Math.max(0, Math.min(1, fator));
    }

    aplicarPenalidade(numero: number, score: number): number {
        const penalidade = this.getPenalidade(numero);
        return score * (1 - penalidade * 0.7);
    }

    /**
     * Distância em concursos desde a última ocorrência.
     */
    getDistanciaUltima(numero: number): number {
        for (let i = this.dados.length - 1; i >= 0; i--) {
            if (this.dados[i].includes(numero)) {
                return this.dados.length - 1 - i;
            }
        }

        return this.dados.length;
    }

    /**
     * Mede persistência: em quantos blocos da janela o número apareceu.
     */
    getPersistencia(numero: number): number {
        const tamanho = Math.min(this.windowSize, this.dados.length);
        if (tamanho === 0) return 0;

        const inicio = this.dados.length - tamanho;
        let blocos = 0;

        for (let i = inicio; i < this.dados.length; i++) {
            if (this.dados[i].includes(numero)) blocos++;
        }

        return blocos / tamanho;
    }

    getPerfil(numero: number): DispersionProfile {
        return {
            numero,
            frequenciaRecente: this.getFrequenciaRecente(numero),
            taxaRecente: this.getTaxaRecente(numero),
            distanciaUltima: this.getDistanciaUltima(numero),
            intensidade: this.getIntensidade(numero),
            persistencia: this.getPersistencia(numero)
        };
    }

    setWindowSize(size: number): void {
        if (!Number.isInteger(size) || size < 1) {
            throw new Error('[DispersionAnalyzer] windowSize deve ser inteiro positivo.');
        }

        this.windowSize = size;
        this.analisar();
    }

    getWindowSize(): number {
        return this.windowSize;
    }
}

export default DispersionAnalyzer;
