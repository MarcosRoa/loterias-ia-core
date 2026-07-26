// ============================================
// CAMINHO: src/ai/engines/SmartRandomEngine.ts
// ============================================

import { BaseEngine, EngineConfig, EngineExtras, EngineResult, JogoGerado } from './BaseEngine';
import { FrequencyAnalyzer } from '../analysis/FrequencyAnalyzer';
import { ConfidenceCalculator } from '../evaluation/ConfidenceCalculator';

export class SmartRandomEngine extends BaseEngine {
    private confidenceCalc: ConfidenceCalculator;

    // ✅ ÚNICA MODIFICAÇÃO: CONSTRUTOR COM 4 ARGUMENTOS
    constructor(
        dados: number[][],
        config: EngineConfig,
        isPro: boolean = false,
        extras?: EngineExtras
    ) {
        super(dados, config, isPro, extras);
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

        if (!this.context || this.dados.length < 5) {
            for (let i = 0; i < quantidade; i++) {
                const numeros = this.gerarAleatorio(this.config.numerosPadrao, seed + i);
                const jogo = this.criarJogo(numeros, seed + i);
                jogos.push(jogo);
            }

            return {
                games: jogos,
                confidence: 20,
                engineName: this.getNome(),
                explanation: ['🎲 Aleatório puro (poucos dados)']
            };
        }

        const frequency = this.context.frequency;

        for (let i = 0; i < quantidade; i++) {
            const numeros = this.gerarNumerosSmartRandom(frequency, seed + i);
            const jogo = this.criarJogo(numeros, seed + i, [
                '🎲 Aleatório ponderado por frequência'
            ]);
            jogos.push(jogo);
        }

        const confianca = this.confidenceCalc.calcularCompleta(
            this.dados,
            ['frequencia']
        );

        return {
            games: jogos,
            confidence: Math.min(confianca.confianca, 50),
            engineName: this.getNome(),
            explanation: [
                `🎲 ${this.dados.length} concursos analisados`,
                `📊 Aleatório com viés estatístico`
            ]
        };
    }

    private gerarNumerosSmartRandom(
        frequency: FrequencyAnalyzer,
        seed: number
    ): number[] {
        const quantidade = this.config.numerosPadrao;
        const min = this.config.incluirZero ? 0 : 1;
        const max = this.config.maxNumero;
        const numeros = new Set<number>();

        const scores: { numero: number; peso: number }[] = [];

        for (let i = min; i <= max; i++) {
            const freq = frequency.getFrequencia(i);
            const peso = freq + this.random.next(seed + i) * 0.5;
            scores.push({ numero: i, peso });
        }

        const total = scores.reduce((acc, s) => acc + s.peso, 0);
        let rand = this.random.next(seed);

        for (let i = 0; i < quantidade; i++) {
            rand = this.random.next(seed + i + 100);
            let acumulado = 0;
            for (const item of scores) {
                acumulado += item.peso / total;
                if (rand <= acumulado && !numeros.has(item.numero)) {
                    numeros.add(item.numero);
                    break;
                }
            }
        }

        while (numeros.size < quantidade) {
            const num = this.random.nextInt(min, max, seed + numeros.size + 200);
            numeros.add(num);
        }

        return Array.from(numeros).sort((a, b) => a - b);
    }
}
