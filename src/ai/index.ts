// ============================================
// CAMINHO: src/ai/index.ts
// DATA CRIAÇÃO: 2026-01-20
// STATUS: ⏳ PENDENTE APROVAÇÃO
// VERSÃO: 3.1.0 (VERSÃO REVISADA)
// ============================================
// 
// SEÇÃO 1: IMPORTS
// SEÇÃO 2: INTERFACES E TIPOS
// SEÇÃO 3: CONFIGURAÇÕES DAS LOTERIAS
// SEÇÃO 4: ORQUESTRADOR
// SEÇÃO 5: EXPORTS
// ============================================

// ============================================
// SEÇÃO 1: IMPORTS
// ============================================

import { EngineFactory } from './factory/EngineFactory';
import { FrequencyAnalyzer } from './analysis/FrequencyAnalyzer';
import { DelayAnalyzer } from './analysis/DelayAnalyzer';
import { DispersionAnalyzer } from './analysis/DispersionAnalyzer';
import { PatternAnalyzer } from './analysis/PatternAnalyzer';
import { ProbabilityAnalyzer } from './analysis/ProbabilityAnalyzer';
import { ConfidenceCalculator } from './evaluation/ConfidenceCalculator';
import { JogoGerado } from './engines/BaseEngine';
import { CsvLoader } from '../services/CsvLoader';
import type { LotteryDataset } from '../services/CsvLoader';

// ============================================
// SEÇÃO 2: INTERFACES E TIPOS
// ============================================

export interface GenerateParams {
  lotteryType: string;
  count: number;
  method?: string;
  userId?: string | null;
  isPro?: boolean;
  history?: any[];
  extraNumbers?: number;
  period?: string;
  dispersao?: number;
  filters?: any;
  dadosExtras?: any[];
}

export interface AnalyzeParams {
  lotteryType: string;
  history: any[];
}

export interface PredictParams {
  lotteryType: string;
  history: any[];
  count: number;
}

export interface GenerateResult {
  success: boolean;
  method?: string;
  lotteryType?: string;
  count?: number;
  games?: JogoGerado[];
  analysis?: any;
  confidence?: number;
  engineName?: string;
  explanation?: string[];
  creditsSpent?: number;
  creditsRemaining?: number;
  iaUsed?: boolean;
  totalHistorico?: number;
  error?: string;
  timestamp?: string;
}

// ============================================
// SEÇÃO 3: CONFIGURAÇÕES DAS LOTERIAS
// ============================================

const LOTTERY_CONFIGS: Record<string, any> = {
  megasena: { 
    nome: 'Mega-Sena', 
    lotteryType: 'megasena',
    maxNumero: 60, 
    numerosPadrao: 6, 
    incluirZero: false, 
    temDispersao: true 
  },
  quina: { 
    nome: 'Quina', 
    lotteryType: 'quina',
    maxNumero: 80, 
    numerosPadrao: 5, 
    incluirZero: false, 
    temDispersao: true 
  },
  lotofacil: { 
    nome: 'Lotofácil', 
    lotteryType: 'lotofacil',
    maxNumero: 25, 
    numerosPadrao: 15, 
    incluirZero: false, 
    temDispersao: true 
  },
  lotomania: { 
    nome: 'Lotomania', 
    lotteryType: 'lotomania',
    maxNumero: 99, 
    numerosPadrao: 20, 
    incluirZero: true, 
    temDispersao: true 
  },
  duplasena: { 
    nome: 'Dupla Sena', 
    lotteryType: 'duplasena',
    maxNumero: 50, 
    numerosPadrao: 6, 
    incluirZero: false, 
    temDispersao: true 
  },
  timemania: { 
    nome: 'Timemania', 
    lotteryType: 'timemania',
    maxNumero: 80, 
    numerosPadrao: 7, 
    incluirZero: false, 
    temDispersao: true, 
    temTime: true 
  },
  milionaria: { 
    nome: '+Milionária', 
    lotteryType: 'milionaria',
    maxNumero: 50, 
    numerosPadrao: 6, 
    incluirZero: false, 
    temDispersao: true, 
    temTrevos: true 
  },
  loteca: { 
    nome: 'Loteca', 
    lotteryType: 'loteca',
    maxNumero: 3, 
    numerosPadrao: 14, 
    incluirZero: true, 
    temDispersao: false 
  },
  diadesorte: { 
    nome: 'Dia de Sorte', 
    lotteryType: 'diadesorte',
    maxNumero: 31, 
    numerosPadrao: 7, 
    incluirZero: false, 
    temDispersao: true, 
    temMes: true 
  },
  supersete: { 
    nome: 'Super Sete', 
    lotteryType: 'supersete',
    maxNumero: 9, 
    numerosPadrao: 7, 
    incluirZero: true, 
    temDispersao: true 
  }
};

// ============================================
// SEÇÃO 4: ORQUESTRADOR
// ============================================

class IAOrchestrator {
  /**
   * Calculadora de confiança - usada APENAS para análise
   * A confiança dos jogos vem diretamente das engines
   */
  private confidenceCalc: ConfidenceCalculator;

  constructor() {
    this.confidenceCalc = new ConfidenceCalculator();
  }

  // ============================================
  // MÉTODO: GERAR JOGOS
  // ============================================

  /**
   * Gera jogos usando a engine especificada
   * 
   * A confiança é calculada pela própria engine.
   * O Orchestrator NÃO recalcula a confiança.
   */
  async generate(params: GenerateParams): Promise<GenerateResult> {
    try {
      const { 
        lotteryType, 
        count, 
        method = 'hybrid', 
        userId, 
        isPro = false, 
        history = [],
        extraNumbers = 0,
        period = 'all',
        dispersao = 15,
        filters = {}
      } = params;
      
      // ============================================
      // VALIDAÇÕES INICIAIS
      // ============================================
      const config = LOTTERY_CONFIGS[lotteryType];
      if (!config) {
        return { 
          success: false, 
          error: `Loteria ${lotteryType} não encontrada` 
        };
      }

      // Valida método
      const engineInfo = EngineFactory.getEngineInfo(method, isPro);
      if (!engineInfo) {
        return {
          success: false,
          error: `Método "${method}" não encontrado. ` +
                 `Métodos disponíveis: ${EngineFactory.getTiposFormatados()}`
        };
      }

      // Verifica disponibilidade
      if (!EngineFactory.isEngineDisponivel(method, isPro)) {
        return {
          success: false,
          error: `Método "${method}" não disponível para o plano atual`
        };
      }

      console.log(`🧠 Gerando ${count} jogos para ${config.nome}`);
      console.log(`   Método: ${method}`);
      console.log(`   Período: ${period}`);
      console.log(`   Dispersão: ${dispersao}`);
      console.log(`   Plano: ${isPro ? 'PRO' : 'Free'}`);

      // ============================================
      // CARREGAR DATASET
      // ============================================
      let dataset: LotteryDataset;
      
      if (history && history.length > 0) {
        console.log(`   Usando history do frontend: ${history.length} concursos`);
        dataset = {
          concursos: [],
          dados: history,
          dadosExtras: params.dadosExtras || [],
          datas: [],
          totalDraws: history.length
        };
      } else {
        try {
          console.log(`   Carregando CSV local: ${lotteryType}`);
          dataset = CsvLoader.load(lotteryType, period);
          console.log(`   CSV carregado: ${dataset.totalDraws} concursos`);
          console.log(`   Extras: ${dataset.dadosExtras.length} registros`);
        } catch (error: any) {
          console.error(`❌ Erro ao carregar CSV:`, error);
          return { 
            success: false, 
            error: `Erro ao carregar dados da loteria ${lotteryType}: ${error.message}` 
          };
        }
      }

      if (dataset.totalDraws === 0) {
        return { 
          success: false, 
          error: `Nenhum dado disponível para ${lotteryType}` 
        };
      }

      // ============================================
      // CONFIGURAR ENGINE
      // ============================================
      const numerosPorJogo = extraNumbers || config.numerosPadrao;

      const engineConfig = {
        ...config,
        numerosPadrao: numerosPorJogo,
        temTime: config.temTime || false,
        temTrevos: config.temTrevos || false,
        temMes: config.temMes || false,
        isSuperSete: config.isSuperSete || false,
        isLoteca: config.isLoteca || false
      };

      const extras = {
        dadosTimes: config.temTime ? dataset.dadosExtras : undefined,
        dadosMeses: config.temMes ? dataset.dadosExtras : undefined,
        dadosTrevos: config.temTrevos ? dataset.dadosExtras : undefined
      };

      // ============================================
      // CRIAR E EXECUTAR ENGINE
      // ============================================
      const engine = EngineFactory.criarEngine(
        method, 
        dataset.dados, 
        engineConfig, 
        isPro,
        extras
      );

      const seed = Date.now() + Math.random() * 1000000 + Math.floor(Math.random() * 1000);

      const result = engine.gerarJogos(count, seed, { 
        dispersao,
        period,
        filters,
        extraNumbers: numerosPorJogo
      });

      // ============================================
      // ✅ USAR CONFIANÇA DA ENGINE (NÃO RECALCULAR)
      // ============================================
      return {
        success: true,
        method,
        lotteryType,
        count,
        games: result.games,
        analysis: {
          totalDraws: dataset.totalDraws,
          confidence: result.confidence,
          period,
          dispersao
        },
        confidence: result.confidence, // ✅ Já calculado pela engine
        engineName: result.engineName,
        explanation: result.explanation || [
          `🧠 IA ${method} aplicada`,
          `📊 ${dataset.totalDraws} concursos analisados`,
          `🎯 Confiança: ${result.confidence}%`
        ],
        iaUsed: dataset.totalDraws >= 10,
        totalHistorico: dataset.totalDraws,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      console.error('❌ Erro no generate:', error);
      return {
        success: false,
        error: error.message || 'Erro ao gerar jogos'
      };
    }
  }

  // ============================================
  // MÉTODO: ANALISAR DADOS
  // ============================================

  /**
   * Analisa dados históricos
   * 
   * A análise usa o ConfidenceCalculator para avaliar
   * a qualidade dos dados, não os jogos gerados.
   */
  async analyze(params: AnalyzeParams): Promise<any> {
    try {
      const { lotteryType, history } = params;
      const config = LOTTERY_CONFIGS[lotteryType];
      
      if (!config) {
        return { 
          success: false, 
          error: `Loteria ${lotteryType} não encontrada` 
        };
      }

      const dados = history || [];

      if (dados.length < 10) {
        return {
          success: false,
          error: 'Dados insuficientes para análise (mínimo 10 concursos)'
        };
      }

      const frequency = new FrequencyAnalyzer(dados);
      const delay = new DelayAnalyzer(dados);
      const dispersion = new DispersionAnalyzer(dados);
      const patterns = new PatternAnalyzer(dados);
      const probability = new ProbabilityAnalyzer(dados);

      const confidence = this.confidenceCalc.calcularCompleta(
        dados, 
        ['frequencia', 'atraso', 'dispersao', 'padroes']
      );

      return {
        success: true,
        lotteryType,
        analysis: {
          frequency: frequency.getRanking(20),
          delay: delay.getRanking(20),
          dispersion: {
            recentNumbers: Array.from(dispersion.getRecentes()),
            windowSize: 15
          },
          patterns: patterns.getMelhoresPadroes(10),
          probability: {
            entropia: probability.getEntropia(),
            variancia: probability.getVariancia()
          },
          confidence: confidence.confianca
        },
        totalDraws: dados.length,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao analisar dados'
      };
    }
  }

  // ============================================
  // MÉTODO: PREDIZER
  // ============================================

  /**
   * Faz predições baseadas em dados históricos
   * Usa a engine preditiva (PRO)
   */
  async predict(params: PredictParams): Promise<any> {
    try {
      const { lotteryType, history, count } = params;
      const config = LOTTERY_CONFIGS[lotteryType];
      
      if (!config) {
        return { 
          success: false, 
          error: `Loteria ${lotteryType} não encontrada` 
        };
      }

      const dados = history || [];

      if (dados.length < 10) {
        return {
          success: false,
          error: 'Dados insuficientes para predição (mínimo 10 concursos)'
        };
      }

      const engineConfig = {
        ...config,
        numerosPadrao: config.numerosPadrao,
        lotteryType: config.lotteryType
      };

      const engine = EngineFactory.criarEngine('predictive', dados, engineConfig, true);
      const result = engine.gerarJogos(count, Date.now(), { dispersao: 15 });

      return {
        success: true,
        lotteryType,
        predictions: result.games.map((g: any) => g.numeros),
        confidence: result.confidence,
        explanation: result.explanation,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao fazer predição'
      };
    }
  }

  // ============================================
  // MÉTODOS: LISTAGEM E CONSULTA
  // ============================================

  /**
   * Lista todas as engines disponíveis
   */
  listarEngines(isPro: boolean = false): any[] {
    return EngineFactory.listarEngines(isPro);
  }

  /**
   * Verifica se uma engine está disponível
   */
  isEngineDisponivel(method: string, isPro: boolean = false): boolean {
    return EngineFactory.isEngineDisponivel(method, isPro);
  }

  /**
   * Obtém informações de uma engine
   */
  getEngineInfo(method: string, isPro: boolean = false): any {
    return EngineFactory.getEngineInfo(method, isPro);
  }

  /**
   * Lista todas as loterias suportadas
   */
  listarLoterias(): string[] {
    return Object.keys(LOTTERY_CONFIGS);
  }

  /**
   * Obtém configuração de uma loteria
   */
  getLoteriaConfig(lotteryType: string): any {
    return LOTTERY_CONFIGS[lotteryType] || null;
  }
}

// ============================================
// SEÇÃO 5: EXPORTS
// ============================================

export const orchestrator = new IAOrchestrator();
export { IAOrchestrator };
export default orchestrator;
