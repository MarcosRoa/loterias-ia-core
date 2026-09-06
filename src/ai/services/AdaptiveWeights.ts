// ============================================
// CAMINHO: src/ai/services/AdaptiveWeights.ts 06/09/2026
// RESPONSABILIDADE: carregar pesos adaptativos aprovados para produção
// ============================================

import fs from 'fs';
import path from 'path';
import type { PredictiveScoringWeights } from './PredictiveScoring';

interface AdaptiveWeightsLotteryConfig {
    pesos: PredictiveScoringWeights;
    calibracao?: {
        minTreino?: number;
        passo?: number;
        recentWindow?: number;
        topPatternsCount?: number;
        numbersPerPattern?: number;
        holdoutPercentual?: number;
    };
}

interface AdaptiveWeightsFile {
    version: string;
    updatedAt: string;
    [loteria: string]: string | AdaptiveWeightsLotteryConfig;
}

export class AdaptiveWeights {

    private static cache: AdaptiveWeightsFile | null = null;

    private static carregarArquivo(): AdaptiveWeightsFile {
        if (this.cache) {
            return this.cache;
        }

        const filePath = path.join(
            process.cwd(),
            'src',
            'ai',
            'config',
            'adaptive-weights.json'
        );

        if (!fs.existsSync(filePath)) {
            throw new Error(
                `[AdaptiveWeights] Arquivo de pesos não encontrado: ${filePath}`
            );
        }

        let conteudo: string;

        try {
            conteudo = fs.readFileSync(filePath, 'utf-8');
        } catch (error) {
            throw new Error(
                `[AdaptiveWeights] Não foi possível ler o arquivo de pesos: ` +
                `${error instanceof Error ? error.message : String(error)}`
            );
        }

        let arquivo: AdaptiveWeightsFile;

        try {
            arquivo = JSON.parse(conteudo) as AdaptiveWeightsFile;
        } catch (error) {
            throw new Error(
                `[AdaptiveWeights] JSON de pesos inválido: ` +
                `${error instanceof Error ? error.message : String(error)}`
            );
        }

        if (!arquivo.version || typeof arquivo.version !== 'string') {
            throw new Error(
                '[AdaptiveWeights] Campo "version" ausente ou inválido.'
            );
        }

        if (!arquivo.updatedAt || typeof arquivo.updatedAt !== 'string') {
            throw new Error(
                '[AdaptiveWeights] Campo "updatedAt" ausente ou inválido.'
            );
        }

        this.cache = arquivo;
        return arquivo;
    }

    static getPesos(loteria: string): PredictiveScoringWeights {
        if (!loteria || typeof loteria !== 'string') {
            throw new Error(
                '[AdaptiveWeights] Loteria inválida ao carregar pesos.'
            );
        }

        const arquivo = this.carregarArquivo();
        const configuracao = arquivo[loteria];

        if (
            !configuracao ||
            typeof configuracao !== 'object' ||
            !('pesos' in configuracao)
        ) {
            throw new Error(
                `[AdaptiveWeights] Pesos adaptativos não calibrados para a loteria "${loteria}".`
            );
        }

        const pesos = configuracao.pesos;

        if (!pesos || typeof pesos !== 'object') {
            throw new Error(
                `[AdaptiveWeights] Estrutura de pesos inválida para "${loteria}".`
            );
        }

        const entradas = Object.entries(pesos);

        if (entradas.length === 0) {
            throw new Error(
                `[AdaptiveWeights] Nenhum peso configurado para "${loteria}".`
            );
        }

        for (const [fator, valor] of entradas) {
            if (!Number.isFinite(valor) || valor < 0) {
                throw new Error(
                    `[AdaptiveWeights] Peso inválido para "${loteria}.${fator}": ${valor}`
                );
            }
        }

        const soma = entradas.reduce(
            (total, [, valor]) => total + valor,
            0
        );

        if (!Number.isFinite(soma) || soma <= 0) {
            throw new Error(
                `[AdaptiveWeights] Soma dos pesos inválida para "${loteria}": ${soma}`
            );
        }

        return { ...pesos };
    }

    static getVersao(): string {
        return this.carregarArquivo().version;
    }

    static getDataAtualizacao(): string {
        return this.carregarArquivo().updatedAt;
    }

    static limparCache(): void {
        this.cache = null;
    }
}

export default AdaptiveWeights;
