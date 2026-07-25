// ============================================
// CAMINHO: src/ai/engines/SpecialistEngine.ts
// ============================================
// IA ESPECIALISTA - Avalia e seleciona os melhores jogos
// ============================================

import { BaseEngine, EngineResult, JogoGerado, EngineConfig } from './BaseEngine';
import { GameEvaluator } from '../evaluation/GameEvaluator';
import { ConfidenceCalculator } from '../evaluation/ConfidenceCalculator';

export class SpecialistEngine extends BaseEngine {
    private evaluator: GameEvaluator;
    private confidenceCalc: ConfidenceCalculator;

    constructor(dados: number[][], config: EngineConfig) {
        super(dados, config);
        this.evaluator = new GameEvaluator(config.maxNumero, config.numerosPadrao);
        this.confidenceCalc = new ConfidenceCalculator();
    }

    getNome(): string {
        return '🎯 IA Especialista';
    }

    getDescricao(): string {
        return 'Avalia e seleciona os melhores jogos';
    }

    gerarJogos(quantidade: number, seed: number, params: any = {}): EngineResult {
        const jogos: JogoGerado[] = [];

        const totalCandidatos = Math.max(50, quantidade * 10);
        const candidatos: number[][] = [];

        for (let i = 0; i < totalCandidatos; i++) {
            const numeros = this.gerarAleatorio(this.config.numerosPadrao, seed + i);
            candidatos.push(numeros);
        }

        const selecionados = this.evaluator.selecionarMelhores(candidatos, quantidade);

        for (const avaliado of selecionados) {
            const explicacao = this.evaluator.gerarExplicacao(avaliado);
            const jogo = this.criarJogo(avaliado.numeros, seed, explicacao);
            jogos.push(jogo);
        }

        const confianca = this.confidenceCalc.calcularCompleta(
            this.dados,
            ['avaliacao', 'selecao', 'qualidade']
        );

        return {
            games: jogos,
            confidence: confianca.confianca,
            engineName: this.getNome(),
            explanation: [
                `🎯 ${totalCandidatos} jogos avaliados`,
                `📊 ${quantidade} melhores selecionados`,
                `⭐ Score médio: ${(selecionados.reduce((a, b) => a + b.score, 0) / selecionados.length).toFixed(1)}%`
            ]
        };
    }
}
