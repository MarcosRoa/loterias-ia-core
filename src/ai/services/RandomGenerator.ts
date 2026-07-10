// ============================================
// CAMINHO: src/ai/services/RandomGenerator.ts
// ============================================
// Gerador de números aleatórios com seed (Mulberry32)
// ============================================

export class RandomGenerator {
    private seed: number;

    constructor(seed: number = 0) {
        this.seed = seed;
    }

    next(seed?: number): number {
        if (seed !== undefined) {
            this.seed = seed;
        }

        let z = (this.seed += 0x6D2B79F5);
        z = Math.imul(z ^ (z >>> 15), z | 1);
        z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
        return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
    }

    nextInt(min: number, max: number, seed?: number): number {
        return Math.floor(this.next(seed) * (max - min + 1)) + min;
    }

    nextFloat(min: number, max: number, seed?: number): number {
        return this.next(seed) * (max - min) + min;
    }

    nextArray(quantidade: number, min: number, max: number, seed?: number): number[] {
        const result: number[] = [];
        for (let i = 0; i < quantidade; i++) {
            result.push(this.nextInt(min, max, seed !== undefined ? seed + i : undefined));
        }
        return result;
    }

    nextUnique(quantidade: number, min: number, max: number, seed?: number): Set<number> {
        const result = new Set<number>();
        let tentativas = 0;
        while (result.size < quantidade && tentativas < 1000) {
            const num = this.nextInt(min, max, seed !== undefined ? seed + tentativas : undefined);
            result.add(num);
            tentativas++;
        }
        return result;
    }

    nextUniqueSorted(quantidade: number, min: number, max: number, seed?: number): number[] {
        const result = this.nextUnique(quantidade, min, max, seed);
        return Array.from(result).sort((a, b) => a - b);
    }

    reset(seed: number): void {
        this.seed = seed;
    }

    getSeed(): number {
        return this.seed;
    }
}
