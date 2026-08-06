// ============================================
// CAMINHO: src/ai/engines/BaseEngine.ts
// DATA CRIAÇÃO: 2026-01-20
// VERSÃO: 2.2.0 (CORRIGIDO)
// ============================================
// 
// SEÇÃO 1: IMPORTS
// SEÇÃO 2: INTERFACES E TIPOS
// SEÇÃO 3: BASE ENGINE (ABSTRACT)
// SEÇÃO 4: MÉTODOS DE SELEÇÃO
// SEÇÃO 5: MÉTODOS EXISTENTES
// SEÇÃO 6: EXPORTS
// ============================================

// ============================================
// SEÇÃO 1: IMPORTS
// ============================================

import { StatisticsContext } from '../services/StatisticsContext';
import { RandomGenerator } from '../services/RandomGenerator';
import { GameExtras } from '../services/GameExtras';
import { ScoreItem, WeightedItem } from '../types';
import { SelectionStrategy } from '../strategies/SelectionStrategy';
import { WeightedSelectionStrategy } from '../strategies/WeightedSelectionStrategy';
import { ScoreNormalizer } from '../services/ScoreNormalizer';
import { CandidatePool } from '../services/CandidatePool';
import { DiversificationService } from '../services/DiversificationService';

// ============================================
// SEÇÃO 2: INTERFACES E TIPOS
// ============================================

export interface JogoGerado {
    numeros: number[];
    timeCoracao?: string;
    trevos?: number[];
    mesSorte?: number;
    colunas?: number[][];
    lotecaResultados?: string[];
    explicacao?: string[];
}

export interface EngineResult {
    games: JogoGerado[];
    confidence: number;
    engineName: string;
    explanation: string[];
}

export interface EngineConfig {
    nome: string;
    lotteryType: string;
    maxNumero: number;
    numerosPadrao: number;
    incluirZero: boolean;
    temDispersao: boolean;
    temTime?: boolean;
    temTrevos?: boolean;
    temMes?: boolean;
    isSuperSete?: boolean;
    isLoteca?: boolean;
}

export interface EngineExtras {
    dadosTimes?: any[];
    dadosMeses?: any[];
    dadosTrevos?: any[];
}

// ============================================
// SEÇÃO 3: BASE ENGINE (ABSTRACT)
// ============================================

export abstract class BaseEngine {
    protected config: EngineConfig;
    protected dados: number[][];
    protected isPro: boolean = false;
    protected context: StatisticsContext | null = null;
    protected random: RandomGenerator;
    protected extras: GameExtras;
    protected extrasHistoricos: EngineExtras = {};
    protected scoreNormalizer: ScoreNormalizer;
    protected candidatePool: CandidatePool;
    protected selectionStrategy: SelectionStrategy;
    protected diversificationService: DiversificationService;

    constructor(
        dados: number[][],
        config: EngineConfig,
        isPro: boolean = false,
        extras?: EngineExtras
    ) {
        this.dados = dados;
        this.config = config;
        this.isPro = isPro;
        this.random = new RandomGenerator(Date.now() + Math.random() * 1000000);
        this.extras = new GameExtras(this.random);
        this.extrasHistoricos = extras || {};
        
        if (dados.length >= 10) {
            this.context = new StatisticsContext(dados);
        }

        this.scoreNormalizer = new ScoreNormalizer();
        this.candidatePool = new CandidatePool();
        this.selectionStrategy = new WeightedSelectionStrategy();
        this.diversificationService = new DiversificationService();
    }

    // ============================================
    // MÉTODOS ABSTRATOS
    // ============================================

    abstract gerarJogos(quantidade: number, seed: number, params?: any): EngineResult;
    abstract getNome(): string;
    abstract getDescricao(): string;

    // ============================================
    // MÉTODOS PÚBLICOS
    // ============================================

    isDisponivel(): boolean {
        return true;
    }

    isProEngine(): boolean {
        return this.isPro;
    }

    // ============================================
    // SEÇÃO 4: MÉTODOS DE SELEÇÃO
    // ============================================

   
    protected selecionarNumeros(
        scores: ScoreItem[],
        quantidade: number,
        seed: number,
        jogosGerados: number[][] = []
    ): number[] {
        const pesos = this.scoreNormalizer.normalizar(scores);
        const pool = this.candidatePool.criarPool(scores, this.config.lotteryType);
        const selecionados = this.selectionStrategy.selecionar(pool, quantidade, { seed });
        const diversificados = this.diversificationService.diversificar(
            jogosGerados,
            selecionados,
            this.derivarSeed(seed, 1000),
            scores
        );
        return diversificados;
    }

    protected criarScores(scoreMap: Map<number, number>): ScoreItem[] {
        const scores: ScoreItem[] = [];
        for (const [numero, score] of scoreMap) {
            scores.push({ numero, score });
        }
        return scores;
    }

    protected criarScoresFromArrays(numeros: number[], scores: number[]): ScoreItem[] {
        if (numeros.length !== scores.length) {
            throw new Error('Arrays de números e scores devem ter o mesmo tamanho');
        }
        return numeros.map((numero, index) => ({ numero, score: scores[index] }));
    }

    protected validarScores(scores: ScoreItem[]): void {
        if (!scores || scores.length === 0) {
            throw new Error('Lista de scores vazia');
        }
        for (const item of scores) {
            if (item.score < 0) {
                throw new Error(`Score negativo para número ${item.numero}: ${item.score}`);
            }
        }
    }

    protected gerarSeeds(quantidade: number, seedBase: number): number[] {
        const seeds: number[] = [];
        const random = this.criarPRNG(seedBase);
        for (let i = 0; i < quantidade; i++) {
            seeds.push(Math.floor(random() * 1000000) + i * 1000);
        }
        return seeds;
    }

    protected derivarSeed(seedBase: number, offset: number): number {
        const random = this.criarPRNG(seedBase + offset);
        return Math.floor(random() * 1000000);
    }

    private criarPRNG(seed: number): () => number {
        let state = seed >>> 0;
        return function(): number {
            state = (state + 0x6D2B79F5) >>> 0;
            let z = state;
            z = Math.imul(z ^ (z >>> 15), z | 1);
            z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
            return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
        };
    }

    // ============================================
    // SEÇÃO 5: MÉTODOS EXISTENTES (MANTIDOS)
    // ============================================

    protected gerarAleatorio(quantidade: number, seed: number): number[] {
        const min = this.config.incluirZero ? 0 : 1;
        const max = this.config.maxNumero;
        return this.random.nextUniqueSorted(quantidade, min, max, seed);
    }

    protected adicionarExtras(seed: number): {
        timeCoracao?: string;
        trevos?: number[];
        mesSorte?: number;
        colunas?: number[][];
        lotecaResultados?: string[];
    } {
        const result: any = {};

        if (this.config.temTime) {
            result.timeCoracao = this.extras.gerarTime(seed, this.extrasHistoricos.dadosTimes);
        }

        if (this.config.temTrevos) {
            result.trevos = this.extras.gerarTrevos(seed, this.extrasHistoricos.dadosTrevos);
        }

        if (this.config.temMes) {
            result.mesSorte = this.extras.gerarMes(seed, this.extrasHistoricos.dadosMeses);
        }

        if (this.config.isSuperSete) {
            result.colunas = this.extras.gerarSuperSete(seed);
        }

        if (this.config.isLoteca) {
            result.lotecaResultados = this.extras.gerarLoteca(seed);
        }

        return result;
    }

    protected criarJogo(numeros: number[], seed: number, explicacao?: string[]): JogoGerado {
        const jogo: JogoGerado = { numeros };
        
        if (explicacao) {
            jogo.explicacao = explicacao;
        }

        const extras = this.adicionarExtras(seed);
        Object.assign(jogo, extras);

        return jogo;
    }
}

// ============================================
// SEÇÃO 6: EXPORTS
// ============================================

export default BaseEngine;
