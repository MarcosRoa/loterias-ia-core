// ============================================
// CAMINHO: src/statistics/models/StatisticsResult.ts
// ============================================
// TIPOS PARA RESULTADOS DE ESTATÍSTICAS
// ============================================

export interface StatisticsResult {
    success: boolean;
    totalDraws?: number;
    filteredDraws?: number;
    dataInicio?: string;
    dataFim?: string;
    maisSorteados?: { numero: number; quantidade: number }[];
    menosSorteados?: { numero: number; quantidade: number }[];
    duplas?: { dupla: number[]; quantidade: number }[];
    triplas?: { tripla: number[]; quantidade: number }[];
    atraso?: { numero: number; atraso: number }[];
    tendencia?: { numero: number; quantidade: number }[];
    entropia?: number;
    distribuicao?: { faixa: string; quantidade: number; percentual: number }[];
    grupos?: { grupo: string; quantidade: number; percentual: number }[];
    paridade?: { pares: number; impares: number; quantidade: number }[];
    sequencias?: { inicio: number; fim: number; quantidade: number }[];
    columns?: number[][];
    // ✅ ADICIONAR PROPRIEDADES EXTRAS
    elementosExtras?: { nome: string; quantidade: number }[];
    timemania?: any;
    trevos?: any;
    error?: string;
}

export interface LotteryContext {
    dados: number[][];
    datas: string[];
    dadosExtras?: any[];  // ✅ ADICIONAR dadosExtras
    config: {
        maxNumero: number;
        incluirZero: boolean;
        numerosPadrao: number;
    };
}
