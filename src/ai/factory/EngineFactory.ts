// ============================================
// CAMINHO: src/ai/factory/EngineFactory.ts
// ============================================
// Fábrica de motores - CORRIGIDA (ACEITA EXTRAS)
// ============================================

import { BaseEngine, EngineExtras } from '../engines/BaseEngine';
import { StatisticalEngine } from '../engines/StatisticalEngine';
import { HybridEngine } from '../engines/HybridEngine';
import { SpecialistEngine } from '../engines/SpecialistEngine';
import { ProbabilityEngine } from '../engines/ProbabilityEngine';
import { SmartRandomEngine } from '../engines/SmartRandomEngine';
import { PredictiveEngine } from '../engines/PredictiveEngine';

export interface EngineInfo {
    id: string;
    nome: string;
    descricao: string;
    disponivel: boolean;
    isPro: boolean;
}

export class EngineFactory {
    static criarEngine(
        tipo: string,
        dados: number[][],
        config: any,
        isPro: boolean = false,
        extras?: EngineExtras
    ): BaseEngine {
        switch (tipo) {
            case 'statistical':
                return new StatisticalEngine(dados, config, isPro, extras);
            case 'hybrid':
                return new HybridEngine(dados, config, isPro, extras);
            case 'specialist':
                return new SpecialistEngine(dados, config, isPro, extras);
            case 'smartrandom':
                return new SmartRandomEngine(dados, config, isPro, extras);
            case 'probability':
                return new ProbabilityEngine(dados, config, isPro, extras);
            case 'predictive':
                return new PredictiveEngine(dados, config, isPro, extras);
            default:
                return new HybridEngine(dados, config, isPro, extras);
        }
    }

    static listarEngines(isPro: boolean = false): EngineInfo[] {
        return [
            {
                id: 'statistical',
                nome: '📊 IA Estatística',
                descricao: 'Analisa frequência, atraso e dispersão',
                disponivel: true,
                isPro: false
            },
            {
                id: 'hybrid',
                nome: '🧠 IA Híbrida ⭐ RECOMENDADO',
                descricao: 'Combina estatística, probabilidade e tendência',
                disponivel: true,
                isPro: false
            },
            {
                id: 'specialist',
                nome: '🎯 IA Especialista',
                descricao: 'Avalia e seleciona os melhores jogos',
                disponivel: true,
                isPro: false
            },
            {
                id: 'smartrandom',
                nome: '🎲 Aleatório Inteligente',
                descricao: 'Aleatório com ponderação estatística',
                disponivel: true,
                isPro: false
            },
            {
                id: 'probability',
                nome: '📈 IA Probabilística ⭐ PRO',
                descricao: 'Distribuição binomial, entropia e variância',
                disponivel: isPro,
                isPro: true
            },
            {
                id: 'predictive',
                nome: '🔮 IA Preditiva ⭐ PRO',
                descricao: 'Detecta padrões e tenta prever os próximos números',
                disponivel: isPro,
                isPro: true
            }
        ];
    }

    static engineExiste(tipo: string): boolean {
        const engines = ['statistical', 'hybrid', 'specialist', 'smartrandom', 'probability', 'predictive'];
        return engines.includes(tipo);
    }

    static isEnginePro(tipo: string): boolean {
        return tipo === 'probability' || tipo === 'predictive';
    }
}
