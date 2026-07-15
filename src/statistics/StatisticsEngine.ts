// ============================================
// CAMINHO: src/statistics/StatisticsEngine.ts
// ============================================
// ORQUESTRADOR - CORRIGIDO (NORMALIZA PERÍODO)
// ============================================

import { FrequencyAnalyzer } from './analyzers/FrequencyAnalyzer';
import { DelayAnalyzer } from './analyzers/DelayAnalyzer';
import { PairsAnalyzer } from './analyzers/PairsAnalyzer';
import { TriplesAnalyzer } from './analyzers/TriplesAnalyzer';
import { HeatmapAnalyzer } from './analyzers/HeatmapAnalyzer';
import { TrendAnalyzer } from './analyzers/TrendAnalyzer';
import { EntropyAnalyzer } from './analyzers/EntropyAnalyzer';
import { DistributionAnalyzer } from './analyzers/DistributionAnalyzer';
import { GroupAnalyzer } from './analyzers/GroupAnalyzer';
import { ParityAnalyzer } from './analyzers/ParityAnalyzer';
import { SequenceAnalyzer } from './analyzers/SequenceAnalyzer';
import { ExtrasAnalyzer } from './analyzers/ExtrasAnalyzer';
import { CsvParser } from './utils/CsvParser';
import { Normalizer } from './utils/Normalizer';
import type { StatisticsResult } from './models/StatisticsResult';

export class StatisticsEngine {
    private csvParser: CsvParser;
    private normalizer: Normalizer;
    private extrasAnalyzer: ExtrasAnalyzer;

    constructor() {
        this.csvParser = new CsvParser();
        this.normalizer = new Normalizer();
        this.extrasAnalyzer = new ExtrasAnalyzer();
    }

    async calculate(lottery: string, period: string): Promise<StatisticsResult> {
        // ✅ NORMALIZAR PERÍODO: "1" → "1y", "3" → "3y", etc.
        let periodNormalized = period;
        if (period !== 'all' && !isNaN(Number(period))) {
            periodNormalized = period + 'y';
            console.log(`📊 Período normalizado: "${period}" → "${periodNormalized}"`);
        }

        // 1. Carregar CSV (com parser específico)
        const context = await this.csvParser.load(lottery);
        if (!context) {
            return {
                success: false,
                error: `Arquivo CSV para ${lottery} não encontrado`
            };
        }

        const { dados, datas, config, dadosExtras } = context;

        if (dados.length === 0) {
            return {
                success: false,
                error: `Nenhum dado encontrado para ${lottery}`
            };
        }

        // 2. Aplicar filtro de período (COM PERÍODO NORMALIZADO)
        const { dadosFiltrados, datasFiltradas } = this.normalizer.filterByPeriod(dados, datas, periodNormalized);

        if (dadosFiltrados.length === 0) {
            return {
                success: false,
                error: `Nenhum dado no período selecionado para ${lottery}`
            };
        }

        // 3. Filtrar dados extras (usando as mesmas datas filtradas)
        let dadosExtrasFiltrados: any[] = [];
        if (dadosExtras && dadosExtras.length > 0) {
            const datasFiltradasSet = new Set(datasFiltradas);
            dadosExtrasFiltrados = dadosExtras.filter((_, index) => {
                const data = datas[index];
                return datasFiltradasSet.has(data);
            });
        }

        const maxNumero = config.maxNumero;
        const incluirZero = config.incluirZero || false;

        // 4. Criar analisadores
        const frequencyAnalyzer = new FrequencyAnalyzer();
        const delayAnalyzer = new DelayAnalyzer();
        const pairsAnalyzer = new PairsAnalyzer();
        const triplesAnalyzer = new TriplesAnalyzer();
        const heatmapAnalyzer = new HeatmapAnalyzer();
        const trendAnalyzer = new TrendAnalyzer();
        const entropyAnalyzer = new EntropyAnalyzer();
        const distributionAnalyzer = new DistributionAnalyzer();
        const groupAnalyzer = new GroupAnalyzer();
        const parityAnalyzer = new ParityAnalyzer();
        const sequenceAnalyzer = new SequenceAnalyzer();

        // 5. Executar análises
        const maisSorteados = frequencyAnalyzer.analyze(dadosFiltrados, maxNumero, incluirZero);
        const menosSorteados = frequencyAnalyzer.getLeastFrequent(dadosFiltrados, maxNumero, incluirZero);
        const atraso = delayAnalyzer.analyze(dadosFiltrados, maxNumero, incluirZero);
        const duplas = pairsAnalyzer.analyze(dadosFiltrados);
        const triplas = triplesAnalyzer.analyze(dadosFiltrados);
        
        const columns = lottery === 'supersete' ? heatmapAnalyzer.analyze(dadosFiltrados, 7, 9) : undefined;
        
        const tendencia = trendAnalyzer.analyze(dadosFiltrados, maxNumero, incluirZero, 30);
        const entropia = entropyAnalyzer.analyze(dadosFiltrados, maxNumero, incluirZero);
        const distribuicao = distributionAnalyzer.analyze(dadosFiltrados, maxNumero, incluirZero);
        const grupos = groupAnalyzer.analyze(dadosFiltrados, maxNumero, incluirZero);
        const paridade = parityAnalyzer.analyze(dadosFiltrados);
        const sequencias = sequenceAnalyzer.analyze(dadosFiltrados);

        // 6. Analisar elementos extras (COM DADOS FILTRADOS)
        const extrasResult = this.extrasAnalyzer.analyze(lottery, dadosFiltrados, dadosExtrasFiltrados);

        const dataInicio = datasFiltradas[0] || 'N/A';
        const dataFim = datasFiltradas[datasFiltradas.length - 1] || 'N/A';

        // 7. Montar resultado
        const result: StatisticsResult = {
            success: true,
            totalDraws: dados.length,
            filteredDraws: dadosFiltrados.length,
            dataInicio,
            dataFim,
            maisSorteados,
            menosSorteados,
            duplas,
            triplas,
            atraso,
            tendencia,
            entropia,
            distribuicao,
            grupos,
            paridade,
            sequencias
        };

        // 8. Processar elementos extras
        if (lottery === 'timemania' && extrasResult.times) {
            result.elementosExtras = extrasResult.times.ranking.map((item: any) => ({
                nome: item.time,
                quantidade: item.quantidade
            }));
            result.timemania = extrasResult;
            result.nomeElemento = 'Time do Coração';
        }

        if (lottery === 'milionaria' && extrasResult.trevos) {
            result.trevos = extrasResult.trevos;
            result.nomeElemento = 'Trevo';
        }

        if (lottery === 'diadesorte' && extrasResult.meses) {
            const ranking = extrasResult.meses.ranking || [];
            result.elementosExtras = ranking.map((item: any) => ({
                nome: String(item.mes),
                quantidade: item.quantidade
            }));
            result.nomeElemento = 'Mês de Sorte';
        }

        if (columns) {
            result.columns = columns;
        }

        return result;
    }
}
