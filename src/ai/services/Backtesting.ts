// ============================================
// src/ai/services/Backtesting.ts
// ============================================
// ============================================
// BACKTESTING 03/09/2026
// ============================================
// Validação temporal da inteligência preditiva.
//
// Objetivo:
// verificar, usando apenas dados disponíveis
// antes de cada concurso, como o modelo teria
// se comportado diante do resultado seguinte.
//
// Fluxo:
//
// histórico
//    ↓
// janela de treino
//    ↓
// features
//    ↓
// scoring
//    ↓
// previsão
//    ↓
// resultado real
//    ↓
// métricas
//
// IMPORTANTE:
// - Não olha o futuro.
// - Não altera pesos.
// - Não aprende.
// - Não gera jogos.
// - Não usa Math.random().
// - Não mascara erros.
// ============================================

export interface BacktestingConfig {
    minTreino: number;
    passo: number;
    maxTestes?: number;
}

export interface BacktestPrediction {
    concursoIndex: number;
    numerosPrevistos: number[];
    numerosReais: number[];
    acertos: number;
}

export interface BacktestResult {
    totalTestes: number;
    totalAcertos: number;
    mediaAcertos: number;
    melhorResultado: number;
    piorResultado: number;
    previsoes: BacktestPrediction[];
}

export interface BacktestModel {
    prever(
        dadosTreino: number[][]
    ): number[];
}

export class Backtesting {

    private readonly config: BacktestingConfig;

    constructor(config?: Partial<BacktestingConfig>) {

        this.config = {
            minTreino: config?.minTreino ?? 30,
            passo: config?.passo ?? 1,
            maxTestes: config?.maxTestes
        };

        this.validarConfig();
    }

    /**
     * Executa backtesting temporal.
     *
     * Para cada posição:
     *
     * dados[0 ... N-1] = treino
     * dados[N]          = teste
     *
     * O modelo recebe somente o passado.
     */
    public executar(
        dados: number[][],
        model: BacktestModel
    ): BacktestResult {

        this.validarDados(dados);

        if (!model || typeof model.prever !== 'function') {
            throw new Error(
                'Backtesting: modelo inválido. O modelo deve implementar prever().'
            );
        }

        const previsoes: BacktestPrediction[] = [];

        let testesExecutados = 0;

        for (
            let indice = this.config.minTreino;
            indice < dados.length;
            indice += this.config.passo
        ) {

            if (
                this.config.maxTestes !== undefined &&
                testesExecutados >= this.config.maxTestes
            ) {
                break;
            }

            const dadosTreino = dados
                .slice(0, indice)
                .map((concurso) => [...concurso]);

            const resultadoReal = [...dados[indice]];

            const numerosPrevistos = model.prever(dadosTreino);

            this.validarPrevisao(
                numerosPrevistos,
                resultadoReal,
                indice
            );

            const acertos = this.contarAcertos(
                numerosPrevistos,
                resultadoReal
            );

            previsoes.push({
                concursoIndex: indice,
                numerosPrevistos: [...numerosPrevistos],
                numerosReais: [...resultadoReal],
                acertos
            });

            testesExecutados++;
        }

        return this.calcularResultado(previsoes);
    }

    /**
     * Conta quantos números previstos apareceram
     * no resultado real.
     */
    public contarAcertos(
        previstos: number[],
        reais: number[]
    ): number {

        if (!Array.isArray(previstos)) {
            throw new Error(
                'Backtesting: previstos deve ser um array.'
            );
        }

        if (!Array.isArray(reais)) {
            throw new Error(
                'Backtesting: reais deve ser um array.'
            );
        }

        const reaisSet = new Set(reais);

        return previstos.filter(
            numero => reaisSet.has(numero)
        ).length;
    }

    /**
     * Calcula as métricas básicas do backtest.
     */
    private calcularResultado(
        previsoes: BacktestPrediction[]
    ): BacktestResult {

        if (previsoes.length === 0) {
            return {
                totalTestes: 0,
                totalAcertos: 0,
                mediaAcertos: 0,
                melhorResultado: 0,
                piorResultado: 0,
                previsoes: []
            };
        }

        const acertos = previsoes.map(
            previsao => previsao.acertos
        );

        const totalAcertos = acertos.reduce(
            (total, valor) => total + valor,
            0
        );

        const mediaAcertos =
            totalAcertos / previsoes.length;

        return {
            totalTestes: previsoes.length,
            totalAcertos,
            mediaAcertos,
            melhorResultado: Math.max(...acertos),
            piorResultado: Math.min(...acertos),
            previsoes
        };
    }

    /**
     * Validação dos dados históricos.
     */
    private validarDados(
        dados: number[][]
    ): void {

        if (!Array.isArray(dados)) {
            throw new Error(
                'Backtesting: dados deve ser um array de concursos.'
            );
        }

        if (dados.length < this.config.minTreino + 1) {
            throw new Error(
                `Backtesting: dados insuficientes. ` +
                `São necessários pelo menos ` +
                `${this.config.minTreino + 1} concursos. ` +
                `Recebidos: ${dados.length}.`
            );
        }

        dados.forEach((concurso, indice) => {

            if (!Array.isArray(concurso)) {
                throw new Error(
                    `Backtesting: concurso inválido no índice ${indice}.`
                );
            }

            if (concurso.length === 0) {
                throw new Error(
                    `Backtesting: concurso vazio no índice ${indice}.`
                );
            }

            concurso.forEach(numero => {

                if (
                    typeof numero !== 'number' ||
                    !Number.isFinite(numero) ||
                    !Number.isInteger(numero) ||
                    numero < 0
                ) {
                    throw new Error(
                        `Backtesting: número inválido no concurso ${indice}: ${numero}`
                    );
                }
            });
        });
    }

    /**
     * Validação da previsão produzida pelo modelo.
     */
    private validarPrevisao(
        previstos: number[],
        reais: number[],
        indice: number
    ): void {

        if (!Array.isArray(previstos)) {
            throw new Error(
                `Backtesting: modelo retornou previsão inválida no teste ${indice}.`
            );
        }

        if (previstos.length === 0) {
            throw new Error(
                `Backtesting: modelo retornou previsão vazia no teste ${indice}.`
            );
        }

        const conjunto = new Set<number>();

        previstos.forEach(numero => {

            if (
                typeof numero !== 'number' ||
                !Number.isFinite(numero) ||
                !Number.isInteger(numero) ||
                numero < 0
            ) {
                throw new Error(
                    `Backtesting: previsão contém número inválido no teste ${indice}: ${numero}`
                );
            }

            if (conjunto.has(numero)) {
                throw new Error(
                    `Backtesting: previsão contém número duplicado ` +
                    `(${numero}) no teste ${indice}.`
                );
            }

            conjunto.add(numero);
        });

        if (!Array.isArray(reais) || reais.length === 0) {
            throw new Error(
                `Backtesting: resultado real inválido no teste ${indice}.`
            );
        }
    }

    /**
     * Valida a configuração.
     */
    private validarConfig(): void {

        if (
            !Number.isInteger(this.config.minTreino) ||
            this.config.minTreino < 1
        ) {
            throw new Error(
                'Backtesting: minTreino deve ser um inteiro maior que zero.'
            );
        }

        if (
            !Number.isInteger(this.config.passo) ||
            this.config.passo < 1
        ) {
            throw new Error(
                'Backtesting: passo deve ser um inteiro maior que zero.'
            );
        }

        if (
            this.config.maxTestes !== undefined &&
            (
                !Number.isInteger(this.config.maxTestes) ||
                this.config.maxTestes < 1
            )
        ) {
            throw new Error(
                'Backtesting: maxTestes deve ser um inteiro maior que zero.'
            );
        }
    }
}
