// ============================================
// CAMINHO: src/ai/engines/SmartRandomEngine.ts
// ============================================
// IA ALEATÓRIO INTELIGENTE - Aleatório com ponderação
// ============================================

import { BaseEngine, EngineResult, JogoGerado, EngineConfig } from './BaseEngine';
import { FrequencyAnalyzer } from '../analysis/FrequencyAnalyzer';
import { ConfidenceCalculator } from '../evaluation/ConfidenceCalculator';

export class SmartRandomEngine extends BaseEngine {
    private confidenceCalc: ConfidenceCalculator;

    constructor(dados: number[][], config: EngineConfig) {
        super(dados, config);
        this.confidenceCalc = new ConfidenceCalculator();
    }

    getNome(): string {
        return '🎲 Aleatório Inteligente';
    }

    getDescricao(): string {
        return 'Aleatório com ponderação estatística';
    }

    gerarJogos(quantidade: number, seed: number, params: any = {}): EngineResult {
        const jogos: JogoGerado[] = [];

        if (this.dados.length < 10) {
            for (let i = 0; i < quantidade; i++) {
                const numeros = this.gerarAleatorio(this.config.numerosPadrao, seed + i);
                const jogo = this.criarJogo(numeros, seed + i);
                jogos.push(jogo);
            }

            return {
                games: jogos,
                confidence: 30,
                engineName: this.getNome(),
                explanation: ['⚠️ Poucos dados, usando aleatório puro']
            };
        }

        const frequency = new FrequencyAnalyzer(this.dados);
        const pesos = this.calcularPesos(frequency);

        for (let i = 0; i < quantidade; i++) {
            const numeros = this.gerarNumerosPonderados(pesos, seed + i);
            const jogo = this.criarJogo(numeros, seed + i, [
                '🎲 Aleatório com ponderação',
                `📊 Baseado em ${this.dados.length} concursos`
            ]);
            jogos.push(jogo);
        }

        const confianca = this.confidenceCalc.calcularCompleta(
            this.dados,
            ['ponderacao']
        );

        return {
            games: jogos,
            confidence: confianca.confianca,
            engineName: this.getNome(),
            explanation: [
                `🎲 Aleatório com ponderação estatística`,
                `📊 ${this.dados.length} concursos analisados`,
                `⚖️ Distribuição equilibrada`
            ]
        };
    }

    private calcularPesos(frequency: FrequencyAnalyzer): Map<number, number> {
        const pesos = new Map<number, number>();
        const min = this.config.incluirZero ? 0 : 1;
        const max = this.config.maxNumero;

        for (let i = min; i <= max; i++) {
            const freq = frequency.getFrequencia(i);
            const maxFreq = frequency.getRanking(1)[0]?.frequencia || 1;
            
            let peso;
            if (freq > maxFreq * 0.7) {
                peso = 0.3 + (this.random.next(i) * 0.1);
            } else if (freq > maxFreq * 0.3) {
                peso = 0.5 + (this.random.next(i) * 0.15);
            } else {
                peso = 0.2 + (this.random.next(i) * 0.15);
            }
            pesos.set(i, peso);
        }

        return pesos;
    }

    private gerarNumerosPonderados(pesos: Map<number, number>, seed: number): number[] {
        const quantidade = this.config.numerosPadrao;
        const numeros = new Set<number>();
        const sorted = Array.from(pesos.entries()).sort((a, b) => b[1] - a[1]);

        while (numeros.size < quantidade) {
            const rand = this.random.next(seed + numeros.size);
            let acumulado = 0;
            for (const [num, peso] of sorted) {
                acumulado += peso;
                if (rand <= acumulado) {
                    numeros.add(num);
                    break;
                }
            }
        }

        return Array.from(numeros).sort((a, b) => a - b);
    }
}
