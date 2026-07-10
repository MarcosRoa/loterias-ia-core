// ============================================
// CAMINHO: src/ai/services/CacheManager.ts
// ============================================
// Gerenciador de cache para estatísticas
// ============================================

import { StatisticsContext } from './StatisticsContext';

interface CacheEntry {
    context: StatisticsContext;
    timestamp: number;
    lastAccess: number;
}

export class CacheManager {
    private cache: Map<string, CacheEntry> = new Map();
    private maxAge: number = 3600000;

    getContext(lottery: string, dados: number[][]): StatisticsContext {
        const key = this.generateKey(lottery, dados);
        
        if (this.cache.has(key)) {
            const entry = this.cache.get(key)!;
            entry.lastAccess = Date.now();
            
            if (Date.now() - entry.timestamp < this.maxAge) {
                return entry.context;
            } else {
                this.cache.delete(key);
            }
        }

        const context = new StatisticsContext(dados);
        
        this.cache.set(key, {
            context,
            timestamp: Date.now(),
            lastAccess: Date.now()
        });

        return context;
    }

    private generateKey(lottery: string, dados: number[][]): string {
        const dataHash = this.hashDados(dados);
        return `${lottery}-${dataHash}`;
    }

    private hashDados(dados: number[][]): string {
        let hash = 0;
        for (const jogo of dados) {
            for (const num of jogo) {
                hash = ((hash << 5) - hash) + num;
                hash = hash & hash;
            }
        }
        return hash.toString(36);
    }

    clear(): void {
        this.cache.clear();
        console.log('🧹 Cache limpo');
    }

    cleanup(): void {
        const now = Date.now();
        let removed = 0;
        for (const [key, entry] of this.cache) {
            if (now - entry.lastAccess > this.maxAge * 2) {
                this.cache.delete(key);
                removed++;
            }
        }
        if (removed > 0) {
            console.log(`🧹 ${removed} entradas removidas do cache`);
        }
    }

    setMaxAge(ms: number): void {
        this.maxAge = ms;
    }

    getStats(): { size: number; keys: string[] } {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

export const cacheManager = new CacheManager();
