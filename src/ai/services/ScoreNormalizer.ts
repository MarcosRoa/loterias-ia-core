// ============================================
// CAMINHO: src/ai/services/ScoreNormalizer.ts
// DATA CRIAÇÃO: 2026-01-20
// STATUS: ⏳ PENDENTE APROVAÇÃO
// VERSÃO: 2.0.0 (VERSÃO SIMPLIFICADA)
// ============================================
// 
// SEÇÃO 1: IMPORTS
// SEÇÃO 2: INTERFACES E TIPOS
// SEÇÃO 3: SCORE NORMALIZER SERVICE
// SEÇÃO 4: EXPORTS
// ============================================

// ============================================
// SEÇÃO 1: IMPORTS
// ============================================

import { ScoreItem, WeightedItem } from '../strategies/SelectionStrategy';

// ============================================
// SEÇÃO 2: INTERFACES E TIPOS
// ============================================

/**
 * Resultado da normalização com metadados
 */
export interface NormalizationResult {
    /** Itens normalizados com pesos (soma = 1) */
    items: WeightedItem[];
    /** Score máximo antes da normalização */
    maxScore: number;
    /** Score mínimo antes da normalização */
    minScore: number;
    /** Soma dos pesos (deve ser 1) */
    somaPesos: number;
    /** Total de itens processados */
    totalItens: number;
}

// ============================================
// SEÇÃO 3: SCORE NORMALIZER SERVICE
// ============================================

/**
 * Serviço de normalização de scores para pesos
 * 
 * Responsabilidade ÚNICA:
 * - Receber ScoreItem[] (scores já calculados pelas engines)
 * - Normalizar para soma = 1
 * - Retornar WeightedItem[] (pesos normalizados)
 * 
 * A classe NÃO conhece:
 * - Como os scores foram calculados
 * - Tipos de análise (hybrid, statistical, etc)
 * - Loterias (Mega, Lotofácil, etc)
 * - Estratégias de seleção
 * 
 * O que ela faz:
 * 1. Recebe scores (ex: 23 -> 0.83, 17 -> 0.61, 45 -> 0.22)
 * 2. Normaliza para 0-1
 * 3. Adiciona epsilon para evitar zeros
 * 4. Garante soma = 1
 * 5. Retorna pesos (ex: 23 -> 0.18, 17 -> 0.13, 45 -> 0.04)
 * 
 * @example
 * ```typescript
 * const normalizer = new ScoreNormalizer();
 * 
 * // Scores já calculados pela engine
 * const scores: ScoreItem[] = [
 *   { numero: 23, score: 0.85 },
 *   { numero: 17, score: 0.72 },
 *   { numero: 45, score: 0.91 },
 *   // ...
 * ];
 * 
 * // Normaliza para pesos (soma = 1)
 * const pesos = normalizer.normalizar(scores);
 * // Retorna: [
 * //   { numero: 23, peso: 0.15 },
 * //   { numero: 17, peso: 0.12 },
 * //   { numero: 45, peso: 0.18 },
 * //   // ... soma = 1
 * // ]
 * ```
 */
export class ScoreNormalizer {
    /**
     * Fator de suavização para evitar pesos zero
     * Garante que todo número tenha pelo menos uma chance mínima
     */
    private readonly EPSILON = 0.001;

    /**
     * Normaliza scores para pesos (soma = 1)
     * 
     * @param scores - Lista de scores (já calculados pela engine)
     * @returns Itens com pesos normalizados (soma = 1)
     * 
     * @throws Error se a lista de scores estiver vazia
     */
    normalizar(scores: ScoreItem[]): WeightedItem[] {
        // ============================================
        // SEÇÃO: VALIDAÇÕES
        // ============================================
        if (!scores || scores.length === 0) {
            throw new Error('Lista de scores vazia');
        }

        // ============================================
        // SEÇÃO: NORMALIZAR PARA 0-1
        // ============================================
        const normalizados = this.normalizarParaZeroUm(scores);

        // ============================================
        // SEÇÃO: CONVERTER PARA PESOS (SOMA = 1)
        // ============================================
        return this.converterParaPesos(normalizados);
    }

    /**
     * Normaliza com metadados (para debug)
     * 
     * @param scores - Lista de scores
     * @returns Resultado com metadados
     */
    normalizarComMetadata(scores: ScoreItem[]): NormalizationResult {
        const items = this.normalizar(scores);
        
        // Calcula métricas
        const scoresOriginais = scores.map(s => s.score);
        const maxScore = Math.max(...scoresOriginais);
        const minScore = Math.min(...scoresOriginais);
        const somaPesos = items.reduce((acc, item) => acc + item.peso, 0);

        return {
            items,
            maxScore,
            minScore,
            somaPesos,
            totalItens: items.length
        };
    }

    /**
     * Normaliza scores para o intervalo [0, 1]
     * 
     * @param scores - Scores originais
     * @returns Scores normalizados [0, 1]
     */
    private normalizarParaZeroUm(scores: ScoreItem[]): ScoreItem[] {
        if (scores.length === 0) {
            return [];
        }

        // Encontra min e max
        const minScore = Math.min(...scores.map(s => s.score));
        const maxScore = Math.max(...scores.map(s => s.score));
        
        // Se todos os scores são iguais, retorna todos com 1
        if (maxScore === minScore) {
            return scores.map(item => ({
                ...item,
                score: 1
            }));
        }

        // Range para normalização
        const range = maxScore - minScore;

        // Normaliza para [0, 1]
        return scores.map(item => ({
            numero: item.numero,
            score: (item.score - minScore) / range
        }));
    }

    /**
     * Converte scores normalizados para pesos (soma = 1)
     * 
     * @param scores - Scores já normalizados [0, 1]
     * @returns Pesos (soma = 1)
     */
    private converterParaPesos(scores: ScoreItem[]): WeightedItem[] {
        if (scores.length === 0) {
            return [];
        }

        // ============================================
        // PASSO 1: Adicionar epsilon para evitar zeros
        // ============================================
        const comEpsilon = scores.map(item => ({
            numero: item.numero,
            peso: item.score + this.EPSILON
        }));

        // ============================================
        // PASSO 2: Calcular soma dos pesos
        // ============================================
        const soma = comEpsilon.reduce((acc, item) => acc + item.peso, 0);

        // ============================================
        // PASSO 3: Normalizar para soma = 1
        // ============================================
        return comEpsilon.map(item => ({
            numero: item.numero,
            peso: item.peso / soma
        }));
    }

    /**
     * Verifica se os pesos estão normalizados (soma = 1)
     * 
     * @param items - Itens com pesos
     * @param tolerancia - Tolerância para erro de arredondamento
     * @returns True se normalizado
     */
    isNormalizado(items: WeightedItem[], tolerancia: number = 0.001): boolean {
        if (!items || items.length === 0) {
            return false;
        }

        const soma = items.reduce((acc, item) => acc + item.peso, 0);
        return Math.abs(soma - 1) <= tolerancia;
    }

    /**
     * Obtém o epsilon atual
     */
    getEpsilon(): number {
        return this.EPSILON;
    }

    /**
     * Cria uma nova instância com epsilon personalizado
     */
    withEpsilon(epsilon: number): ScoreNormalizer {
        if (epsilon < 0) {
            throw new Error('Epsilon deve ser >= 0');
        }
        // Cria nova instância com epsilon personalizado
        const clone = new ScoreNormalizer();
        // Usa reflection para alterar o epsilon
        (clone as any).EPSILON = epsilon;
        return clone;
    }
}

// ============================================
// SEÇÃO 4: EXPORTS
// ============================================

export { ScoreNormalizer };
export type { NormalizationResult };

// Exportação padrão para facilitar importação
export default ScoreNormalizer;
