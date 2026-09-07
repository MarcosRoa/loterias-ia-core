// ============================================
// CAMINHO: src/ai/engines/SmartRandomEngine.ts
// VERSÃO: 2.1.0 (INTEGRAÇÃO ADAPTATIVA)  07/09/2026
// ============================================

import { BaseEngine, EngineConfig, EngineExtras, EngineResult, JogoGerado } from './BaseEngine'; 
import { FrequencyAnalyzer } from '../analysis/FrequencyAnalyzer';
import { ConfidenceCalculator } from '../evaluation/ConfidenceCalculator';
import {
    EngineLearningBridge,
    SmartRandomLearningContext
} from '../services/EngineLearningBridge';

export class SmartRandomEngine extends BaseEngine {
    private confidenceCalc: ConfidenceCalculator;
    private smartRandomLearning!: SmartRandomLearningContext;

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

        if (!this.context) {
            throw new Error(
                '[SmartRandomEngine] StatisticsContext não foi inicializado.'
            );
        }

        if (this.dados.length < 10) {
            throw new Error(
                `[SmartRandomEngine] Dados insuficientes: ${this.dados.length} concursos. Mínimo esperado: 10 concursos.`
            );
        }

        const learningBridge = new EngineLearningBridge();

        this.smartRandomLearning =
            learningBridge.prepararSmartRandom(
                this.dados,
                {
                    loteria: this.config.lotteryType,
                    maxNumero: this.config.maxNumero,
                    incluirZero: this.config.incluirZero,
                    quantidadeNumeros: this.config.numerosPadrao,
                    minTreino: 300,
                    passo: 1,
                    recentWindow: 20
                }
            );

        const frequency = this.context.frequency;

        for (let i = 0; i < quantidade; i++) {
            const numeros = this.gerarNumerosSmartRandom(frequency, seed + i, this.smartRandomLearning);
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
                `🧠 Aleatoriedade modulada por aprendizado adaptativo`,
                `📊 Aleatório com viés estatístico`
            ]
        };
    }

    private gerarNumerosSmartRandom(
        frequency: FrequencyAnalyzer,
        seed: number,
        learning: SmartRandomLearningContext
    ): number[] {
        const quantidade = this.config.numerosPadrao;
        const min = this.config.incluirZero ? 0 : 1;
        const max = this.config.maxNumero;
        const numeros = new Set<number>();

        const scores: { numero: number; peso: number }[] = [];

        for (let i = min; i <= max; i++) {
            const freq = frequency.getFrequencia(i);
            const aprendido = learning.scoresAdaptativos.find(
                item => item.numero === i
            );

            if (!aprendido) {
                throw new Error(
                    `[SmartRandomEngine] Score adaptativo ausente para o número ${i}.`
                );
            }

            // A aleatoriedade continua sendo a identidade do motor.
            // O aprendizado apenas modula a ponderação estatística.
            const fatorAdaptativo =
                aprendido.score > 0
                    ? aprendido.score
                    : 0;

            const peso =
                freq *
                (0.5 + fatorAdaptativo) +
                this.random.next(seed + i) * 0.5;

            if (!Number.isFinite(peso) || peso < 0) {
                throw new Error(
                    `[SmartRandomEngine] Peso inválido para o número ${i}: ${peso}.`
                );
            }

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
