// ============================================
// CAMINHO: src/ai/engines/ProbabilityEngine.ts
// ============================================
// IA PROBABILÍSTICA - APENAS PRO
// ============================================

import { BaseEngine, EngineResult, JogoGerado, EngineConfig } from './BaseEngine';
import { ProbabilityAnalyzer } from '../analysis/ProbabilityAnalyzer';
import { ConfidenceCalculator } from '../evaluation/ConfidenceCalculator';

export class ProbabilityEngine extends BaseEngine {
    private confidenceCalc: ConfidenceCalculator;

    constructor(dados: number[][], config: EngineConfig) {
        super(dados, config, true);
        this.confidenceCalc = new ConfidenceCalculator();
    }

    isDisponivel(): boolean {
        return this.isPro;
    }

    getNome(): string {
        return '📈 IA Probabilística ⭐ PRO';
    }

    getDescricao(): string {
        return 'Distribuição binomial, entropia e variância. Exclusivo PRO.';
    }

    gerarJogos(quantidade: number, seed: number, params: any = {}): EngineResult {
        const jogos: JogoGerado[] = [];

        if (!this.context || this.dados.length < 10) {
            for (let i = 0; i < quantidade; i++) {
                const numeros = this.gerarAleatorio(this.config.numerosPadrao, seed + i);
                const jogo = this.criarJogo(numeros, seed + i);
                jogos.push(jogo);
            }

            return {
                games: jogos,
                confidence: 30,
                engineName: this.getNome(),
                explanation: ['⚠️ Poucos dados, usando aleatório']
            };
        }

        const probability = this.context.probability;
        const entropia = probability.getEntropia();
        const variancia = probability.getVariancia();

        for (let i = 0; i < quantidade; i++) {
            const numeros = probability.gerarPorProbabilidade(
                this.config.numerosPadrao,
                seed + i
            );
            
            const jogo = this.criarJogo(numeros, seed + i, [
                `📊 Entropia: ${entropia.toFixed(2)} bits`,
                `📈 Variância: ${variancia.toFixed(2)}`,
                `🎯 Distribuição probabilística`
            ]);
            
            jogos.push(jogo);
        }

        const confianca = this.confidenceCalc.calcularCompleta(
            this.dados,
            ['probabilidade', 'entropia', 'variancia']
        );

        return {
            games: jogos,
            confidence: confianca.confianca,
            engineName: this.getNome(),
            explanation: [
                `📊 Distribuição Binomial aplicada`,
                `📈 Entropia: ${entropia.toFixed(2)} bits`,
                `🎯 ${this.dados.length} concursos analisados`
            ]
        };
    }
}
