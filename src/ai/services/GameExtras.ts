// ============================================
// CAMINHO: src/ai/services/GameExtras.ts
// ============================================
// SERVIÇO DE ELEMENTOS EXTRAS - CORRIGIDO
// ============================================

import { RandomGenerator } from './RandomGenerator';

export class GameExtras {
    private random: RandomGenerator;

    constructor(random: RandomGenerator) {
        this.random = random;
    }

    gerarTime(seed: number, dadosTimes?: string[]): string | null {
        if (!dadosTimes || dadosTimes.length === 0) {
            return null;
        }
        
        const freq = new Map<string, number>();
        for (const time of dadosTimes) {
            if (time) {
                freq.set(time, (freq.get(time) || 0) + 1);
            }
        }

        if (freq.size === 0) {
            return null;
        }

        const sorted = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]);
        const total = sorted.reduce((acc, [_, count]) => acc + count, 0);

        let rand = this.random.next(seed);
        let acumulado = 0;
        for (const [time, count] of sorted) {
            acumulado += count / total;
            if (rand <= acumulado) {
                return time;
            }
        }

        return sorted[0]?.[0] || null;
    }

    gerarTrevos(seed: number, dadosTrevos?: { trevos: number[] }[]): number[] {
        if (!dadosTrevos || dadosTrevos.length === 0) {
            return [];
        }

        const freq = new Array(7).fill(0);
        let total = 0;
        
        for (const item of dadosTrevos) {
            if (item && item.trevos && Array.isArray(item.trevos)) {
                for (const t of item.trevos) {
                    if (t >= 1 && t <= 6) {
                        freq[t]++;
                        total++;
                    }
                }
            }
        }

        if (total === 0) {
            return [];
        }

        const trevos = new Set<number>();
        let tentativas = 0;
        const maxTentativas = 100;

        while (trevos.size < 2 && tentativas < maxTentativas) {
            tentativas++;
            let rand = this.random.next(seed + trevos.size + tentativas);
            let acumulado = 0;
            for (let i = 1; i <= 6; i++) {
                acumulado += freq[i] / total;
                if (rand <= acumulado && !trevos.has(i)) {
                    trevos.add(i);
                    break;
                }
            }
        }

        while (trevos.size < 2) {
            const num = Math.floor(this.random.next(seed + trevos.size + 100) * 6) + 1;
            trevos.add(num);
        }

        return Array.from(trevos).sort((a, b) => a - b);
    }

    gerarMes(seed: number, dadosMeses?: number[]): number | null {
        if (!dadosMeses || dadosMeses.length === 0) {
            return null;
        }

        const freq = new Array(13).fill(0);
        let total = 0;
        
        for (const mes of dadosMeses) {
            if (mes >= 1 && mes <= 12) {
                freq[mes]++;
                total++;
            }
        }

        if (total === 0) {
            return null;
        }

        let rand = this.random.next(seed);
        let acumulado = 0;
        for (let i = 1; i <= 12; i++) {
            acumulado += freq[i] / total;
            if (rand <= acumulado) {
                return i;
            }
        }

        let maxFreq = 0;
        let maxMes = 1;
        for (let i = 1; i <= 12; i++) {
            if (freq[i] > maxFreq) {
                maxFreq = freq[i];
                maxMes = i;
            }
        }
        return maxMes;
    }

    gerarSuperSete(seed: number): number[][] {
        const colunas: number[][] = [];
        for (let c = 0; c < 7; c++) {
            const num = Math.floor(this.random.next(seed + c) * 10);
            colunas.push([num]);
        }
        return colunas;
    }

    gerarLoteca(seed: number): string[] {
        const opcoes = ['1', 'X', '2'];
        const resultados: string[] = [];
        for (let i = 0; i < 14; i++) {
            const idx = Math.floor(this.random.next(seed + i) * 3);
            resultados.push(opcoes[idx]);
        }
        return resultados;
    }
}
