// ============================================
// CAMINHO: src/ai/services/CandidatePool.ts
// DATA CRIAÇÃO: 2026-01-20
// STATUS: ⏳ PENDENTE APROVAÇÃO
// VERSÃO: 1.0.0
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

import { ScoreItem, WeightedItem } from '../strategies/SelectionStrategy';

// ============================================
// SEÇÃO 2: INTERFACES E TIPOS
// ============================================

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
    /** Pool de candidatos com pesos */
    pool: WeightedItem[];
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
    // Pool menor porque os números têm distribuição mais estável
    megasena: {
        tamanho: 20,
        tamanhoMinimo: 15
    },

    // Quina: 80 números, 5 por jogo
    // Pool médio
    quina: {
        tamanho: 25,
        tamanhoMinimo: 20
    },

    // Lotofácil: 25 números, 15 por jogo
    // Pool maior porque muitos números são selecionados
    lotofacil: {
        tamanho: 35,
        tamanhoMinimo: 25
    },

    // Lotomania: 100 números, 20 por jogo
    // Pool maior devido ao grande range
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
 * Responsabilidade:
 * - Receber ScoreItem[] (scores brutos)
 * - Retornar WeightedItem[] (pool selecionado)
 * - Aplicar configurações específicas por loteria
 * - Garantir tamanho adequado do pool
 * 
 * Fluxo:
 * 1. Recebe scores e tipo de loteria
 * 2. Obtém configuração de pool para a loteria
 * 3. Ordena scores por valor (decrescente)
 * 4. Seleciona Top N (tamanho do pool)
 * 5. Retorna WeightedItem[] com os pesos
 * 
 * A classe NÃO conhece:
 * - Como os scores foram calculados
 * - Estratégias de seleção
 * - Detalhes internos das engines
 * 
 * @example
 * ```typescript
 * const poolService = new CandidatePool();
 * 
 * // Scores da engine
 * const scores: ScoreItem[] = [
 *   { numero: 23, score: 0.95 },
 *   { numero: 45, score: 0.87 },
 *   // ...
 * ];
 * 
 * // Cria pool para Mega-Sena
 * const pool = poolService.criarPool(scores, 'megasena');
 * // Retorna WeightedItem[] com os 20 melhores
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
     * @param scores - Scores brutos dos números
     * @param lotteryType - Tipo da loteria
     * @param tamanhoPersonalizado - Tamanho personalizado (opcional)
     * @returns Pool de candidatos com pesos
     */
    criarPool(
        scores: ScoreItem[],
        lotteryType: string,
        tamanhoPersonalizado?: number
    ): WeightedItem[] {
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
        const pool = this.selecionarTopN(scores, tamanhoPool);

        // ============================================
        // SEÇÃO: CONVERTER PARA WeightedItem[]
        // ============================================
        // Nota: Os pesos ainda não estão normalizados (soma = 1)
        // Isso será feito pelo ScoreNormalizer
        return pool.map(item => ({
            numero: item.numero,
            peso: item.score // Mantém o score original como peso
        }));
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
            tamanhoUtilizado: Math.min(tamanhoPool, scores.length),
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
            console.warn(
                `⚠️ Loteria "${lotteryType}" sem configuração de pool. ` +
                `Usando tamanho padrão: ${this.TAMANHO_PADRAO}`
            );
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
     * @returns Top N scores
     */
    private selecionarTopN(scores: ScoreItem[], quantidade: number): ScoreItem[] {
        // Ordena por score decrescente
        const ordenados = [...scores].sort((a, b) => b.score - a.score);
        
        // Seleciona Top N
        const selecionados = ordenados.slice(0, quantidade);
        
        // Log de informação (apenas em desenvolvimento)
        if (selecionados.length < scores.length) {
            console.debug(
                `📊 Pool criado: ${selecionados.length}/${scores.length} candidatos ` +
                `(Top ${Math.round(selecionados.length / scores.length * 100)}%)`
            );
        }
        
        return selecionados;
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
}

// ============================================
// SEÇÃO 5: EXPORTS
// ============================================

export { CandidatePool };
export type { PoolConfig, PoolResult };

// Exportação padrão para facilitar importação
export default CandidatePool;
