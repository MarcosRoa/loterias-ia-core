// ============================================
// src/ai/index.ts
// ============================================

// ============================================
// ORQUESTRADOR DE IAs
// ============================================

import { EngineFactory } from './factory/EngineFactory';
import { FrequencyAnalyzer } from './analysis/FrequencyAnalyzer';
import { DelayAnalyzer } from './analysis/DelayAnalyzer';
import { DispersionAnalyzer } from './analysis/DispersionAnalyzer';
import { PatternAnalyzer } from './analysis/PatternAnalyzer';
import { ProbabilityAnalyzer } from './analysis/ProbabilityAnalyzer';
import { ConfidenceCalculator } from './evaluation/ConfidenceCalculator';
import { GameEvaluator } from './evaluation/GameEvaluator';

export interface GenerateParams {
  lotteryType: string;
  count: number;
  method?: string;
  userId?: string | null;
  isPro?: boolean;
  history?: any[];
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
  games?: number[][];
  analysis?: any;
  confidence?: number;
  engineName?: string;
  explanation?: string[];
  error?: string;
  timestamp?: string;
}

const LOTTERY_CONFIGS: Record<string, any> = {
  megasena: { nome: 'Mega-Sena', maxNumero: 60, numerosPadrao: 6, incluirZero: false, temDispersao: true },
  quina: { nome: 'Quina', maxNumero: 80, numerosPadrao: 5, incluirZero: false, temDispersao: true },
  lotofacil: { nome: 'Lotofácil', maxNumero: 25, numerosPadrao: 15, incluirZero: false, temDispersao: true },
  lotomania: { nome: 'Lotomania', maxNumero: 99, numerosPadrao: 20, incluirZero: true, temDispersao: true },
  duplasena: { nome: 'Dupla Sena', maxNumero: 50, numerosPadrao: 6, incluirZero: false, temDispersao: true },
  timemania: { nome: 'Timemania', maxNumero: 80, numerosPadrao: 7, incluirZero: false, temDispersao: true },
  milionaria: { nome: '+Milionária', maxNumero: 50, numerosPadrao: 6, incluirZero: false, temDispersao: true },
  loteca: { nome: 'Loteca', maxNumero: 3, numerosPadrao: 14, incluirZero: true, temDispersao: false },
  diadesorte: { nome: 'Dia de Sorte', maxNumero: 31, numerosPadrao: 7, incluirZero: false, temDispersao: true },
  supersete: { nome: 'Super Sete', maxNumero: 9, numerosPadrao: 7, incluirZero: true, temDispersao: true }
};

class IAOrchestrator {
  private confidenceCalc: ConfidenceCalculator;
  private evaluator: GameEvaluator;

  constructor() {
    this.confidenceCalc = new ConfidenceCalculator();
    this.evaluator = new GameEvaluator(60, 6);
  }

  async generate(params: GenerateParams): Promise<GenerateResult> {
    try {
      const { lotteryType, count, method = 'hybrid', userId, isPro = false, history = [] } = params;
      
      const config = LOTTERY_CONFIGS[lotteryType];
      if (!config) {
        return {
          success: false,
          error: `Loteria ${lotteryType} não encontrada`
        };
      }

      console.log(`🧠 Gerando ${count} jogos para ${config.nome} usando ${method}`);

      // Criar engine
      const dados = history || [];
      const engineConfig = {
        ...config,
        numerosPadrao: config.numerosPadrao
      };

      const engine = EngineFactory.criarEngine(method, dados, engineConfig, isPro);

      // Verificar disponibilidade
      if (!engine.isDisponivel()) {
        return {
          success: false,
          error: 'Este motor não está disponível para o seu plano'
        };
      }

      // Gerar jogos
      const result = engine.gerarJogos(count, Date.now(), { dispersao: 15 });

      // Calcular confiança
      const confidence = this.confidenceCalc.calcularCompleta(dados, ['frequencia', 'atraso', 'dispersao']);

      return {
        success: true,
        method,
        lotteryType,
        count,
        games: result.games.map((g: any) => g.numeros),
        analysis: {
          totalDraws: dados.length,
          confidence: confidence.confianca
        },
        confidence: confidence.confianca,
        engineName: result.engineName,
        explanation: result.explanation,
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

  async analyze(params: AnalyzeParams): Promise<any> {
    try {
      const { lotteryType, history } = params;
      const config = LOTTERY_CONFIGS[lotteryType];
      
      if (!config) {
        return { success: false, error: `Loteria ${lotteryType} não encontrada` };
      }

      const dados = history || [];

      if (dados.length < 10) {
        return {
          success: false,
          error: 'Dados insuficientes para análise (mínimo 10 concursos)'
        };
      }

      // Criar analyzers
      const frequency = new FrequencyAnalyzer(dados);
      const delay = new DelayAnalyzer(dados);
      const dispersion = new DispersionAnalyzer(dados);
      const patterns = new PatternAnalyzer(dados);
      const probability = new ProbabilityAnalyzer(dados);

      const confidence = this.confidenceCalc.calcularCompleta(dados, ['frequencia', 'atraso', 'dispersao', 'padroes']);

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

  async predict(params: PredictParams): Promise<any> {
    try {
      const { lotteryType, history, count } = params;
      const config = LOTTERY_CONFIGS[lotteryType];
      
      if (!config) {
        return { success: false, error: `Loteria ${lotteryType} não encontrada` };
      }

      const dados = history || [];

      if (dados.length < 10) {
        return {
          success: false,
          error: 'Dados insuficientes para predição (mínimo 10 concursos)'
        };
      }

      // Usar motor preditivo
      const engineConfig = {
        ...config,
        numerosPadrao: config.numerosPadrao
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
}

export const IAOrchestrator = new IAOrchestrator();
