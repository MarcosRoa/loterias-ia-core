// ============================================
// CAMINHO: src/ai/index.ts   24/07/2026
// ============================================
// ORQUESTRADOR DE IAs - VERSÃO SIMPLIFICADA
// ============================================

import { EngineFactory } from './factory/EngineFactory';
import { FrequencyAnalyzer } from './analysis/FrequencyAnalyzer';
import { DelayAnalyzer } from './analysis/DelayAnalyzer';
import { DispersionAnalyzer } from './analysis/DispersionAnalyzer';
import { PatternAnalyzer } from './analysis/PatternAnalyzer';
import { ProbabilityAnalyzer } from './analysis/ProbabilityAnalyzer';
import { ConfidenceCalculator } from './evaluation/ConfidenceCalculator';
import { GameEvaluator } from './evaluation/GameEvaluator';
// ✅ Importar a interface existente do BaseEngine
import { JogoGerado } from './engines/BaseEngine';

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
  games?: JogoGerado[]; // ✅ Agora usa a interface correta
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
// CONFIGURAÇÕES DAS LOTERIAS (com flags extras)
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
  // GERAR JOGOS - SIMPLIFICADO
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
        filters = {},
        dadosExtras = []
      } = params;
      
      const config = LOTTERY_CONFIGS[lotteryType];
      if (!config) {
        return { success: false, error: `Loteria ${lotteryType} não encontrada` };
      }

      console.log(`🧠 Gerando ${count} jogos para ${config.nome}`);
      console.log(`   Método: ${method}`);
      console.log(`   Extra: ${extraNumbers || config.numerosPadrao} números`);
      console.log(`   Período: ${period}`);
      console.log(`   Dispersão: ${dispersao}`);
      console.log(`   Histórico: ${history?.length || 0} concursos`);

      const dados = history || [];
      const numerosPorJogo = extraNumbers || config.numerosPadrao;

      // ✅ Passa as flags para a engine
      const engineConfig = {
        ...config,
        numerosPadrao: numerosPorJogo,
        temTime: config.temTime || false,
        temTrevos: config.temTrevos || false,
        temMes: config.temMes || false
      };

      const engine = EngineFactory.criarEngine(method, dados, engineConfig, isPro);

      if (!engine.isDisponivel()) {
        return { success: false, error: 'Este motor não está disponível para o seu plano' };
      }

      const result = engine.gerarJogos(count, Date.now(), { 
        dispersao,
        period,
        filters,
        extraNumbers: numerosPorJogo
      });

      // 🔥 LOG TEMPORÁRIO PARA VERIFICAR EXTRAS
      console.log('========== EXTRAS GERADOS ==========');
      console.log('Loteria:', lotteryType);
      console.log('Jogos:', JSON.stringify(result.games, null, 2));
      console.log('=====================================');

      const confidenceResult = this.confidenceCalc.calcularCompleta(
        dados, 
        ['frequencia', 'atraso', 'dispersao', 'padroes']
      );

      // ✅ RETORNA DIRETAMENTE O OBJETO COMPLETO (SEM RECONSTRUÇÃO)
      return {
        success: true,
        method,
        lotteryType,
        count,
        games: result.games, // ✅ Já contém todos os extras
        analysis: {
          totalDraws: dados.length,
          confidence: confidenceResult.confianca,
          period,
          dispersao
        },
        confidence: confidenceResult.confianca,
        engineName: result.engineName,
        explanation: result.explanation || [
          `🧠 IA ${method} aplicada`,
          `📊 ${dados.length} concursos analisados`,
          `🎯 Confiança: ${confidenceResult.confianca}%`
        ],
        iaUsed: dados.length >= 10,
        totalHistorico: dados.length,
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
  // ANALISAR DADOS (mantido)
  // ============================================
  async analyze(params: AnalyzeParams): Promise<any> {
    // ... mantido igual
  }

  // ============================================
  // PREDIZER (mantido)
  // ============================================
  async predict(params: PredictParams): Promise<any> {
    // ... mantido igual
  }
}

export const orchestrator = new IAOrchestrator();
