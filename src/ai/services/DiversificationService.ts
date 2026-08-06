// ============================================
// CAMINHO: src/ai/services/DiversificationService.ts
// DATA CRIAÇÃO: 2026-01-20
// STATUS: ⏳ PENDENTE APROVAÇÃO
// VERSÃO: 2.0.0 (VERSÃO REVISADA)
// ============================================
// 
// SEÇÃO 1: IMPORTS
// SEÇÃO 2: INTERFACES E TIPOS
// SEÇÃO 3: CONFIGURAÇÃO DE DIVERSIFICAÇÃO
// SEÇÃO 4: DIVERSIFICATION SERVICE
// SEÇÃO 5: EXPORTS
// ============================================

// ============================================
// SEÇÃO 1: IMPORTS
// ============================================

// Nenhum import necessário - serviço puramente funcional
// Não conhece WeightedItem, SelectionStrategy ou outras camadas

// ============================================
// SEÇÃO 2: INTERFACES E TIPOS
// ============================================

/**
 * Configuração para diversificação
 */
export interface DiversificationConfig {
    /** Limite máximo de similaridade (0-1) */
    similarityThreshold?: number;
    /** Número máximo de tentativas para diversificar */
    maxAttempts?: number;
    /** Quantos números trocar por vez */
    swapCount?: number;
}

/**
 * Resultado da diversificação
 */
export interface DiversificationResult {
    /** Números diversificados */
    numeros: number[];
    /** Número de tentativas realizadas */
    attempts: number;
    /** Se foi diversificado com sucesso */
    diversified: boolean;
    /** Quantos números foram trocados */
    swapped: number;
}

/**
 * Item com score para substituição inteligente
 */
export interface ScoreItem {
    numero: number;
    score: number;
}

// ============================================
// SEÇÃO 3: CONFIGURAÇÃO DE DIVERSIFICAÇÃO
// ============================================

/**
 * Configurações padrão para diversificação
 */
const DEFAULT_CONFIG: Required<DiversificationConfig> = {
    similarityThreshold: 0.8,  // 80% de similaridade = muito parecido
    maxAttempts: 10,           // Máximo de 10 tentativas
    swapCount: 2               // Troca 2 números por vez
};

// ============================================
// SEÇÃO 4: DIVERSIFICATION SERVICE
// ============================================

/**
 * Serviço de diversificação de jogos
 * 
 * Responsabilidade:
 * - Comparar novos números com jogos já gerados na mesma chamada
 * - Evitar duplicação exata ou muito similar
 * - Preservar ao máximo a qualidade estatística
 * - Serviço STATELESS - não mantém estado interno
 * 
 * O que NÃO faz:
 * - Não mantém estado entre chamadas
 * - Não conhece loterias ou estratégias
 * - Não influencia no score dos números
 * 
 * Fluxo:
 * 1. Recebe jogos já gerados e novos números
 * 2. Verifica similaridade com jogos existentes
 * 3. Se muito similar, tenta trocar números aleatórios
 * 4. Mantém o máximo da estrutura original
 * 5. Retorna números diversificados
 * 
 * @example
 * ```typescript
 * const diversifier = new DiversificationService();
 * 
 * // Jogos já gerados na mesma chamada
 * const jogosExistentes = [
 *   [4, 17, 23, 31, 45, 52],
 *   [8, 14, 27, 33, 41, 58]
 * ];
 * 
 * // Novo jogo potencialmente similar
 * const novosNumeros = [4, 17, 23, 31, 46, 53];
 * 
 * // Pool de números disponíveis com scores
 * const pool = [
 *   { numero: 4, score: 0.95 },
 *   { numero: 17, score: 0.87 },
 *   // ...
 * ];
 * 
 * // Diversifica
 * const diversificado = diversifier.diversificar(
 *   jogosExistentes,
 *   novosNumeros,
 *   12345,
 *   pool
 * );
 * // Retorna: [4, 17, 23, 28, 46, 53] (trocou 31 por 28)
 * ```
 */
export class DiversificationService {
    /**
     * Configuração atual (imutável)
     */
    private readonly config: Required<DiversificationConfig>;

    constructor(config?: DiversificationConfig) {
        this.config = {
            ...DEFAULT_CONFIG,
            ...config
        };
    }

    /**
     * Diversifica um jogo para evitar similaridade com jogos existentes
     * 
     * @param jogosExistentes - Jogos já gerados na mesma chamada
     * @param novosNumeros - Números a serem diversificados
     * @param seed - Semente para randomização
     * @param poolScores - Pool de números disponíveis com scores (opcional)
     * @returns Números diversificados
     */
    diversificar(
        jogosExistentes: number[][],
        novosNumeros: number[],
        seed: number,
        poolScores?: ScoreItem[]
    ): number[] {
        // ============================================
        // SEÇÃO: VALIDAÇÕES
        // ============================================
        if (!novosNumeros || novosNumeros.length === 0) {
            return novosNumeros;
        }

        // Se não há jogos existentes, retorna os números originais
        if (!jogosExistentes || jogosExistentes.length === 0) {
            return novosNumeros;
        }

        // Se não tem pool, não pode diversificar
        if (!poolScores || poolScores.length === 0) {
            return novosNumeros;
        }

        // ============================================
        // SEÇÃO: VERIFICAR SIMILARIDADE
        // ============================================
        let resultado = [...novosNumeros];
        let diversificado = false;
        let attempts = 0;

        while (attempts < this.config.maxAttempts) {
            const similar = this.verificarSimilaridade(jogosExistentes, resultado);
            
            if (!similar) {
                diversificado = true;
                break;
            }

            // Tenta diversificar trocando números
            resultado = this.trocarNumerosInteligente(
                resultado,
                poolScores,
                seed + attempts
            );
            
            attempts++;
        }

        return resultado;
    }

    /**
     * Diversifica com metadados (para debug)
     */
    diversificarComMetadata(
        jogosExistentes: number[][],
        novosNumeros: number[],
        seed: number,
        poolScores?: ScoreItem[]
    ): DiversificationResult {
        const numerosOriginais = [...novosNumeros];
        
        const numeros = this.diversificar(
            jogosExistentes,
            novosNumeros,
            seed,
            poolScores
        );

        const swapped = numerosOriginais.filter(
            (n, i) => n !== numeros[i]
        ).length;

        // Determina se foi diversificado
        const diversified = swapped > 0;

        // Calcula tentativas baseado na quantidade de trocas
        // Se houve troca, pelo menos 1 tentativa foi feita
        const attempts = diversified ? 1 : 0;

        return {
            numeros,
            attempts,
            diversified,
            swapped
        };
    }

    /**
     * Verifica se um jogo é muito similar aos existentes
     * 
     * @param jogosExistentes - Jogos já gerados
     * @param numeros - Números a verificar
     * @returns True se for muito similar
     */
    private verificarSimilaridade(
        jogosExistentes: number[][],
        numeros: number[]
    ): boolean {
        const setNumeros = new Set(numeros);
        
        for (const jogo of jogosExistentes) {
            const intersection = jogo.filter(n => setNumeros.has(n)).length;
            const similarity = intersection / numeros.length;
            
            if (similarity >= this.config.similarityThreshold) {
                return true; // Similar demais
            }
        }
        
        return false; // Suficientemente diferente
    }

    /**
     * Troca números de forma inteligente, preservando qualidade
     * 
     * @param numeros - Números atuais
     * @param poolScores - Pool de números disponíveis com scores
     * @param seed - Semente para randomização
     * @returns Novos números com trocas inteligentes
     */
    private trocarNumerosInteligente(
        numeros: number[],
        poolScores: ScoreItem[],
        seed: number
    ): number[] {
        const resultado = [...numeros];
        const random = this.criarPRNG(seed);
        
        // Filtra números disponíveis que não estão no jogo
        const numerosAtuais = new Set(numeros);
        const disponiveis = poolScores
            .filter(item => !numerosAtuais.has(item.numero))
            .sort((a, b) => b.score - a.score); // Ordena por score (melhores primeiro)

        // Se não há números disponíveis, retorna o original
        if (disponiveis.length === 0) {
            return resultado;
        }

        // Determina quantos números trocar
        const trocar = Math.min(
            this.config.swapCount,
            resultado.length,
            disponiveis.length
        );
        
        // Seleciona índices aleatórios para trocar
        const indices = this.selecionarIndicesAleatorios(
            resultado.length,
            trocar,
            random
        );

        // Seleciona números disponíveis entre os melhores (Top 50%)
        const melhoresDisponiveis = disponiveis.slice(0, Math.ceil(disponiveis.length / 2));
        const numerosParaTrocar = this.selecionarNumerosAleatorios(
            melhoresDisponiveis.map(item => item.numero),
            trocar,
            random
        );

        // Realiza as trocas
        for (let i = 0; i < indices.length && i < numerosParaTrocar.length; i++) {
            resultado[indices[i]] = numerosParaTrocar[i];
        }

        // Ordena para manter consistência
        return resultado.sort((a, b) => a - b);
    }

    /**
     * Seleciona índices aleatórios sem repetição
     */
    private selecionarIndicesAleatorios(
        total: number,
        quantidade: number,
        random: () => number
    ): number[] {
        const indices: number[] = [];
        const disponiveis = Array.from({ length: total }, (_, i) => i);
        
        for (let i = 0; i < quantidade && disponiveis.length > 0; i++) {
            const idx = Math.floor(random() * disponiveis.length);
            indices.push(disponiveis[idx]);
            disponiveis.splice(idx, 1);
        }
        
        return indices;
    }

    /**
     * Seleciona números aleatórios sem repetição
     */
    private selecionarNumerosAleatorios(
        disponiveis: number[],
        quantidade: number,
        random: () => number
    ): number[] {
        const selecionados: number[] = [];
        const copia = [...disponiveis];
        
        for (let i = 0; i < quantidade && copia.length > 0; i++) {
            const idx = Math.floor(random() * copia.length);
            selecionados.push(copia[idx]);
            copia.splice(idx, 1);
        }
        
        return selecionados;
    }

    /**
     * Cria um gerador de números pseudo-aleatórios
     * (Mulberry32 - mesma implementação consistente)
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

    /**
     * Obtém a configuração atual (readonly)
     */
    getConfig(): Required<DiversificationConfig> {
        return { ...this.config };
    }

    /**
     * Cria uma nova instância com configuração atualizada
     * (Mantém o serviço imutável)
     */
    withConfig(config: Partial<DiversificationConfig>): DiversificationService {
        return new DiversificationService({
            ...this.config,
            ...config
        });
    }
}

// ============================================
// SEÇÃO 5: EXPORTS
// ============================================

export { DiversificationService };
export type { DiversificationConfig, DiversificationResult, ScoreItem };

// Exportação padrão para facilitar importação
export default DiversificationService;
