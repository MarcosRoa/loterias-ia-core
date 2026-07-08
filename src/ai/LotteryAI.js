/**
 * Classe principal para geração de jogos de loteria
 * com diferentes algoritmos de IA
 */
class LotteryAI {
  constructor() {
    this.models = {};
    this.history = {};
    this.configs = {
      megasena: { max: 60, count: 6, nome: 'Mega-Sena' },
      quina: { max: 80, count: 5, nome: 'Quina' },
      lotofacil: { max: 25, count: 15, nome: 'Lotofácil' },
      lotomania: { max: 99, count: 20, nome: 'Lotomania' },
      duplasena: { max: 50, count: 6, nome: 'Dupla Sena' },
      timemania: { max: 80, count: 7, nome: 'Timemania' },
      milionaria: { max: 50, count: 6, nome: '+Milionária' },
      diadesorte: { max: 31, count: 7, nome: 'Dia de Sorte' },
      supersete: { max: 9, count: 7, nome: 'Super Sete' }
    };
  }

  // ============================================
  // MÉTODOS DE GERAÇÃO
  // ============================================

  /**
   * Gera jogos usando análise de frequência
   */
  generateByFrequency(lotteryType, count = 1, options = {}) {
    const config = this.configs[lotteryType];
    if (!config) {
      throw new Error(`Loteria ${lotteryType} não encontrada`);
    }

    const games = [];
    const usedNumbers = new Set();

    for (let i = 0; i < count; i++) {
      const game = this._generateSingleGame(config, usedNumbers, options);
      games.push(game);
    }

    return {
      success: true,
      method: 'frequency',
      lotteryType,
      count,
      games,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Gera jogos usando algoritmo de "bolas quentes e frias"
   */
  generateByHotCold(lotteryType, count = 1, hotNumbers = [], coldNumbers = []) {
    const config = this.configs[lotteryType];
    if (!config) {
      throw new Error(`Loteria ${lotteryType} não encontrada`);
    }

    const games = [];
    for (let i = 0; i < count; i++) {
      const game = this._generateWithHotCold(config, hotNumbers, coldNumbers);
      games.push(game);
    }

    return {
      success: true,
      method: 'hotcold',
      lotteryType,
      count,
      games,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Gera jogos usando algoritmo de "padrões" (progressão aritmética)
   */
  generateByPattern(lotteryType, count = 1, patterns = []) {
    const config = this.configs[lotteryType];
    if (!config) {
      throw new Error(`Loteria ${lotteryType} não encontrada`);
    }

    const games = [];
    for (let i = 0; i < count; i++) {
      const game = this._generateWithPattern(config, patterns);
      games.push(game);
    }

    return {
      success: true,
      method: 'pattern',
      lotteryType,
      count,
      games,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Gera jogos usando algoritmo "inteligente" (combina várias técnicas)
   */
  generateSmart(lotteryType, count = 1, history = []) {
    const config = this.configs[lotteryType];
    if (!config) {
      throw new Error(`Loteria ${lotteryType} não encontrada`);
    }

    // Analisa histórico se fornecido
    let analysis = null;
    if (history && history.length > 0) {
      analysis = this.analyzeHistory(history, config);
    }

    const games = [];
    for (let i = 0; i < count; i++) {
      const game = this._generateSmartGame(config, analysis);
      games.push(game);
    }

    return {
      success: true,
      method: 'smart',
      lotteryType,
      count,
      games,
      analysis,
      timestamp: new Date().toISOString()
    };
  }

  // ============================================
  // MÉTODOS DE ANÁLISE
  // ============================================

  /**
   * Analisa histórico de resultados
   */
  analyzeHistory(history, config) {
    const frequency = new Array(config.max + 1).fill(0);
    const totalDraws = history.length;

    history.forEach(draw => {
      draw.numbers.forEach(num => {
        if (num >= 0 && num <= config.max) {
          frequency[num]++;
        }
      });
    });

    // Calcular números mais e menos frequentes
    const sorted = frequency.map((freq, num) => ({ num, freq }))
      .sort((a, b) => b.freq - a.freq);

    const hot = sorted.slice(0, Math.ceil(config.count * 1.5));
    const cold = sorted.slice(-Math.ceil(config.count * 1.5));

    return {
      totalDraws,
      frequency,
      hot: hot.filter(h => h.freq > 0),
      cold: cold.filter(c => c.freq > 0),
      averageFrequency: frequency.reduce((a, b) => a + b, 0) / config.max,
      mostFrequent: hot[0],
      leastFrequent: cold[cold.length - 1]
    };
  }

  // ============================================
  // MÉTODOS PRIVADOS
  // ============================================

  _generateSingleGame(config, usedNumbers = new Set(), options = {}) {
    const { max, count } = config;
    const numbers = new Set();
    const maxAttempts = 1000;
    let attempts = 0;

    while (numbers.size < count && attempts < maxAttempts) {
      attempts++;
      let num = Math.floor(Math.random() * max) + 1;
      
      // Evitar números já usados (se for gerar múltiplos jogos)
      if (usedNumbers.has(num) && options.avoidDuplicates) {
        continue;
      }

      // Pular números específicos (se fornecido)
      if (options.skipNumbers && options.skipNumbers.includes(num)) {
        continue;
      }

      numbers.add(num);
    }

    // Se não conseguiu gerar todos os números, preencher com aleatórios
    while (numbers.size < count) {
      let num = Math.floor(Math.random() * max) + 1;
      if (!numbers.has(num)) {
        numbers.add(num);
      }
    }

    const result = Array.from(numbers).sort((a, b) => a - b);
    
    // Registrar números usados para evitar repetição
    result.forEach(num => usedNumbers.add(num));

    return result;
  }

  _generateWithHotCold(config, hotNumbers, coldNumbers) {
    const { max, count } = config;
    const numbers = new Set();
    
    // 60% números quentes, 40% frios (ou vice-versa)
    const hotCount = Math.floor(count * 0.6);
    const coldCount = count - hotCount;

    // Selecionar dos quentes
    const availableHot = hotNumbers.filter(h => !numbers.has(h));
    for (let i = 0; i < hotCount && i < availableHot.length; i++) {
      const idx = Math.floor(Math.random() * availableHot.length);
      numbers.add(availableHot[idx]);
    }

    // Selecionar dos frios
    const availableCold = coldNumbers.filter(c => !numbers.has(c));
    for (let i = 0; i < coldCount && i < availableCold.length; i++) {
      const idx = Math.floor(Math.random() * availableCold.length);
      numbers.add(availableCold[idx]);
    }

    // Preencher com aleatórios se faltar números
    while (numbers.size < count) {
      let num = Math.floor(Math.random() * max) + 1;
      if (!numbers.has(num)) {
        numbers.add(num);
      }
    }

    return Array.from(numbers).sort((a, b) => a - b);
  }

  _generateWithPattern(config, patterns) {
    const { max, count } = config;
    const numbers = new Set();

    // Se tiver padrões, usar eles
    if (patterns && patterns.length > 0) {
      const selectedPatterns = patterns.slice(0, count);
      selectedPatterns.forEach(pattern => {
        if (pattern >= 1 && pattern <= max && !numbers.has(pattern)) {
          numbers.add(pattern);
        }
      });
    }

    // Completar com números aleatórios
    while (numbers.size < count) {
      let num = Math.floor(Math.random() * max) + 1;
      if (!numbers.has(num)) {
        numbers.add(num);
      }
    }

    return Array.from(numbers).sort((a, b) => a - b);
  }

  _generateSmartGame(config, analysis = null) {
    const { max, count } = config;
    const numbers = new Set();

    if (analysis && analysis.hot && analysis.hot.length > 0) {
      // 50% hot, 30% cold, 20% aleatório
      const hotCount = Math.floor(count * 0.5);
      const coldCount = Math.floor(count * 0.3);
      const randomCount = count - hotCount - coldCount;

      // Selecionar hot
      const availableHot = analysis.hot.filter(h => !numbers.has(h.num));
      for (let i = 0; i < hotCount && i < availableHot.length; i++) {
        const idx = Math.floor(Math.random() * availableHot.length);
        numbers.add(availableHot[idx].num);
      }

      // Selecionar cold
      const availableCold = analysis.cold.filter(c => !numbers.has(c.num));
      for (let i = 0; i < coldCount && i < availableCold.length; i++) {
        const idx = Math.floor(Math.random() * availableCold.length);
        numbers.add(availableCold[idx].num);
      }

      // Aleatórios
      while (numbers.size < count) {
        let num = Math.floor(Math.random() * max) + 1;
        if (!numbers.has(num)) {
          numbers.add(num);
        }
      }
    } else {
      // Se não tem análise, usar aleatório puro
      while (numbers.size < count) {
        let num = Math.floor(Math.random() * max) + 1;
        if (!numbers.has(num)) {
          numbers.add(num);
        }
      }
    }

    return Array.from(numbers).sort((a, b) => a - b);
  }
}

module.exports = LotteryAI;
