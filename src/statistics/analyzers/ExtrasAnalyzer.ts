// ============================================
// CAMINHO: src/statistics/analyzers/ExtrasAnalyzer.ts
// ============================================
// ANALISADOR DE ELEMENTOS EXTRAS (TIMES, TREVOS, MESES)
// ============================================

export class ExtrasAnalyzer {
    analyze(lottery: string, dados: number[][], dadosExtras: any[]): any {
        if (lottery === 'timemania') {
            return this.analyzeTimemania(dadosExtras);
        }
        
        if (lottery === 'milionaria') {
            return this.analyzeMilionaria(dadosExtras);
        }
        
        if (lottery === 'diadesorte') {
            return this.analyzeDiadesorte(dadosExtras);
        }
        
        return {};
    }

    private analyzeTimemania(dadosExtras: any[]): any {
        if (!dadosExtras || dadosExtras.length === 0) {
            return {};
        }

        // Extrair times
        const times = dadosExtras.filter(t => t !== null && t !== undefined);
        
        // Calcular frequência dos times
        const freq = new Map<string, number>();
        times.forEach(time => {
            if (typeof time === 'string') {
                freq.set(time, (freq.get(time) || 0) + 1);
            }
        });

        const ranking = Array.from(freq.entries())
            .map(([time, quantidade]) => ({ time, quantidade }))
            .sort((a, b) => b.quantidade - a.quantidade)
            .slice(0, 10);

        return {
            times: {
                ranking,
                total: times.length
            }
        };
    }

    private analyzeMilionaria(dadosExtras: any[]): any {
        if (!dadosExtras || dadosExtras.length === 0) {
            return {};
        }

        // Extrair trevos
        const trevos: number[] = [];
        dadosExtras.forEach(item => {
            if (item && typeof item === 'object' && item.trevos) {
                if (Array.isArray(item.trevos)) {
                    trevos.push(...item.trevos);
                }
            }
        });

        if (trevos.length === 0) {
            return {};
        }

        // Calcular frequência dos trevos
        const freq = new Array(7).fill(0);
        trevos.forEach(t => {
            if (t >= 1 && t <= 6) {
                freq[t]++;
            }
        });

        const total = trevos.length;
        const frequencia = freq.map((quantidade, trevo) => ({
            trevo,
            quantidade,
            percentual: total > 0 ? (quantidade / total) * 100 : 0
        })).filter(item => item.trevo >= 1 && item.trevo <= 6);

        // Calcular pares de trevos
        const pares = new Map<string, number>();
        for (let i = 0; i < dadosExtras.length; i++) {
            const item = dadosExtras[i];
            if (item && typeof item === 'object' && item.trevos && Array.isArray(item.trevos) && item.trevos.length === 2) {
                const key = `${Math.min(item.trevos[0], item.trevos[1])}-${Math.max(item.trevos[0], item.trevos[1])}`;
                pares.set(key, (pares.get(key) || 0) + 1);
            }
        }

        const paresRanking = Array.from(pares.entries())
            .map(([key, quantidade]) => {
                const [trevo1, trevo2] = key.split('-').map(Number);
                return { par: [trevo1, trevo2], quantidade };
            })
            .sort((a, b) => b.quantidade - a.quantidade)
            .slice(0, 10);

        return {
            trevos: {
                frequencia,
                pares: paresRanking,
                total: trevos.length
            }
        };
    }

    private analyzeDiadesorte(dadosExtras: any[]): any {
        if (!dadosExtras || dadosExtras.length === 0) {
            return {};
        }

        // Extrair meses
        const meses = dadosExtras.filter(m => m !== null && m !== undefined && typeof m === 'number');
        
        const freq = new Array(13).fill(0);
        meses.forEach(mes => {
            if (mes >= 1 && mes <= 12) {
                freq[mes]++;
            }
        });

        const ranking = freq.map((quantidade, mes) => ({
            mes,
            quantidade
        })).filter(item => item.mes >= 1 && item.mes <= 12)
        .sort((a, b) => b.quantidade - a.quantidade);

        return {
            meses: {
                ranking,
                total: meses.length
            }
        };
    }
}
