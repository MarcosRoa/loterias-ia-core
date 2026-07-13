// ============================================
// CAMINHO: src/statistics/utils/Normalizer.ts
// ============================================
// NORMALIZADOR DE DADOS - FILTROS
// ============================================

export class Normalizer {
    filterByPeriod(dados: number[][], datas: string[], period: string): { dadosFiltrados: number[][]; datasFiltradas: string[] } {
        if (period === 'all' || dados.length === 0) {
            return { dadosFiltrados: dados, datasFiltradas: datas };
        }

        const anos = parseInt(period);
        if (isNaN(anos)) {
            return { dadosFiltrados: dados, datasFiltradas: datas };
        }

        let ultimaData: Date | null = null;
        for (let i = datas.length - 1; i >= 0; i--) {
            const dataStr = datas[i];
            if (dataStr) {
                const partes = dataStr.split('/');
                if (partes.length === 3) {
                    const data = new Date(parseInt(partes[2]), parseInt(partes[1]) - 1, parseInt(partes[0]));
                    if (!isNaN(data.getTime())) {
                        ultimaData = data;
                        break;
                    }
                }
            }
        }

        if (!ultimaData) {
            return { dadosFiltrados: dados, datasFiltradas: datas };
        }

        const dataCorte = new Date(ultimaData.getFullYear() - anos, ultimaData.getMonth(), ultimaData.getDate());
        const dadosFiltrados: number[][] = [];
        const datasFiltradas: string[] = [];

        for (let i = 0; i < dados.length; i++) {
            const dataStr = datas[i];
            if (dataStr) {
                const partes = dataStr.split('/');
                if (partes.length === 3) {
                    const data = new Date(parseInt(partes[2]), parseInt(partes[1]) - 1, parseInt(partes[0]));
                    if (data >= dataCorte) {
                        dadosFiltrados.push(dados[i]);
                        datasFiltradas.push(datas[i]);
                    }
                }
            }
        }

        return { dadosFiltrados, datasFiltradas };
    }
}
