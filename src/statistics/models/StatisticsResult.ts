// ============================================
// CAMINHO: src/statistics/models/StatisticsResult.ts
// ============================================
// TIPOS PARA RESULTADOS DE ESTATÍSTICAS (CORRIGIDO)
// ============================================

export interface StatisticsResult {
    success: boolean;
    error?: string;
    totalDraws?: number;
    filteredDraws?: number;
    dataInicio?: string;
    dataFim?: string;
    
    // Análises principais
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
    
    // ✅ ELEMENTOS EXTRAS (padronizado para todas as loterias)
    elementosExtras?: { nome: string; quantidade: number }[];
    nomeElemento?: string;  // Ex: "Mês de Sorte", "Time do Coração", "Trevo"
    
    // ✅ Específicos por loteria
    timemania?: {
        times: {
            ranking: { nome: string; quantidade: number }[];
            total: number;
        }
    };
    trevos?: {
        frequencia: { trevo: number; quantidade: number; percentual: number }[];
        pares: { par: number[]; quantidade: number }[];
        total: number;
    };
}

export interface LotteryContext {
    dados: number[][];
    datas: string[];
    dadosExtras?: any[];
    config: {
        maxNumero: number;
        incluirZero: boolean;
        numerosPadrao: number;
    };
}
