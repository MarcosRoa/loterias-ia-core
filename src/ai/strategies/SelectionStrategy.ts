// ============================================
// CAMINHO: src/ai/strategies/SelectionStrategy.ts
// DATA CRIAÇÃO: 2026-01-20
// STATUS: ⏳ PENDENTE APROVAÇÃO
// VERSÃO: 1.1.0 (REVISADO)
// ============================================
// 
// SEÇÃO 1: IMPORTS
// SEÇÃO 2: INTERFACES E TIPOS
// SEÇÃO 3: ESTRATÉGIA BASE (ABSTRACT)
// SEÇÃO 4: EXPORTS
// ============================================

// ============================================
// SEÇÃO 1: IMPORTS
// ============================================

// Nenhum import necessário - camada puramente funcional
// Esta camada NÃO conhece:
// - Loterias (Mega, Lotofácil, etc)
// - Engines de IA
// - Intervalos numéricos (min/max)
// - Detalhes de implementação externos

// ============================================
// SEÇÃO 2: INTERFACES E TIPOS
// ============================================

/**
 * Interface que define um item com score para seleção
 * Representa um número candidato com sua pontuação
 * 
 * @example
 * ```typescript
 * const item: ScoreItem = { numero: 23, score: 0.85 };
 * ```
 */
export interface ScoreItem {
    /** Número sendo avaliado */
    numero: number;
    /** Pontuação do número (quanto maior, melhor) */
    score: number;
}

/**
 * Interface que define um item com peso para seleção
 * Usado após normalização dos scores
 * 
 * @example
 * ```typescript
 * const item: WeightedItem = { numero: 23, peso: 0.15 };
 * ```
 */
export interface WeightedItem {
    /** Número sendo avaliado */
    numero: number;
    /** Peso do número (0-1, soma total = 1) */
    peso: number;
}

/**
 * Configuração para a estratégia de seleção
 * A estratégia só conhece configurações de seleção, não detalhes da loteria
 */
export interface SelectionConfig {
    /** Tamanho do pool de candidatos (Top N) */
    poolSize: number;
    /** Semente para randomização */
    seed: number;
}

// ============================================
// SEÇÃO 3: ESTRATÉGIA BASE (ABSTRACT)
// ============================================

/**
 * Estratégia base para seleção de números
 * 
 * Responsabilidade:
 * - Receber WeightedItem[] e devolver number[]
 * - Não conhece Mega, Lotofácil, Quina ou IA
 * - Conhece apenas: peso, seed, quantidade
 * 
 * Princípios:
 * - Single Responsibility: Apenas selecionar números
 * - Open/Closed: Aberta para extensão, fechada para modificação
 * - Interface Segregation: Interface mínima e focada
 * - Dependency Inversion: Depende de abstrações, não de implementações
 * 
 * Fluxo de dados:
 * ```
 * ScoreItem[] → ScoreNormalizer → WeightedItem[] → SelectionStrategy → number[]
 * ```
 */
export abstract class SelectionStrategy {
    /**
     * Nome da estratégia (para logging e debug)
     */
    abstract readonly nome: string;

    /**
     * Seleciona números baseado em pesos
     * 
     * @param items - Lista de itens com pesos (já normalizados)
     * @param quantidade - Quantos números selecionar
     * @param config - Configurações de seleção
     * @returns Lista de números selecionados
     * 
     * @example
     * ```typescript
     * const strategy = new WeightedSelectionStrategy();
     * const numeros = strategy.selecionar(
     *   itensPonderados,
     *   6,
     *   { poolSize: 20, seed: 12345 }
     * );
     * ```
     */
    abstract selecionar(
        items: WeightedItem[],
        quantidade: number,
        config: SelectionConfig
    ): number[];

    /**
     * Valida se a estratégia pode ser aplicada
     * 
     * @param items - Lista de itens com pesos
     * @param quantidade - Quantos números selecionar
     * @returns True se aplicável, false caso contrário
     * 
     * @example
     * ```typescript
     * if (strategy.isApplicable(items, 6)) {
     *   const result = strategy.selecionar(items, 6, config);
     * }
     * ```
     */
    isApplicable(items: WeightedItem[], quantidade: number): boolean {
        // Validação básica de entrada
        if (!items || items.length === 0) return false;
        if (quantidade <= 0) return false;
        if (quantidade > items.length) return false;
        return true;
    }

    /**
     * Valida a configuração
     * 
     * @param config - Configuração a ser validada
     * @throws Error se configuração for inválida
     * 
     * @example
     * ```typescript
     * this.validarConfig(config);
     * ```
     */
    protected validarConfig(config: SelectionConfig): void {
        if (!config) {
            throw new Error('Configuração não fornecida');
        }
        if (config.poolSize < 1) {
            throw new Error(`PoolSize inválido: ${config.poolSize}. Deve ser >= 1`);
        }
        if (config.seed === undefined || config.seed === null) {
            throw new Error('Seed não fornecida');
        }
    }

    /**
     * Valida os itens de entrada
     * 
     * @param items - Itens a serem validados
     * @throws Error se itens forem inválidos
     */
    protected validarItems(items: WeightedItem[]): void {
        if (!items || items.length === 0) {
            throw new Error('Lista de itens vazia');
        }
        
        // Verifica se todos os pesos são válidos
        for (const item of items) {
            if (item.peso < 0 || item.peso > 1) {
                throw new Error(`Peso inválido para número ${item.numero}: ${item.peso}`);
            }
        }
        
        // Verifica se a soma dos pesos é aproximadamente 1
        const soma = items.reduce((acc, item) => acc + item.peso, 0);
        if (Math.abs(soma - 1) > 0.001) {
            console.warn(
                `⚠️ Soma dos pesos é ${soma.toFixed(3)}, esperado 1. ` +
                'Os pesos podem não estar normalizados corretamente.'
            );
        }
    }

    /**
     * Verifica se um número já foi selecionado
     * Método utilitário para subclasses
     */
    protected isSelecionado(numerosSelecionados: Set<number>, numero: number): boolean {
        return numerosSelecionados.has(numero);
    }

    /**
     * Adiciona número ao conjunto de selecionados
     * Método utilitário para subclasses
     */
    protected adicionarSelecionado(
        selecionados: Set<number>,
        numero: number
    ): Set<number> {
        selecionados.add(numero);
        return selecionados;
    }

    /**
     * Converte Set para array ordenado
     * Método utilitário para subclasses
     */
    protected paraArrayOrdenado(selecionados: Set<number>): number[] {
        return Array.from(selecionados).sort((a, b) => a - b);
    }

    /**
     * Gera uma seed derivada para operações internas
     * Método utilitário para subclasses
     */
    protected derivarSeed(seedBase: number, offset: number): number {
        return seedBase + offset * 1000 + Math.floor(Math.random() * 100);
    }
}

// ============================================
// SEÇÃO 4: EXPORTS
// ============================================

// Exportação principal da interface
export type { SelectionStrategy as ISelectionStrategy };

// Exportação da implementação abstrata
export { SelectionStrategy as AbstractSelectionStrategy };

// Exportação de tipos utilitários
export type {
    ScoreItem as IScoreItem,
    WeightedItem as IWeightedItem,
    SelectionConfig as ISelectionConfig
};
