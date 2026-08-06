// ============================================
// CAMINHO: src/ai/strategies/WeightedSelectionStrategy.ts
// DATA CRIAÇÃO: 2026-01-20
// STATUS: ⏳ PENDENTE APROVAÇÃO
// VERSÃO: 3.0.0 (VERSÃO FINAL)
// ============================================
// 
// SEÇÃO 1: IMPORTS
// SEÇÃO 2: INTERFACE DE CONFIGURAÇÃO
// SEÇÃO 3: ESTRATÉGIA PONDERADA
// SEÇÃO 4: PRNG (PSEUDO-RANDOM NUMBER GENERATOR)
// SEÇÃO 5: ALGORITMO DE SELEÇÃO
// SEÇÃO 6: MÉTODOS AUXILIARES
// SEÇÃO 7: EXPORTS
// ============================================

// ============================================
// SEÇÃO 1: IMPORTS
// ============================================

import {
    SelectionStrategy,
    WeightedItem,
    SelectionConfig
} from './SelectionStrategy';

// ============================================
// SEÇÃO 2: INTERFACE DE CONFIGURAÇÃO
// ============================================

/**
 * Configuração específica para WeightedSelectionStrategy
 * 
 * Nota: poolSize não é necessário pois a estratégia recebe o pool pronto
 * O CandidatePool é responsável por definir o tamanho do pool
 */
export interface WeightedSelectionConfig extends SelectionConfig {
    // Apenas seed é necessário
    // poolSize é definido pelo CandidatePool
}

// ============================================
// SEÇÃO 3: ESTRATÉGIA PONDERADA
// ============================================

/**
 * Estratégia de seleção ponderada SEM REPOSIÇÃO
 * 
 * Responsabilidade:
 * - Receber WeightedItem[] (já normalizados - soma = 1)
 * - Selecionar números baseado em seus pesos
 * - REMOVER e RENORMALIZAR após cada seleção
 * - Garantir distribuição estatística correta
 * - Ser totalmente DETERMINÍSTICA com seed fixa
 * 
 * ALGORITMO CORRETO:
 * 1. Recebe pool de candidatos com pesos
 * 2. Cria UM PRNG com a seed fornecida
 * 3. Sorteia um número baseado no peso
 * 4. Remove o número sorteado do pool
 * 5. Renormaliza os pesos restantes (soma = 1)
 * 6. Repete até atingir a quantidade desejada
 * 7. Usa o MESMO PRNG para toda a seleção
 * 
 * Exemplo:
 * ```
 * Pool: A(40%), B(30%), C(20%), D(10%)
 * 
 * PRNG com seed = 12345
 * 
 * Rodada 1: random() = 0.42 → Sorteia A (40%)
 * Remove A → B(50%), C(33%), D(17%)
 * 
 * Rodada 2: random() = 0.73 → Sorteia B (50%)
 * Remove B → C(66%), D(34%)
 * 
 * Rodada 3: random() = 0.91 → Sorteia C (66%)
 * Remove C → D(100%)
 * ```
 * 
 * A estratégia NÃO conhece:
 * - Loterias (Mega, Lotofácil, etc)
 * - Intervalos numéricos (min/max)
 * - Como os pesos foram calculados
 * - Tamanho do pool (recebe pronto)
 * 
 * @example
 * ```typescript
 * const strategy = new WeightedSelectionStrategy();
 * const pool = candidatePool.getPool(items, 20); // Pool pronto
 * const numeros = strategy.selecionar(
 *   pool,      // Já é WeightedItem[]
 *   6,
 *   { seed: 12345 }  // Apenas seed
 * );
 * // Retorna: [4, 17, 23, 31, 45, 52]
 * // Com a MESMA seed, retorna SEMPRE o mesmo resultado
 * ```
 */
export class WeightedSelectionStrategy extends SelectionStrategy {
    /**
     * Nome da estratégia
     */
    readonly nome: string = 'WeightedSelection';

    /**
     * Seleciona números usando método ponderado SEM REPOSIÇÃO
     * 
     * @param items - Pool de itens com pesos normalizados (soma = 1)
     * @param quantidade - Quantidade de números a selecionar
     * @param config - Configurações (apenas seed)
     * @returns Array de números selecionados
     */
    selecionar(
        items: WeightedItem[],
        quantidade: number,
        config: SelectionConfig
    ): number[] {
        // ============================================
        // SEÇÃO: VALIDAÇÕES
        // ============================================
        this.validarConfig(config);
        this.validarItems(items);
        
        if (!this.isApplicable(items, quantidade)) {
            throw new Error(
                `Não é possível selecionar ${quantidade} números de ${items.length} itens`
            );
        }

        // ============================================
        // SEÇÃO: INICIALIZAÇÃO
        // ============================================
        const selecionados: number[] = [];
        const pool = items.map(item => ({ ...item })); // Cópia para mutação segura
        
        // CRIA UM ÚNICO PRNG PARA TODA A SELEÇÃO
        const random = this.criarPRNG(config.seed);

        // ============================================
        // SEÇÃO: SELEÇÃO ITERATIVA COM RENORMALIZAÇÃO
        // ============================================
        for (let i = 0; i < quantidade; i++) {
            // Sorteia um número do pool (usa o MESMO PRNG)
            const index = this.sortearPorPeso(pool, random);
            const selecionado = pool[index];
            
            // Adiciona ao resultado
            selecionados.push(selecionado.numero);
            
            // Remove do pool
            pool.splice(index, 1);
            
            // Renormaliza os pesos restantes (se ainda houver)
            if (pool.length > 0) {
                this.renormalizarPesos(pool);
            }
        }

        // ============================================
        // SEÇÃO: ORDENAR E RETORNAR
        // ============================================
        // Usa método da classe base para evitar duplicação
        return this.paraArrayOrdenado(new Set(selecionados));
    }

    // ============================================
    // SEÇÃO 4: PRNG (PSEUDO-RANDOM NUMBER GENERATOR)
    // ============================================

    /**
     * Cria um gerador de números pseudo-aleatórios
     * 
     * Implementação do algoritmo Mulberry32
     * - Rápido
     * - Determinístico (mesma seed = mesma sequência)
     * - Boa distribuição estatística
     * - Estado interno mantido entre chamadas
     * 
     * @param seed - Semente inicial
     * @returns Função que gera números aleatórios (0-1)
     * 
     * @example
     * ```typescript
     * const random = this.criarPRNG(12345);
     * console.log(random()); // 0.1234
     * console.log(random()); // 0.5678
     * console.log(random()); // 0.9012
     * ```
     */
    private criarPRNG(seed: number): () => number {
        let state = seed >>> 0; // Garante inteiro sem sinal 32 bits
        
        return function(): number {
            // Mulberry32 - algoritmo de alta qualidade
            state = (state + 0x6D2B79F5) >>> 0;
            let z = state;
            z = Math.imul(z ^ (z >>> 15), z | 1);
            z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
            return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
        };
    }

    // ============================================
    // SEÇÃO 5: ALGORITMO DE SELEÇÃO
    // ============================================

    /**
     * Sorteia um índice do pool baseado nos pesos
     * 
     * @param pool - Pool de itens com pesos
     * @param random - Função PRNG (mesmo estado para toda seleção)
     * @returns Índice sorteado
     */
    private sortearPorPeso(
        pool: WeightedItem[],
        random: () => number
    ): number {
        // Gera número aleatório entre 0 e 1
        const rand = random();
        
        // Sorteio por roleta
        let acumulado = 0;
        for (let i = 0; i < pool.length; i++) {
            acumulado += pool[i].peso;
            if (rand <= acumulado) {
                return i;
            }
        }
        
        // Fallback: último elemento (nunca deve acontecer com pesos normalizados)
        // Mantido por segurança, mas matematicamente nunca será executado
        return pool.length - 1;
    }

    // ============================================
    // SEÇÃO 6: MÉTODOS AUXILIARES
    // ============================================

    /**
     * Renormaliza os pesos para soma = 1
     * 
     * @param pool - Pool a ser renormalizado (modificado in-place)
     */
    private renormalizarPesos(pool: WeightedItem[]): void {
        const soma = pool.reduce((acc, item) => acc + item.peso, 0);
        
        if (soma === 0) {
            // Caso extremo: todos os pesos são zero
            // Distribuição igual
            const pesoIgual = 1 / pool.length;
            for (const item of pool) {
                item.peso = pesoIgual;
            }
        } else {
            // Normalização proporcional
            for (const item of pool) {
                item.peso = item.peso / soma;
            }
        }
    }
}

// ============================================
// SEÇÃO 7: EXPORTS
// ============================================

// Exportação padrão para facilitar importação
export default WeightedSelectionStrategy;
