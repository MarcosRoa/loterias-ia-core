// ============================================
// CAMINHO: src/ai/factory/EngineFactory.ts
// ============================================
// Fábrica de motores - cria a engine escolhida
// ============================================

import { BaseEngine } from '../engines/BaseEngine';
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
        isPro: boolean = false
    ): BaseEngine {
        switch (tipo) {
            case 'statistical':
                return new StatisticalEngine(dados, config);
            case 'hybrid':
                return new HybridEngine(dados, config);
            case 'specialist':
                return new SpecialistEngine(dados, config);
            case 'smartrandom':
                return new SmartRandomEngine(dados, config);
            case 'probability':
                return new ProbabilityEngine(dados, config);
            case 'predictive':
                return new PredictiveEngine(dados, config);
            default:
                return new HybridEngine(dados, config);
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
