// ============================================
// CAMINHO: src/ai/factory/EngineFactory.ts
// DATA CRIAÇÃO: 2026-01-20
// STATUS: ⏳ PENDENTE APROVAÇÃO
// VERSÃO: 2.1.0 (SEM FALLBACK)
// ============================================
// 
// SEÇÃO 1: IMPORTS
// SEÇÃO 2: INTERFACES E TIPOS
// SEÇÃO 3: ENGINE FACTORY
// SEÇÃO 4: EXPORTS
// ============================================

// ============================================
// SEÇÃO 1: IMPORTS
// ============================================

import { BaseEngine, EngineExtras } from '../engines/BaseEngine';
import { StatisticalEngine } from '../engines/StatisticalEngine';
import { HybridEngine } from '../engines/HybridEngine';
import { SpecialistEngine } from '../engines/SpecialistEngine';
import { SmartRandomEngine } from '../engines/SmartRandomEngine';
import { ProbabilityEngine } from '../engines/ProbabilityEngine';
import { PredictiveEngine } from '../engines/PredictiveEngine';
import { ConservativeEngine } from '../engines/ConservativeEngine';
import { BalancedEngine } from '../engines/BalancedEngine';
import { AggressiveEngine } from '../engines/AggressiveEngine';

// ============================================
// SEÇÃO 2: INTERFACES E TIPOS
// ============================================

export interface EngineInfo {
    id: string;
    nome: string;
    descricao: string;
    disponivel: boolean;
    isPro: boolean;
}

export type EngineType = 
    | 'statistical'
    | 'hybrid'
    | 'specialist'
    | 'smartrandom'
    | 'probability'
    | 'predictive'
    | 'conservative'
    | 'balanced'
    | 'aggressive';

// ============================================
// SEÇÃO 3: ENGINE FACTORY
// ============================================

/**
 * Fábrica de motores de IA
 * 
 * Responsabilidade:
 * - Criar instâncias de engines baseado no tipo
 * - Listar engines disponíveis
 * - Validar existência de engines
 * 
 * Princípios:
 * - Single Responsibility: Apenas criar e listar engines
 * - Open/Closed: Aberta para extensão (novas engines), fechada para modificação
 * - Fail Fast: Erros imediatos e explícitos para engines inexistentes
 * 
 * ⚠️ IMPORTANTE: Esta factory NÃO possui fallback.
 * Se uma engine não for encontrada, um erro é lançado imediatamente.
 * Isso garante que problemas de configuração sejam detectados rapidamente.
 * 
 * @example
 * ```typescript
 * // Uso correto
 * const engine = EngineFactory.criarEngine('hybrid', dados, config, isPro, extras);
 * 
 * // Uso incorreto - lança erro
 * const engine = EngineFactory.criarEngine('inexistente', dados, config, isPro, extras);
 * // → Error: [EngineFactory] Engine "inexistente" não encontrada.
 * ```
 */
export class EngineFactory {
    /**
     * Mapeamento de tipos de engine para classes construtoras
     * Facilita a extensão sem modificar o switch
     */
    private static readonly engineMap: Map<EngineType, any> = new Map([
        ['statistical', StatisticalEngine],
        ['hybrid', HybridEngine],
        ['specialist', SpecialistEngine],
        ['smartrandom', SmartRandomEngine],
        ['probability', ProbabilityEngine],
        ['predictive', PredictiveEngine],
        ['conservative', ConservativeEngine],
        ['balanced', BalancedEngine],
        ['aggressive', AggressiveEngine]
    ]);

    /**
     * Lista de todos os tipos de engine disponíveis
     */
    private static readonly engineTypes: EngineType[] = [
        'statistical',
        'hybrid',
        'specialist',
        'smartrandom',
        'probability',
        'predictive',
        'conservative',
        'balanced',
        'aggressive'
    ];

    // ============================================
    // MÉTODOS DE CRIAÇÃO
    // ============================================

    /**
     * Cria uma instância de engine baseado no tipo
     * 
     * ⚠️ NÃO POSSUI FALLBACK.
     * Se o tipo não for encontrado, lança erro imediatamente.
     * 
     * @param tipo - Tipo da engine
     * @param dados - Dados históricos
     * @param config - Configurações da engine
     * @param isPro - Se o usuário é PRO
     * @param extras - Dados extras (times, trevos, etc)
     * @returns Instância da engine
     * 
     * @throws Error se o tipo de engine não for encontrado
     */
    static criarEngine(
        tipo: string,
        dados: number[][],
        config: any,
        isPro: boolean = false,
        extras?: EngineExtras
    ): BaseEngine {
        // ============================================
        // VALIDAÇÃO DO TIPO
        // ============================================
        if (!tipo) {
            throw new Error(
                '[EngineFactory] Tipo de engine não especificado. ' +
                'Tipos disponíveis: ' + this.engineTypes.join(', ')
            );
        }

        // Busca a classe no mapa
        const EngineClass = this.engineMap.get(tipo as EngineType);
        
        // ⚠️ SEM FALLBACK - erro imediato
        if (!EngineClass) {
            throw new Error(
                `[EngineFactory] Engine "${tipo}" não encontrada. ` +
                `Tipos disponíveis: ${this.engineTypes.join(', ')}`
            );
        }

        // Instancia a engine
        return new EngineClass(dados, config, isPro, extras);
    }

    /**
     * Cria uma engine com validação de disponibilidade
     * 
     * ⚠️ Também NÃO POSSUI FALLBACK.
     * Se a engine não estiver disponível ou não existir, retorna null.
     * 
     * @param tipo - Tipo da engine
     * @param dados - Dados históricos
     * @param config - Configurações da engine
     * @param isPro - Se o usuário é PRO
     * @param extras - Dados extras
     * @returns Instância da engine ou null se não disponível
     */
    static criarEngineSeguro(
        tipo: string,
        dados: number[][],
        config: any,
        isPro: boolean = false,
        extras?: EngineExtras
    ): BaseEngine | null {
        // Verifica se a engine existe
        if (!this.engineExiste(tipo)) {
            return null;
        }

        // Verifica se a engine está disponível para o plano
        if (this.isEnginePro(tipo) && !isPro) {
            return null;
        }

        // Cria a engine (pode lançar erro se algo der errado)
        return this.criarEngine(tipo, dados, config, isPro, extras);
    }

    // ============================================
    // MÉTODOS DE LISTAGEM
    // ============================================

    /**
     * Lista todas as engines disponíveis
     * 
     * @param isPro - Se o usuário é PRO (afeta disponibilidade)
     * @returns Lista de informações das engines
     */
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
                id: 'conservative',
                nome: '🛡️ IA Conservadora',
                descricao: 'Prioriza números mais frequentes e consistentes',
                disponivel: true,
                isPro: false
            },
            {
                id: 'balanced',
                nome: '⚖️ IA Balanceada',
                descricao: 'Equilibra todos os fatores estatísticos igualmente',
                disponivel: true,
                isPro: false
            },
            {
                id: 'aggressive',
                nome: '🔥 IA Agressiva',
                descricao: 'Foca em padrões e probabilidades, busca tendências emergentes',
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

    // ============================================
    // MÉTODOS DE VALIDAÇÃO
    // ============================================

    /**
     * Verifica se uma engine existe
     * 
     * @param tipo - Tipo da engine
     * @returns True se existir
     */
    static engineExiste(tipo: string): boolean {
        return this.engineMap.has(tipo as EngineType);
    }

    /**
     * Verifica se uma engine é PRO
     * 
     * @param tipo - Tipo da engine
     * @returns True se for PRO
     */
    static isEnginePro(tipo: string): boolean {
        return tipo === 'probability' || tipo === 'predictive';
    }

    /**
     * Verifica se uma engine está disponível para um usuário
     * 
     * @param tipo - Tipo da engine
     * @param isPro - Se o usuário é PRO
     * @returns True se disponível
     */
    static isEngineDisponivel(tipo: string, isPro: boolean = false): boolean {
        if (!this.engineExiste(tipo)) {
            return false;
        }
        if (this.isEnginePro(tipo) && !isPro) {
            return false;
        }
        return true;
    }

    // ============================================
    // MÉTODOS DE CONSULTA
    // ============================================

    /**
     * Obtém informações de uma engine específica
     * 
     * @param tipo - Tipo da engine
     * @param isPro - Se o usuário é PRO
     * @returns Informações da engine ou null se não existir
     */
    static getEngineInfo(tipo: string, isPro: boolean = false): EngineInfo | null {
        const engines = this.listarEngines(isPro);
        return engines.find(e => e.id === tipo) || null;
    }

    /**
     * Obtém todos os tipos de engine disponíveis
     */
    static getTipos(): EngineType[] {
        return [...this.engineTypes];
    }

    /**
     * Obtém todas as engines não-PRO
     */
    static getEnginesFree(): EngineType[] {
        return this.engineTypes.filter(t => !this.isEnginePro(t));
    }

    /**
     * Obtém todas as engines PRO
     */
    static getEnginesPro(): EngineType[] {
        return this.engineTypes.filter(t => this.isEnginePro(t));
    }

    /**
     * Obtém engines disponíveis para um usuário
     * 
     * @param isPro - Se o usuário é PRO
     * @returns Lista de tipos de engine disponíveis
     */
    static getEnginesDisponiveis(isPro: boolean = false): EngineType[] {
        if (isPro) {
            return [...this.engineTypes];
        }
        return this.getEnginesFree();
    }

    /**
     * Obtém a lista completa de tipos (para mensagens de erro)
     */
    static getTiposFormatados(): string {
        return this.engineTypes.join(', ');
    }
}

// ============================================
// SEÇÃO 4: EXPORTS
// ============================================

export { EngineFactory };
export type { EngineInfo, EngineType };

// Exportação padrão para facilitar importação
export default EngineFactory;
