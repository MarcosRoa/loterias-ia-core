// ============================================
// CAMINHO: src/ai/engines/BaseEngine.ts
// DATA CRIAÇÃO: 2026-01-20
// STATUS: ⏳ PENDENTE APROVAÇÃO
// VERSÃO: 2.1.0 (VERSÃO REVISADA)
// ============================================
// 
// SEÇÃO 1: IMPORTS
// SEÇÃO 2: INTERFACES E TIPOS
// SEÇÃO 3: BASE ENGINE (ABSTRACT)
// SEÇÃO 4: NOVOS MÉTODOS DE SELEÇÃO
// SEÇÃO 5: MÉTODOS EXISTENTES (MANTIDOS)
// SEÇÃO 6: EXPORTS
// ============================================

// ============================================
// SEÇÃO 1: IMPORTS
// ============================================

import { StatisticsContext } from '../services/StatisticsContext';
import { RandomGenerator } from '../services/RandomGenerator';
import { GameExtras } from '../services/GameExtras';

// NOVOS IMPORTS - ARQUITETURA EM CAMADAS
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
    /** Nome da loteria (ex: 'Mega-Sena') */
    nome: string;
    /** Tipo da loteria (ex: 'megasena') */
    lotteryType: string;
    /** Número máximo no range */
    maxNumero: number;
    /** Quantidade padrão de números por jogo */
    numerosPadrao: number;
    /** Se inclui zero no range */
    incluirZero: boolean;
    /** Se tem análise de dispersão */
    temDispersao: boolean;
    /** Se tem time do coração (Timemania) */
    temTime?: boolean;
    /** Se tem trevos (+Milionária) */
    temTrevos?: boolean;
    /** Se tem mês da sorte (Dia de Sorte) */
    temMes?: boolean;
    /** Se é Super Sete */
    isSuperSete?: boolean;
    /** Se é Loteca */
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
    // ============================================
    // PROPRIEDADES EXISTENTES
    // ============================================
    protected config: EngineConfig;
    protected dados: number[][];
    protected isPro: boolean = false;
    protected context: StatisticsContext | null = null;
    protected random: RandomGenerator;
    protected extras: GameExtras;
    protected extrasHistoricos: EngineExtras = {};

    // ============================================
    // NOVAS PROPRIEDADES - SERVIÇOS DA ARQUITETURA
    // ============================================
    protected scoreNormalizer: ScoreNormalizer;
    protected candidatePool: CandidatePool;
    protected selectionStrategy: SelectionStrategy; // ✅ USANDO INTERFACE
    protected diversificationService: DiversificationService;

    // ============================================
    // CONSTRUTOR (MANTIDO + NOVOS SERVIÇOS)
    // ============================================
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

        // ============================================
        // INICIALIZAR NOVOS SERVIÇOS
        // ============================================
        this.scoreNormalizer = new ScoreNormalizer();
        this.candidatePool = new CandidatePool();
        this.selectionStrategy = new WeightedSelectionStrategy(); // ✅ Instância concreta
        this.diversificationService = new DiversificationService();
    }

    // ============================================
    // MÉTODOS ABSTRATOS (MANTIDOS)
    // ============================================
    abstract gerarJogos(quantidade: number, seed: number, params?: any): EngineResult;
    abstract getNome(): string;
    abstract getDescricao(): string;

    // ============================================
    // MÉTODOS EXISTENTES (MANTIDOS)
    // ============================================
    isDisponivel(): boolean {
        return true;
    }

    isProEngine(): boolean {
        return this.isPro;
    }

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

    // ============================================
    // SEÇÃO 4: NOVOS MÉTODOS DE SELEÇÃO
    // ============================================

    /**
     * Método unificado de seleção de números usando a nova arquitetura
     * 
     * Fluxo completo:
     * 1. Recebe scores já calculados pela engine
     * 2. Normaliza para pesos (ScoreNormalizer) → WeightedItem[]
     * 3. Cria pool de candidatos (CandidatePool) → WeightedItem[]
     * 4. Seleciona números (WeightedSelectionStrategy) → number[]
     * 5. Diversifica (DiversificationService) → number[]
     * 
     * @param scores - Scores calculados pela engine (ScoreItem[])
     * @param quantidade - Quantidade de números a selecionar
     * @param seed - Semente para randomização
     * @param jogosGerados - Jogos já gerados (para diversificação)
     * @returns Números selecionados
     */
    protected selecionarNumeros(
        scores: ScoreItem[],
        quantidade: number,
        seed: number,
        jogosGerados: number[][] = []
    ): number[] {
        // ============================================
        // PASSO 1: NORMALIZAR SCORES PARA PESOS
        // ============================================
        const pesos = this.scoreNormalizer.normalizar(scores);

        // ============================================
        // PASSO 2: CRIAR POOL DE CANDIDATOS (TOP N)
        // ✅ CandidatePool agora recebe WeightedItem[] e devolve WeightedItem[]
        // ============================================
        const pool = this.candidatePool.criarPool(
            pesos,
            this.config.lotteryType
        );

        // ============================================
        // PASSO 3: SELECIONAR NÚMEROS (PONDERADO)
        // ============================================
        const selecionados = this.selectionStrategy.selecionar(
            pool,
            quantidade,
            { seed }
        );

        // ============================================
        // PASSO 4: DIVERSIFICAR (EVITAR REPETIÇÃO)
        // ============================================
        const diversificados = this.diversificationService.diversificar(
            jogosGerados,
            selecionados,
            this.derivarSeed(seed, 1000),
            scores
        );

        return diversificados;
    }

    /**
     * Versão com metadados para debug
     */
    protected selecionarNumerosComMetadata(
        scores: ScoreItem[],
        quantidade: number,
        seed: number,
        jogosGerados: number[][] = []
    ): { numeros: number[]; metadata: any } {
        const inicio = performance.now();
        
        const numeros = this.selecionarNumeros(
            scores,
            quantidade,
            seed,
            jogosGerados
        );

        return {
            numeros,
            metadata: {
                tempoExecucao: performance.now() - inicio,
                totalScores: scores.length,
                quantidadeSelecionada: numeros.length
            }
        };
    }

    /**
     * Cria scores a partir de um mapa de números e scores
     * Método utilitário para as engines
     */
    protected criarScores(scoreMap: Map<number, number>): ScoreItem[] {
        const scores: ScoreItem[] = [];
        for (const [numero, score] of scoreMap) {
            scores.push({ numero, score });
        }
        return scores;
    }

    /**
     * Cria scores a partir de arrays paralelos
     * Método utilitário para as engines
     */
    protected criarScoresFromArrays(
        numeros: number[],
        scores: number[]
    ): ScoreItem[] {
        if (numeros.length !== scores.length) {
            throw new Error('Arrays de números e scores devem ter o mesmo tamanho');
        }
        
        return numeros.map((numero, index) => ({
            numero,
            score: scores[index]
        }));
    }

    /**
     * Valida se os scores são válidos
     */
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

    /**
     * Gera seeds para múltiplos jogos de forma DETERMINÍSTICA
     * ✅ Substitui Math.random() por PRNG baseado em seedBase
     */
    protected gerarSeeds(quantidade: number, seedBase: number): number[] {
        const seeds: number[] = [];
        const random = this.criarPRNG(seedBase);
        
        for (let i = 0; i < quantidade; i++) {
            // Gera seed determinística usando o PRNG
            const seed = Math.floor(random() * 1000000) + i * 1000;
            seeds.push(seed);
        }
        
        return seeds;
    }

    /**
     * Deriva uma seed para operações específicas (determinística)
     */
    protected derivarSeed(seedBase: number, offset: number): number {
        const random = this.criarPRNG(seedBase + offset);
        return Math.floor(random() * 1000000);
    }

    /**
     * Cria um gerador de números pseudo-aleatórios (Mulberry32)
     * ✅ Determinístico - mesma seed = mesma sequência
     */
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
}

// ============================================
// SEÇÃO 6: EXPORTS
// ============================================

export { BaseEngine };
