// ============================================
// CAMINHO: src/ai/engines/PredictiveEngine.ts
// ============================================
// IA PREDITIVA - APENAS PRO
// ============================================

import { BaseEngine, EngineResult, JogoGerado, EngineConfig } from './BaseEngine';
import { PatternAnalyzer, Pattern } from '../analysis/PatternAnalyzer';
import { ConfidenceCalculator } from '../evaluation/ConfidenceCalculator';

export class PredictiveEngine extends BaseEngine {
    private confidenceCalc: ConfidenceCalculator;

    constructor(dados: number[][], config: EngineConfig) {
        super(dados, config, true);
        this.confidenceCalc = new ConfidenceCalculator();
    }

    isDisponivel(): boolean {
        return this.isPro;
    }

    getNome(): string {
        return '🔮 IA Preditiva ⭐ PRO';
    }

    getDescricao(): string {
        return 'Detecta padrões e tenta prever os próximos números. Exclusivo PRO.';
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

        const patterns = this.context.patterns;
        const melhoresPadroes = patterns.getMelhoresPadroes(quantidade * 2);
        const padroesSelecionados = melhoresPadroes.slice(0, quantidade);

        for (let i = 0; i < quantidade; i++) {
            const padrao = padroesSelecionados[i % padroesSelecionados.length];
            const numeros = this.gerarNumerosPorPadrao(padrao, seed + i);
            
            const jogo = this.criarJogo(numeros, seed + i, [
                `🧩 Padrão: ${padrao.nome}`,
                `🎯 Confiança: ${padrao.confianca}%`,
                `📊 ${padrao.ocorrencias} ocorrências`
            ]);
            
            jogos.push(jogo);
        }

        const confianca = this.confidenceCalc.calcularCompleta(
            this.dados,
            ['padroes', 'ciclos', 'duplas', 'intervalos']
        );

        return {
            games: jogos,
            confidence: confianca.confianca,
            engineName: this.getNome(),
            explanation: [
                `🧩 ${patterns.getPadroes().length} padrões detectados`,
                `🎯 Confiança: ${confianca.confianca.toFixed(0)}%`,
                `📊 ${melhoresPadroes.length} padrões selecionados`
            ]
        };
    }

    private gerarNumerosPorPadrao(padrao: Pattern, seed: number): number[] {
        const quantidade = this.config.numerosPadrao;
        const max = this.config.maxNumero;
        const min = this.config.incluirZero ? 0 : 1;

        const patterns = this.context!.patterns;
        const numeros = patterns.gerarNumerosPorPadrao(padrao, quantidade, max);

        while (numeros.length < quantidade) {
            const num = this.random.nextInt(min, max, seed + numeros.length);
            if (!numeros.includes(num)) {
                numeros.push(num);
            }
        }

        return numeros.sort((a, b) => a - b);
    }
}
