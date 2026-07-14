// ============================================
// CAMINHO: src/statistics/parsers/BaseParser.ts
// ============================================
// CLASSE BASE PARA TODOS OS PARSERS
// ============================================

export interface ParseResult {
    dados: number[][];
    datas: string[];
    dadosExtras?: any[];
}

export abstract class BaseParser {
    protected config: {
        maxNumero: number;
        incluirZero: boolean;
        numerosPadrao: number;
        manterOrdem?: boolean; // ← SUPER SETE usa true
    };

    constructor(config: any) {
        this.config = config;
    }

    abstract parse(texto: string): ParseResult;

    // ============================================
    // UTILITÁRIOS COMUNS
    // ============================================

    protected isDataValida(str: string): boolean {
        return /^\d{2}\/\d{2}\/\d{4}$/.test(str) || /^\d{4}-\d{2}-\d{2}$/.test(str);
    }

    protected parseData(str: string): string | null {
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str;
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
            const [a, m, d] = str.split('-');
            return `${d}/${m}/${a}`;
        }
        return null;
    }

    protected detectarSeparador(linhas: string[]): string {
        return linhas[0]?.includes(';') ? ';' : ',';
    }

    protected limparColunas(colunas: string[]): string[] {
        while (colunas.length > 0 && (colunas[colunas.length - 1].trim() === '' || colunas[colunas.length - 1].trim().includes(';'))) {
            colunas.pop();
        }
        return colunas;
    }

    protected extrairData(colunas: string[]): { data: string | null; dataIndex: number } {
        for (let j = 0; j < colunas.length; j++) {
            const valor = colunas[j].trim();
            if (this.isDataValida(valor)) {
                return { data: this.parseData(valor), dataIndex: j };
            }
        }
        return { data: null, dataIndex: -1 };
    }
}
