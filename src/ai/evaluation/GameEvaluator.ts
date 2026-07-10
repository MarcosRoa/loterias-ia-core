// ============================================
// CAMINHO: src/ai/evaluation/GameEvaluator.ts
// ============================================
// Avaliador de qualidade de jogos
// ============================================

export interface JogoAvaliado {
    numeros: number[];
    score: number;
    detalhes: {
        equilibrioParImpar: number;
        distribuicaoDezenas: number;
        soma: number;
        amplitude: number;
        consecutivos: number;
        espacamento: number;
    };
}

export class GameEvaluator {
    private maxNumero: number;
    private quantidadeNumeros: number;

    constructor(maxNumero: number, quantidadeNumeros: number) {
        this.maxNumero = maxNumero;
        this.quantidadeNumeros = quantidadeNumeros;
    }

    avaliarJogo(numeros: number[]): JogoAvaliado {
        const ordenados = [...numeros].sort((a, b) => a - b);
        const total = ordenados.length;

        const pares = ordenados.filter(n => n % 2 === 0).length;
        const idealPar = total / 2;
        const equilibrioParImpar = 1 - Math.abs(pares - idealPar) / total;

        const dezenas = new Set(ordenados.map(n => Math.floor((n - 1) / 10) + 1));
        const distribuicaoDezenas = dezenas.size / Math.min(5, total);

        const soma = ordenados.reduce((a, b) => a + b, 0);
        const somaMin = total * 5;
        const somaMax = total * (this.maxNumero / 2);
        const somaIdeal = (somaMin + somaMax) / 2;
        const somaScore = 1 - Math.abs(soma - somaIdeal) / (somaMax - somaMin);

        const amplitude = Math.max(...ordenados) - Math.min(...ordenados);
        const amplitudeIdeal = this.maxNumero * 0.6;
        const amplitudeScore = 1 - Math.abs(amplitude - amplitudeIdeal) / this.maxNumero;

        let consecutivos = 0;
        for (let i = 1; i < ordenados.length; i++) {
            if (ordenados[i] - ordenados[i-1] === 1) {
                consecutivos++;
            }
        }
        const consecutivosScore = 1 - consecutivos / total;

        const espacos: number[] = [];
        for (let i = 1; i < ordenados.length; i++) {
            espacos.push(ordenados[i] - ordenados[i-1]);
        }
        const mediaEspacos = espacos.reduce((a, b) => a + b, 0) / espacos.length || 1;
        const varianciaEspacos = espacos.reduce((a, b) => a + Math.pow(b - mediaEspacos, 2), 0) / espacos.length;
        const espacamentoScore = 1 - Math.min(varianciaEspacos / 10, 1);

        const score = (
            equilibrioParImpar * 20 +
            distribuicaoDezenas * 20 +
            somaScore * 20 +
            amplitudeScore * 20 +
            consecutivosScore * 10 +
            espacamentoScore * 10
        );

        return {
            numeros: ordenados,
            score: Math.max(0, Math.min(100, score)),
            detalhes: {
                equilibrioParImpar: Math.max(0, Math.min(100, equilibrioParImpar * 100)),
                distribuicaoDezenas: Math.max(0, Math.min(100, distribuicaoDezenas * 100)),
                soma: soma,
                amplitude: amplitude,
                consecutivos: consecutivos,
                espacamento: Math.max(0, Math.min(100, espacamentoScore * 100))
            }
        };
    }

    selecionarMelhores(jogos: number[][], quantidade: number): JogoAvaliado[] {
        const avaliados = jogos.map(jogo => this.avaliarJogo(jogo));
        return avaliados
            .sort((a, b) => b.score - a.score)
            .slice(0, quantidade);
    }

    filtrarPorScore(jogos: number[][], scoreMinimo: number): JogoAvaliado[] {
        return jogos
            .map(jogo => this.avaliarJogo(jogo))
            .filter(item => item.score >= scoreMinimo)
            .sort((a, b) => b.score - a.score);
    }

    gerarExplicacao(avaliado: JogoAvaliado): string[] {
        const { detalhes } = avaliado;
        const explicacao: string[] = [];

        if (detalhes.equilibrioParImpar > 60) {
            explicacao.push(`⚖️ Equilíbrio par/ímpar: ${detalhes.equilibrioParImpar.toFixed(0)}%`);
        }
        if (detalhes.distribuicaoDezenas > 60) {
            explicacao.push(`🎯 Distribuição por dezenas: ${detalhes.distribuicaoDezenas.toFixed(0)}%`);
        }
        if (detalhes.espacamento > 60) {
            explicacao.push(`📊 Espaçamento equilibrado: ${detalhes.espacamento.toFixed(0)}%`);
        }
        if (detalhes.consecutivos <= 1) {
            explicacao.push(`📈 Poucos números consecutivos`);
        }

        explicacao.push(`⭐ Score: ${avaliado.score.toFixed(0)}%`);

        return explicacao;
    }
}
