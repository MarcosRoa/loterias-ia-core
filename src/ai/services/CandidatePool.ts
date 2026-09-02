// ============================================
// CAMINHO: src/ai/services/CandidatePool.ts
// DATA CRIAÇÃO: 2026-01-20  
// STATUS: ⏳ PENDENTE APROVAÇÃO
// VERSÃO: 2.0.0 (VERSÃO REVISADA)
// ============================================
// 
// SEÇÃO 1: IMPORTS
// SEÇÃO 2: INTERFACES E TIPOS
// SEÇÃO 3: CONFIGURAÇÃO DE POOL POR LOTERIA
// SEÇÃO 4: CANDIDATE POOL SERVICE
// SEÇÃO 5: EXPORTS
// ============================================

// ============================================
// SEÇÃO 1: IMPORTS
// ============================================

// Nenhum import necessário - trabalha apenas com tipos locais
// Não conhece WeightedItem - responsabilidade do ScoreNormalizer

// ============================================
// SEÇÃO 2: INTERFACES E TIPOS
// ============================================

/**
 * Interface para itens com score (mesmo tipo de entrada e saída)
 */
export interface ScoreItem {
    numero: number;
    score: number;
}

/**
 * Configuração de pool para uma loteria específica
 */
export interface PoolConfig {
    /** Tamanho do pool (Top N) */
    tamanho: number;
    /** Tamanho mínimo do pool (fallback) */
    tamanhoMinimo?: number;
    /** Fator de ajuste dinâmico (opcional) */
    fatorAjuste?: number;
}

/**
 * Resultado da criação do pool
 */
export interface PoolResult {
    /** Pool de candidatos (mesmo tipo de entrada) */
    pool: ScoreItem[];
    /** Tamanho do pool utilizado */
    tamanhoUtilizado: number;
    /** Total de candidatos originais */
    totalCandidatos: number;
}

// ============================================
// SEÇÃO 3: CONFIGURAÇÃO DE POOL POR LOTERIA
// ============================================

/**
 * Configurações de pool por tipo de loteria
 * 
 * Cada loteria tem um tamanho de pool diferente baseado em:
 * - Quantidade de números disponíveis
 * - Quantidade de números por jogo
 * - Complexidade estatística
 * - Comportamento histórico
 */
const POOL_CONFIGS: Record<string, PoolConfig> = {
    // Mega-Sena: 60 números, 6 por jogo
    megasena: {
        tamanho: 20,
        tamanhoMinimo: 15
    },

    // Quina: 80 números, 5 por jogo
    quina: {
        tamanho: 25,
        tamanhoMinimo: 20
    },

    // Lotofácil: 25 números, 15 por jogo
    lotofacil: {
        tamanho: 35,
        tamanhoMinimo: 25
    },

    // Lotomania: 100 números, 20 por jogo
    lotomania: {
        tamanho: 40,
        tamanhoMinimo: 35
    },

    // Dupla Sena: 50 números, 6 por jogo
    duplasena: {
        tamanho: 20,
        tamanhoMinimo: 15
    },

    // Timemania: 80 números, 7 por jogo + time
    timemania: {
        tamanho: 30,
        tamanhoMinimo: 25
    },

    // +Milionária: 50 números, 6 por jogo + trevos
    milionaria: {
        tamanho: 25,
        tamanhoMinimo: 20
    },

    // Loteca: 14 jogos, 3 resultados cada
    loteca: {
        tamanho: 20,
        tamanhoMinimo: 15
    },

    // Dia de Sorte: 31 números, 7 por jogo + mês
    diadesorte: {
        tamanho: 30,
        tamanhoMinimo: 25
    },

    // Super Sete: 7 colunas, 0-9 cada
    supersete: {
        tamanho: 15,
        tamanhoMinimo: 10
    }
};

// ============================================
// SEÇÃO 4: CANDIDATE POOL SERVICE
// ============================================

/**
 * Serviço de criação de pool de candidatos
 * 
 * Responsabilidade ÚNICA:
 * - Receber ScoreItem[] (scores já normalizados pela engine)
 * - Selecionar Top N baseado no score
 * - Retornar ScoreItem[] (mesmo tipo, apenas reduzido)
 * 
 * A classe NÃO conhece:
 * - WeightedItem (responsabilidade do ScoreNormalizer)
 * - Estratégias de seleção
 * - Como os scores foram calculados
 * - Detalhes internos das engines
 * 
 * Fluxo:
 * 1. Recebe ScoreItem[] e tipo da loteria
 * 2. Obtém tamanho do pool para a loteria
 * 3. Ordena por score decrescente
 * 4. Seleciona Top N
 * 5. Retorna ScoreItem[] (mesmo tipo)
 * 
 * @example
 * ```typescript
 * const poolService = new CandidatePool();
 * 
 * // Scores já calculados pela engine
 * const scores: ScoreItem[] = [
 *   { numero: 23, score: 0.95 },
 *   { numero: 45, score: 0.87 },
 *   // ...
 * ];
 * 
 * // Cria pool para Mega-Sena (Top 20)
 * const pool = poolService.criarPool(scores, 'megasena');
 * // Retorna ScoreItem[] com os 20 melhores
 * // Mesmo tipo de entrada, apenas reduzido
 * ```
 */
export class CandidatePool {
    /**
     * Configurações de pool (pode ser sobrescrita)
     */
    private configs: Record<string, PoolConfig>;

    /**
     * Tamanho padrão quando a loteria não está configurada
     */
    private readonly TAMANHO_PADRAO = 30;

    /**
     * Tamanho mínimo absoluto
     */
    private readonly TAMANHO_MINIMO_ABSOLUTO = 10;

    constructor(configs?: Record<string, PoolConfig>) {
        this.configs = configs || POOL_CONFIGS;
    }

    /**
     * Cria o pool de candidatos para uma loteria específica
     * 
     * @param scores - Scores dos números (já calculados pela engine)
     * @param lotteryType - Tipo da loteria
     * @param tamanhoPersonalizado - Tamanho personalizado (opcional)
     * @returns Pool de candidatos (mesmo tipo: ScoreItem[])
     */
    criarPool(
        scores: ScoreItem[],
        lotteryType: string,
        tamanhoPersonalizado?: number
    ): ScoreItem[] {
        // ============================================
        // SEÇÃO: VALIDAÇÕES
        // ============================================
        if (!scores || scores.length === 0) {
            throw new Error('Lista de scores vazia');
        }

        // ============================================
        // SEÇÃO: DETERMINAR TAMANHO DO POOL
        // ============================================
        const tamanhoPool = this.determinarTamanhoPool(
            lotteryType,
            scores.length,
            tamanhoPersonalizado
        );

        // ============================================
        // SEÇÃO: ORDENAR E SELECIONAR TOP N
        // ============================================
        return this.selecionarTopN(scores, tamanhoPool);
    }

    /**
     * Cria pool com metadados (para debug)
     */
    criarPoolComMetadata(
        scores: ScoreItem[],
        lotteryType: string,
        tamanhoPersonalizado?: number
    ): PoolResult {
        const pool = this.criarPool(scores, lotteryType, tamanhoPersonalizado);
        
        const tamanhoPool = this.determinarTamanhoPool(
            lotteryType,
            scores.length,
            tamanhoPersonalizado
        );

        return {
            pool,
            tamanhoUtilizado: pool.length,
            totalCandidatos: scores.length
        };
    }

    /**
     * Determina o tamanho do pool baseado na loteria
     * 
     * @param lotteryType - Tipo da loteria
     * @param totalCandidatos - Total de candidatos disponíveis
     * @param tamanhoPersonalizado - Tamanho personalizado (opcional)
     * @returns Tamanho do pool
     */
    private determinarTamanhoPool(
        lotteryType: string,
        totalCandidatos: number,
        tamanhoPersonalizado?: number
    ): number {
        // Se tamanho personalizado foi fornecido, usa ele
        if (tamanhoPersonalizado !== undefined) {
            return Math.min(tamanhoPersonalizado, totalCandidatos);
        }

        // Busca configuração da loteria
        const config = this.configs[lotteryType];
        
        if (!config) {
            return Math.min(this.TAMANHO_PADRAO, totalCandidatos);
        }

        // Usa o tamanho configurado
        let tamanho = config.tamanho;

        // Ajusta se houver fator de ajuste
        if (config.fatorAjuste) {
            tamanho = Math.round(tamanho * config.fatorAjuste);
        }

        // Garante tamanho mínimo
        const tamanhoMinimo = config.tamanhoMinimo || this.TAMANHO_MINIMO_ABSOLUTO;
        tamanho = Math.max(tamanho, tamanhoMinimo);

        // Não pode exceder o total de candidatos
        return Math.min(tamanho, totalCandidatos);
    }

    /**
     * Seleciona os Top N scores
     * 
     * @param scores - Lista de scores
     * @param quantidade - Quantidade a selecionar
     * @returns Top N scores (mesmo tipo: ScoreItem[])
     */
    private selecionarTopN(scores: ScoreItem[], quantidade: number): ScoreItem[] {
        // Ordena por score decrescente
        const ordenados = [...scores].sort((a, b) => b.score - a.score);
        
        // Seleciona Top N
        return ordenados.slice(0, quantidade);
    }

    /**
     * Atualiza a configuração de uma loteria
     * 
     * @param lotteryType - Tipo da loteria
     * @param config - Nova configuração
     */
    atualizarConfig(lotteryType: string, config: Partial<PoolConfig>): void {
        if (this.configs[lotteryType]) {
            this.configs[lotteryType] = {
                ...this.configs[lotteryType],
                ...config
            };
        } else {
            this.configs[lotteryType] = {
                tamanho: this.TAMANHO_PADRAO,
                tamanhoMinimo: this.TAMANHO_MINIMO_ABSOLUTO,
                ...config
            };
        }
    }

    /**
     * Obtém a configuração atual de uma loteria
     */
    getConfig(lotteryType: string): PoolConfig | undefined {
        return this.configs[lotteryType];
    }

    /**
     * Lista todas as loterias configuradas
     */
    listarLoterias(): string[] {
        return Object.keys(this.configs);
    }

    /**
     * Verifica se uma loteria tem configuração
     */
    hasConfig(lotteryType: string): boolean {
        return !!this.configs[lotteryType];
    }

    /**
     * Obtém o tamanho padrão atual
     */
    getTamanhoPadrao(): number {
        return this.TAMANHO_PADRAO;
    }
}

// ============================================
// SEÇÃO 5: EXPORTS
// ============================================



// Exportação padrão para facilitar importação
export default CandidatePool;
