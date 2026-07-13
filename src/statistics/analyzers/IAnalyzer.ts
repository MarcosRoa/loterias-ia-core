// ============================================
// CAMINHO: src/statistics/analyzers/IAnalyzer.ts
// ============================================
// INTERFACE PADRÃO PARA TODOS OS ANALISADORES
// ============================================

export interface IAnalyzer<T> {
    analyze(data: number[][]): T;
}
