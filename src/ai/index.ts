// ============================================
// CAMINHO: src/ai/index.ts   25/07/2026
// ============================================
// ============================================
// CAMINHO: src/ai/index.ts
// ============================================
// ORQUESTRADOR DE IAs - CORRIGIDO (UNIFICADO)
// ============================================

import { EngineFactory } from './factory/EngineFactory';
import { FrequencyAnalyzer } from './analysis/FrequencyAnalyzer';
import { DelayAnalyzer } from './analysis/DelayAnalyzer';
import { DispersionAnalyzer } from './analysis/DispersionAnalyzer';
import { PatternAnalyzer } from './analysis/PatternAnalyzer';
import { ProbabilityAnalyzer } from './analysis/ProbabilityAnalyzer';
import { ConfidenceCalculator } from './evaluation/ConfidenceCalculator';
import { GameEvaluator } from './evaluation/GameEvaluator';
import { JogoGerado } from './engines/BaseEngine';
import { CsvLoader } from '../services/CsvLoader';
import type { LotteryDataset } from '../services/CsvLoader';

// ============================================
// INTERFACES
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
// CONFIGURAÇÕES DAS LOTERIAS
// ============================================

const LOTTERY_CONFIGS: Record<string, any> = {
  megasena: { nome: 'Mega-Sena', maxNumero: 60, numerosPadrao: 6, incluirZero: false, temDispersao: true },
  quina: { nome: 'Quina', maxNumero: 80, numerosPadrao: 5, incluirZero: false, temDispersao: true },
  lotofacil: { nome: 'Lotofácil', maxNumero: 25, numerosPadrao: 15, incluirZero: false, temDispersao: true },
  lotomania: { nome: 'Lotomania', maxNumero: 99, numerosPadrao: 20, incluirZero: true, temDispersao: true },
  duplasena: { nome: 'Dupla Sena', maxNumero: 50, numerosPadrao: 6, incluirZero: false, temDispersao: true },
  timemania: { nome: 'Timemania', maxNumero: 80, numerosPadrao: 7, incluirZero: false, temDispersao: true, temTime: true },
  milionaria: { nome: '+Milionária', maxNumero: 50, numerosPadrao: 6, incluirZero: false, temDispersao: true, temTrevos: true },
  loteca: { nome: 'Loteca', maxNumero: 3, numerosPadrao: 14, incluirZero: true, temDispersao: false },
  diadesorte: { nome: 'Dia de Sorte', maxNumero: 31, numerosPadrao: 7, incluirZero: false, temDispersao: true, temMes: true },
  supersete: { nome: 'Super Sete', maxNumero: 9, numerosPadrao: 7, incluirZero: true, temDispersao: true }
};

// ============================================
// ORQUESTRADOR
// ============================================

class IAOrchestrator {
  private confidenceCalc: ConfidenceCalculator;
  private evaluator: GameEvaluator;

  constructor() {
    this.confidenceCalc = new ConfidenceCalculator();
    this.evaluator = new GameEvaluator(60, 6);
  }

  // ============================================
  // GERAR JOGOS - CORRIGIDO (UNIFICADO)
  // ============================================
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
      
      const config = LOTTERY_CONFIGS[lotteryType];
      if (!config) {
        return { success: false, error: `Loteria ${lotteryType} não encontrada` };
      }

      console.log(`🧠 Gerando ${count} jogos para ${config.nome}`);
      console.log(`   Método: ${method}`);
      console.log(`   Período: ${period}`);
      console.log(`   Dispersão: ${dispersao}`);

      // ============================================
      // 🔥 CARREGAR DATASET (UNIFICADO)
      // ============================================
      let dataset: LotteryDataset;
      
      if (history && history.length > 0) {
        // ✅ Fallback: frontend enviou history
        console.log(`   Usando history do frontend: ${history.length} concursos`);
        dataset = {
          dados: history,
          dadosExtras: params.dadosExtras || [],
          datas: [],
          totalDraws: history.length
        };
      } else {
        // ✅ PRIORIDADE: Carregar CSV local
        try {
          console.log(`   Carregando CSV local: ${lotteryType}`);
          dataset = CsvLoader.load(lotteryType, period);
          console.log(`   CSV carregado: ${dataset.totalDraws} concursos`);
          console.log(`   Extras: ${dataset.dadosExtras.length} registros`);
        } catch (error) {
          console.error(`❌ Erro ao carregar CSV:`, error);
          return { success: false, error: `Erro ao carregar dados da loteria ${lotteryType}` };
        }
      }

      // Verificar se há dados suficientes
      if (dataset.totalDraws === 0) {
        return { success: false, error: `Nenhum dado disponível para ${lotteryType}` };
      }

      const numerosPorJogo = extraNumbers || config.numerosPadrao;

      // ✅ Passa as flags e os dados extras para a engine
      const engineConfig = {
        ...config,
        numerosPadrao: numerosPorJogo,
        temTime: config.temTime || false,
        temTrevos: config.temTrevos || false,
        temMes: config.temMes || false
      };

      // ✅ EXTRAI DADOS ESPECÍFICOS PARA CADA LOTERIA
      // OBS: O parser já retorna os dados no formato correto
      const extras = {
        dadosTimes: lotteryType === 'timemania' ? dataset.dadosExtras : undefined,
        dadosMeses: lotteryType === 'diadesorte' ? dataset.dadosExtras : undefined,
        dadosTrevos: lotteryType === 'milionaria' ? dataset.dadosExtras : undefined
      };

      const engine = EngineFactory.criarEngine(
        method, 
        dataset.dados, 
        engineConfig, 
        isPro,
        extras
      );

      if (!engine.isDisponivel()) {
        return { success: false, error: 'Este motor não está disponível para o seu plano' };
      }

      const result = engine.gerarJogos(count, Date.now(), { 
        dispersao,
        period,
        filters,
        extraNumbers: numerosPorJogo
      });

      console.log('========== EXTRAS GERADOS ==========');
      console.log('Loteria:', lotteryType);
      console.log('Jogos:', JSON.stringify(result.games, null, 2));
      console.log('=====================================');

      const confidenceResult = this.confidenceCalc.calcularCompleta(
        dataset.dados, 
        ['frequencia', 'atraso', 'dispersao', 'padroes']
      );

      return {
        success: true,
        method,
        lotteryType,
        count,
        games: result.games,
        analysis: {
          totalDraws: dataset.totalDraws,
          confidence: confidenceResult.confianca,
          period,
          dispersao
        },
        confidence: confidenceResult.confianca,
        engineName: result.engineName,
        explanation: result.explanation || [
          `🧠 IA ${method} aplicada`,
          `📊 ${dataset.totalDraws} concursos analisados`,
          `🎯 Confiança: ${confidenceResult.confianca}%`
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
  // ANALISAR DADOS
  // ============================================
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

  // ============================================
  // PREDIZER
  // ============================================
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

export const orchestrator = new IAOrchestrator();
