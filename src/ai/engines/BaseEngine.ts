// ============================================
// CAMINHO: src/ai/engines/BaseEngine.ts
// ============================================
// Interface base para todos os motores
// ============================================

import { StatisticsContext } from '../services/StatisticsContext';
import { RandomGenerator } from '../services/RandomGenerator';
import { GameExtras } from '../services/GameExtras';

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

export abstract class BaseEngine {
    protected config: EngineConfig;
    protected dados: number[][];
    protected isPro: boolean = false;
    protected context: StatisticsContext | null = null;
    protected random: RandomGenerator;
    protected extras: GameExtras;

    constructor(dados: number[][], config: EngineConfig, isPro: boolean = false) {
        this.dados = dados;
        this.config = config;
        this.isPro = isPro;
        this.random = new RandomGenerator(0);
        this.extras = new GameExtras(this.random);
        
        if (dados.length >= 10) {
            this.context = new StatisticsContext(dados);
        }
    }

    abstract gerarJogos(quantidade: number, seed: number, params?: any): EngineResult;
    abstract getNome(): string;
    abstract getDescricao(): string;

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
        const extras: any = {};

        if (this.config.temTime) {
            extras.timeCoracao = this.extras.gerarTime(seed);
        }

        if (this.config.temTrevos) {
            extras.trevos = this.extras.gerarTrevos(seed);
        }

        if (this.config.temMes) {
            extras.mesSorte = this.extras.gerarMes(seed);
        }

        if (this.config.isSuperSete) {
            extras.colunas = this.extras.gerarSuperSete(seed);
            extras.numeros = extras.colunas.flat();
        }

        if (this.config.isLoteca) {
            extras.lotecaResultados = this.extras.gerarLoteca(seed);
            extras.numeros = [];
        }

        return extras;
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
