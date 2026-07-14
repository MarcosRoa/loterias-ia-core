// ============================================
// CAMINHO: src/statistics/StatisticsEngine.ts
// ============================================
// ORQUESTRADOR - APENAS CHAMA OS ANALISADORES (CORRETO)
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

        // 2. Aplicar filtro de período
        const { dadosFiltrados, datasFiltradas } = this.normalizer.filterByPeriod(dados, datas, period);

        if (dadosFiltrados.length === 0) {
            return {
                success: false,
                error: `Nenhum dado no período selecionado para ${lottery}`
            };
        }

        const maxNumero = config.maxNumero;
        const incluirZero = config.incluirZero || false;

        // 3. Criar analisadores
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

        // 4. Executar análises
        const maisSorteados = frequencyAnalyzer.analyze(dadosFiltrados, maxNumero, incluirZero);
        const menosSorteados = frequencyAnalyzer.getLeastFrequent(dadosFiltrados, maxNumero, incluirZero);
        const atraso = delayAnalyzer.analyze(dadosFiltrados, maxNumero, incluirZero);
        const duplas = pairsAnalyzer.analyze(dadosFiltrados);
        const triplas = triplesAnalyzer.analyze(dadosFiltrados);
        
        // ✅ Heatmap: dados brutos (com ordem preservada)
        const columns = lottery === 'supersete' ? heatmapAnalyzer.analyze(dadosFiltrados, 7, 9) : undefined;
        
        const tendencia = trendAnalyzer.analyze(dadosFiltrados, maxNumero, incluirZero, 30);
        const entropia = entropyAnalyzer.analyze(dadosFiltrados, maxNumero, incluirZero);
        const distribuicao = distributionAnalyzer.analyze(dadosFiltrados, maxNumero, incluirZero);
        const grupos = groupAnalyzer.analyze(dadosFiltrados, maxNumero, incluirZero);
        const paridade = parityAnalyzer.analyze(dadosFiltrados);
        const sequencias = sequenceAnalyzer.analyze(dadosFiltrados);

        // 5. Analisar elementos extras
        const extrasResult = this.extrasAnalyzer.analyze(lottery, dadosFiltrados, dadosExtras || []);

        const dataInicio = datasFiltradas[0] || 'N/A';
        const dataFim = datasFiltradas[datasFiltradas.length - 1] || 'N/A';

        // 6. Montar resultado
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

        if (lottery === 'timemania' && extrasResult.times) {
            result.elementosExtras = extrasResult.times.ranking.map((item: any) => ({
                nome: item.time,
                quantidade: item.quantidade
            }));
            result.timemania = extrasResult;
        }

        if (lottery === 'milionaria' && extrasResult.trevos) {
            result.trevos = extrasResult.trevos;
        }

        if (lottery === 'diadesorte' && extrasResult.meses) {
            result.elementosExtras = extrasResult.meses.ranking.map((item: any) => ({
                nome: String(item.mes),
                quantidade: item.quantidade
            }));
        }

        if (columns) {
            result.columns = columns;
        }

        return result;
    }
}
