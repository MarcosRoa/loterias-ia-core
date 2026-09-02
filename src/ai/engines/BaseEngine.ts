// ============================================
// CAMINHO: src/ai/engines/BaseEngine.ts
// DATA CRIAÇÃO: 02/09/2026
// VERSÃO: 2.3.2 (COMPATIBILIDADE DE TIPOS)
// ============================================

//
// ALTERAÇÃO DESTA VERSÃO:
// - O CandidatePool passa a participar efetivamente da seleção.
// - A normalização ocorre somente sobre os candidatos do pool.
// - WeightedSelectionStrategy recebe somente o pool normalizado.
// - Removido o uso de maxNumero como poolSize.
// - Assinaturas existentes foram preservadas.
// - DiversificationService permanece no fluxo.
// - Nenhuma alteração foi feita na estrutura de JogoGerado,
//   EngineResult, EngineConfig ou nos métodos existentes.
// - Compatibilidade explícita com as duas formas de item aceitas pelo CandidatePool.
// - SelectionConfig recebe poolSize conforme contrato atual da estratégia.
// - O seed interno baseado em Math.random() permanece inalterado
//   nesta versão para manter o escopo da correção isolado.
//
// FLUXO:
//
// Scores da Engine
//       ↓
// CandidatePool
//       ↓
// Pool Top N
//       ↓
// ScoreNormalizer
//       ↓
// WeightedSelectionStrategy
//       ↓
// DiversificationService
//       ↓
// Números finais
//
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

    /**
     * Seleciona números seguindo o fluxo unificado:
     *
     * 1. Valida os scores recebidos.
     * 2. Cria o pool de candidatos Top N.
     * 3. Converte os scores do pool para ScoreItem[].
     * 4. Normaliza SOMENTE os scores que pertencem ao pool.
     * 5. Executa a seleção ponderada sem reposição.
     * 6. Aplica a diversificação considerando os jogos anteriores.
     *
     * IMPORTANTE:
     * O CandidatePool é a camada responsável por limitar o universo
     * de candidatos. Portanto, a seleção nunca deve receber os scores
     * completos quando o pool reduziu esse universo.
     */
    
    protected selecionarNumeros(
        scores: ScoreItem[],
        quantidade: number,
        seed: number,
        jogosGerados: number[][] = []
    ): number[] {

        // ============================================
        // PASSO 1: VALIDAR SCORES
        // ============================================

        this.validarScores(scores);

        if (!Number.isInteger(quantidade) || quantidade <= 0) {
            throw new Error(
                `Quantidade de números inválida: ${quantidade}`
            );
        }

        // ============================================
        // PASSO 2: CANDIDATOS PRIORITÁRIOS
        // ============================================

        const pool = this.candidatePool.criarPool(
            scores,
            this.config.lotteryType
        );

        if (!pool || pool.length === 0) {
            throw new Error(
                `CandidatePool retornou um pool vazio para a loteria "${this.config.lotteryType}"`
            );
        }

        // ============================================
        // PASSO 3: CONVERTER POOL PARA ScoreItem[]
        // ============================================

        const poolScores: ScoreItem[] = pool.map((item, index) => {

            if (!item || typeof item !== 'object') {
                throw new Error(
                    `Item inválido retornado pelo CandidatePool na posição ${index}`
                );
            }

            const registro =
                item as unknown as Record<string, unknown>;

            const numero = registro.numero;

            if (
                typeof numero !== 'number' ||
                !Number.isFinite(numero)
            ) {
                throw new Error(
                    `Número inválido retornado pelo CandidatePool na posição ${index}`
                );
            }

            const peso = registro.peso;

            if (
                typeof peso !== 'number' ||
                !Number.isFinite(peso)
            ) {
                throw new Error(
                    `Peso inválido retornado pelo CandidatePool para o número ${numero}`
                );
            }

            return {
                numero,
                score: peso
            };
        });

        // ============================================
        // PASSO 4: NORMALIZAR POOL
        // ============================================

        const poolPesos: WeightedItem[] =
            this.scoreNormalizer.normalizar(poolScores);

        if (
            !poolPesos ||
            poolPesos.length !== poolScores.length
        ) {
            throw new Error(
                `ScoreNormalizer retornou ${poolPesos?.length ?? 0} pesos para ${poolScores.length} candidatos`
            );
        }

        // ============================================
        // PASSO 5: SELEÇÃO
        // ============================================

        let selecionados: number[];

        // --------------------------------------------
        // CASO 1:
        // A quantidade cabe dentro do pool.
        // --------------------------------------------

        if (quantidade <= poolPesos.length) {

            selecionados =
                this.selectionStrategy.selecionar(
                    poolPesos,
                    quantidade,
                    {
                        seed,
                        poolSize: poolPesos.length
                    }
                );

        } else {

            // ----------------------------------------
            // CASO 2:
            // A modalidade exige mais números
            // do que o pool prioritário.
            //
            // Exemplo:
            // Lotomania = 50
            // Pool       = 40
            //
            // Os 40 candidatos prioritários continuam
            // sendo selecionados pela IA.
            // Os demais candidatos são selecionados
            // pelos seus scores reais.
            // ----------------------------------------

            const numerosPool = new Set(
                poolPesos.map(item => item.numero)
            );

            const scoresRestantes = scores.filter(
                item => !numerosPool.has(item.numero)
            );

            const totalDisponivel =
                poolPesos.length +
                scoresRestantes.length;

            if (totalDisponivel < quantidade) {
                throw new Error(
                    `Não há candidatos únicos suficientes para gerar ` +
                    `${quantidade} números na loteria "${this.config.lotteryType}". ` +
                    `Disponíveis: ${totalDisponivel}.`
                );
            }

            // ----------------------------------------
            // Seleciona os candidatos prioritários.
            // ----------------------------------------

            const partePool =
                this.selectionStrategy.selecionar(
                    poolPesos,
                    poolPesos.length,
                    {
                        seed,
                        poolSize: poolPesos.length
                    }
                );

            if (partePool.length !== poolPesos.length) {
                throw new Error(
                    `WeightedSelectionStrategy retornou ` +
                    `${partePool.length} números para um pool de ` +
                    `${poolPesos.length}`
                );
            }

            // ----------------------------------------
            // Quantos números ainda faltam?
            // ----------------------------------------

            const quantidadeRestante =
                quantidade - partePool.length;

            // ----------------------------------------
            // Normaliza os scores REAIS dos candidatos
            // que ficaram fora do pool.
            // ----------------------------------------

            const pesosRestantes =
                this.scoreNormalizer.normalizar(
                    scoresRestantes
                );

            if (
                !pesosRestantes ||
                pesosRestantes.length !==
                    scoresRestantes.length
            ) {
                throw new Error(
                    `ScoreNormalizer retornou quantidade inválida ` +
                    `para os candidatos restantes`
                );
            }

            // ----------------------------------------
            // Seleciona os candidatos restantes usando
            // os scores reais.
            // ----------------------------------------

            const parteRestante =
                this.selectionStrategy.selecionar(
                    pesosRestantes,
                    quantidadeRestante,
                    {
                        seed: this.derivarSeed(seed, 2000),
                        poolSize: pesosRestantes.length
                    }
                );

            if (
                parteRestante.length !==
                quantidadeRestante
            ) {
                throw new Error(
                    `WeightedSelectionStrategy retornou ` +
                    `${parteRestante.length} números, mas eram necessários ` +
                    `${quantidadeRestante}`
                );
            }

            // ----------------------------------------
            // Garantia estrutural: nenhum duplicado.
            // ----------------------------------------

            const unicos = new Set([
                ...partePool,
                ...parteRestante
            ]);

            if (unicos.size !== quantidade) {
                throw new Error(
                    `Seleção produziu ${unicos.size} números únicos, ` +
                    `mas eram esperados ${quantidade}`
                );
            }

            selecionados = [
                ...partePool,
                ...parteRestante
            ];
        }

        // ============================================
        // PASSO 6: DIVERSIFICAÇÃO
        // ============================================

        const diversificados =
            this.diversificationService.diversificar(
                jogosGerados,
                selecionados,
                this.derivarSeed(seed, 1000),
                scores
            );

        if (diversificados.length !== quantidade) {
            throw new Error(
                `DiversificationService retornou ` +
                `${diversificados.length} números, mas eram esperados ` +
                `${quantidade}`
            );
        }

        return diversificados;
    }

    protected criarScores(scoreMap: Map<number, number>): ScoreItem[] {
        const scores: ScoreItem[] = [];

        for (const [numero, score] of scoreMap) {
            scores.push({ numero, score });
        }

        return scores;
    }

    protected criarScoresFromArrays(
        numeros: number[],
        scores: number[]
    ): ScoreItem[] {
        if (numeros.length !== scores.length) {
            throw new Error(
                'Arrays de números e scores devem ter o mesmo tamanho'
            );
        }

        return numeros.map((numero, index) => ({
            numero,
            score: scores[index]
        }));
    }

    protected validarScores(scores: ScoreItem[]): void {
        if (!scores || scores.length === 0) {
            throw new Error('Lista de scores vazia');
        }

        for (const item of scores) {
            if (!Number.isFinite(item.numero)) {
                throw new Error(
                    `Número inválido nos scores: ${item.numero}`
                );
            }

            if (!Number.isFinite(item.score)) {
                throw new Error(
                    `Score inválido para número ${item.numero}: ${item.score}`
                );
            }

            if (item.score < 0) {
                throw new Error(
                    `Score negativo para número ${item.numero}: ${item.score}`
                );
            }
        }
    }

    protected gerarSeeds(
        quantidade: number,
        seedBase: number
    ): number[] {
        const seeds: number[] = [];
        const random = this.criarPRNG(seedBase);

        for (let i = 0; i < quantidade; i++) {
            seeds.push(
                Math.floor(random() * 1000000) + i * 1000
            );
        }

        return seeds;
    }

    protected derivarSeed(
        seedBase: number,
        offset: number
    ): number {
        const random = this.criarPRNG(seedBase + offset);
        return Math.floor(random() * 1000000);
    }

    private criarPRNG(seed: number): () => number {
        let state = seed >>> 0;

        return function(): number {
            state = (state + 0x6D2B79F5) >>> 0;

            let z = state;

            z = Math.imul(
                z ^ (z >>> 15),
                z | 1
            );

            z ^= z + Math.imul(
                z ^ (z >>> 7),
                z | 61
            );

            return (
                (z ^ (z >>> 14)) >>> 0
            ) / 4294967296;
        };
    }

    // ============================================
    // SEÇÃO 5: MÉTODOS EXISTENTES
    // ============================================

    protected gerarAleatorio(
        quantidade: number,
        seed: number
    ): number[] {
        const min = this.config.incluirZero ? 0 : 1;
        const max = this.config.maxNumero;

        return this.random.nextUniqueSorted(
            quantidade,
            min,
            max,
            seed
        );
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
            result.timeCoracao =
                this.extras.gerarTime(
                    seed,
                    this.extrasHistoricos.dadosTimes
                );
        }

        if (this.config.temTrevos) {
            result.trevos =
                this.extras.gerarTrevos(
                    seed,
                    this.extrasHistoricos.dadosTrevos
                );
        }

        if (this.config.temMes) {
            result.mesSorte =
                this.extras.gerarMes(
                    seed,
                    this.extrasHistoricos.dadosMeses
                );
        }

        if (this.config.isSuperSete) {
            result.colunas =
                this.extras.gerarSuperSete(seed);
        }

        if (this.config.isLoteca) {
            result.lotecaResultados =
                this.extras.gerarLoteca(seed);
        }

        return result;
    }

    protected criarJogo(
        numeros: number[],
        seed: number,
        explicacao?: string[]
    ): JogoGerado {
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
