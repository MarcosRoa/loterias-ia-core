// ============================================
// CAMINHO: src/ai/types.ts
// DATA CRIAÇÃO: 2026-01-20
// STATUS: ✅ IMPLANTADO
// VERSÃO: 1.0.0
// ============================================
// 
// SEÇÃO 1: TIPOS COMPARTILHADOS
// SEÇÃO 2: EXPORTS
// ============================================

// ============================================
// SEÇÃO 1: TIPOS COMPARTILHADOS
// ============================================

/**
 * Item com score (entrada das engines)
 */
export interface ScoreItem {
    numero: number;
    score: number;
}

/**
 * Item com peso normalizado (soma = 1)
 */
export interface WeightedItem {
    numero: number;
    peso: number;
}

// ============================================
// SEÇÃO 2: EXPORTS
// ============================================

export type { ScoreItem as IScoreItem, WeightedItem as IWeightedItem };
