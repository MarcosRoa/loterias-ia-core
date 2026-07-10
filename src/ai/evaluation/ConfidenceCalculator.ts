// ============================================
// CAMINHO: src/ai/evaluation/ConfidenceCalculator.ts
// ============================================
// Calculadora de confiança para motores 
// ============================================

export interface ConfidenceFactors {
    quantidadeConcursos: number;
    qualidadeEstatistica: number;
    quantidadeFiltros: number;
    estabilidade: number;
}

export class ConfidenceCalculator {
    calcular(factors: ConfidenceFactors): number {
        const pesos = {
            quantidadeConcursos: 0.30,
            qualidadeEstatistica: 0.30,
            quantidadeFiltros: 0.20,
            estabilidade: 0.20
        };

        return Math.max(0, Math.min(100,
            factors.quantidadeConcursos * pesos.quantidadeConcursos +
            factors.qualidadeEstatistica * pesos.qualidadeEstatistica +
            factors.quantidadeFiltros * pesos.quantidadeFiltros +
            factors.estabilidade * pesos.estabilidade
        ));
    }

    calcularPorQuantidade(totalConcursos: number): number {
        if (totalConcursos < 10) return 20;
        if (totalConcursos < 50) return 40;
        if (totalConcursos < 100) return 55;
        if (totalConcursos < 200) return 70;
        if (totalConcursos < 500) return 80;
        if (totalConcursos < 1000) return 88;
        return 95;
    }

    calcularPorQualidade(analises: { nome: string; valor: number }[]): number {
        const total = analises.reduce((acc, a) => acc + a.valor, 0);
        return total / analises.length;
    }

    calcularPorFiltros(quantidade: number, maximo: number = 10): number {
        return Math.min(100, (quantidade / maximo) * 100);
    }

    calcularEstabilidade(dados: number[][]): number {
        if (dados.length < 10) return 50;

        const freq = new Map<number, number>();
        for (const jogo of dados) {
            for (const num of jogo) {
                freq.set(num, (freq.get(num) || 0) + 1);
            }
        }

        const valores = Array.from(freq.values());
        const media = valores.reduce((a, b) => a + b, 0) / valores.length;
        const variancia = valores.reduce((a, b) => a + Math.pow(b - media, 2), 0) / valores.length;
        const desvioPadrao = Math.sqrt(variancia);

        const estabilidade = 100 - Math.min(100, (desvioPadrao / media) * 100);
        return Math.max(0, estabilidade);
    }

    calcularCompleta(
        dados: number[][],
        filtrosAplicados: string[]
    ): { confianca: number; fatores: ConfidenceFactors } {
        const fatores: ConfidenceFactors = {
            quantidadeConcursos: this.calcularPorQuantidade(dados.length),
            qualidadeEstatistica: this.calcularPorQualidade([
                { nome: 'frequencia', valor: 80 },
                { nome: 'atraso', valor: 70 },
                { nome: 'dispersao', valor: 75 }
            ]),
            quantidadeFiltros: this.calcularPorFiltros(filtrosAplicados.length),
            estabilidade: this.calcularEstabilidade(dados)
        };

        return {
            confianca: this.calcular(fatores),
            fatores: fatores
        };
    }

    explicarConfianca(confianca: number): string {
        if (confianca >= 90) return '⭐ Excelente';
        if (confianca >= 75) return '👍 Muito boa';
        if (confianca >= 60) return '📊 Boa';
        if (confianca >= 45) return '📈 Razoável';
        if (confianca >= 30) return '📉 Baixa';
        return '⚠️ Muito baixa';
    }
}
