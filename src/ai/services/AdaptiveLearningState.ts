// ============================================
// src/ai/services/AdaptiveLearningState.ts
// ============================================

// ============================================
// ADAPTIVE LEARNING STATE  03/09/2026
// ============================================
// Mantém o estado do aprendizado adaptativo.
//
// Responsabilidades:
// - armazenar pesos atuais;
// - manter pesos anteriores;
// - registrar ciclos de aprendizado;
// - registrar alterações;
// - manter estabilidade;
// - guardar última avaliação;
// - separar estado por loteria;
// - fornecer snapshots seguros.
//
// IMPORTANTE:
// - Não persiste no banco.
// - Não altera Supabase.
// - Não executa aprendizado.
// - Não gera jogos.
// - Não usa aleatoriedade.
// - Não mascara dados inválidos.
//
// A persistência será definida posteriormente,
// sem modificar o schema existente.
// ============================================

import {
    AdaptiveLearningWeights,
    AdaptiveLearningResult
} from './AdaptiveLearning';

export interface LearningCycleRecord {
    ciclo: number;
    timestamp: number;
    estabilidade: number;
    alteracoesAplicadas: number;
    ajustes: AdaptiveLearningResult['ajustes'];
}

export interface AdaptiveLearningStateData {
    loteria: string;

    cicloAtual: number;

    pesosAtuais: AdaptiveLearningWeights;

    pesosAnteriores: AdaptiveLearningWeights;

    estabilidade: number;

    ultimaAtualizacao: number | null;

    historico: LearningCycleRecord[];
}

export class AdaptiveLearningState {

    private estado: AdaptiveLearningStateData;

    constructor(
        loteria: string,
        pesosIniciais: AdaptiveLearningWeights
    ) {

        this.validarLoteria(loteria);
        this.validarPesos(pesosIniciais);

        const pesos = {
            ...pesosIniciais
        };

        this.estado = {
            loteria,
            cicloAtual: 0,
            pesosAtuais: pesos,
            pesosAnteriores: {
                ...pesos
            },
            estabilidade: 1,
            ultimaAtualizacao: null,
            historico: []
        };
    }

    /**
     * Retorna a loteria associada ao estado.
     */
    public getLoteria(): string {
        return this.estado.loteria;
    }

    /**
     * Retorna o ciclo atual.
     */
    public getCicloAtual(): number {
        return this.estado.cicloAtual;
    }

    /**
     * Retorna cópia dos pesos atuais.
     */
    public getPesosAtuais(): AdaptiveLearningWeights {
        return {
            ...this.estado.pesosAtuais
        };
    }

    /**
     * Retorna cópia dos pesos anteriores.
     */
    public getPesosAnteriores(): AdaptiveLearningWeights {
        return {
            ...this.estado.pesosAnteriores
        };
    }

    /**
     * Retorna estabilidade atual.
     */
    public getEstabilidade(): number {
        return this.estado.estabilidade;
    }

    /**
     * Retorna timestamp da última atualização.
     */
    public getUltimaAtualizacao(): number | null {
        return this.estado.ultimaAtualizacao;
    }

    /**
     * Retorna histórico sem permitir alteração
     * direto do estado interno.
     */
    public getHistorico(): LearningCycleRecord[] {

        return this.estado.historico.map(
            ciclo => ({
                ...ciclo,
                ajustes: ciclo.ajustes.map(
                    ajuste => ({
                        ...ajuste
                    })
                )
            })
        );
    }

    /**
     * Aplica o resultado de um ciclo de aprendizado.
     */
    public aplicarResultado(
        resultado: AdaptiveLearningResult
    ): void {

        this.validarResultado(resultado);

        this.estado.pesosAnteriores = {
            ...resultado.pesosAnteriores
        };

        this.estado.pesosAtuais = {
            ...resultado.pesosNovos
        };

        this.estado.cicloAtual += 1;

        this.estado.estabilidade =
            resultado.estabilidade;

        this.estado.ultimaAtualizacao =
            Date.now();

        const registro: LearningCycleRecord = {
            ciclo: this.estado.cicloAtual,
            timestamp: this.estado.ultimaAtualizacao,
            estabilidade: resultado.estabilidade,
            alteracoesAplicadas:
                resultado.alteracoesAplicadas,
            ajustes: resultado.ajustes.map(
                ajuste => ({
                    ...ajuste
                })
            )
        };

        this.estado.historico.push(
            registro
        );
    }

    /**
     * Retorna um snapshot completo do estado.
     */
    public getSnapshot(): AdaptiveLearningStateData {

        return {
            loteria: this.estado.loteria,
            cicloAtual: this.estado.cicloAtual,

            pesosAtuais: {
                ...this.estado.pesosAtuais
            },

            pesosAnteriores: {
                ...this.estado.pesosAnteriores
            },

            estabilidade:
                this.estado.estabilidade,

            ultimaAtualizacao:
                this.estado.ultimaAtualizacao,

            historico:
                this.getHistorico()
        };
    }

    /**
     * Restaura o estado a partir de um snapshot.
     *
     * Não permite mudar a loteria associada
     * ao objeto atual.
     */
    public restaurar(
        snapshot: AdaptiveLearningStateData
    ): void {

        this.validarSnapshot(snapshot);

        if (
            snapshot.loteria !==
            this.estado.loteria
        ) {
            throw new Error(
                `AdaptiveLearningState: snapshot pertence à loteria ` +
                `"${snapshot.loteria}", mas o estado atual pertence à ` +
                `"${this.estado.loteria}".`
            );
        }

        this.estado = {
            loteria: snapshot.loteria,

            cicloAtual:
                snapshot.cicloAtual,

            pesosAtuais: {
                ...snapshot.pesosAtuais
            },

            pesosAnteriores: {
                ...snapshot.pesosAnteriores
            },

            estabilidade:
                snapshot.estabilidade,

            ultimaAtualizacao:
                snapshot.ultimaAtualizacao,

            historico:
                snapshot.historico.map(
                    ciclo => ({
                        ...ciclo,
                        ajustes:
                            ciclo.ajustes.map(
                                ajuste => ({
                                    ...ajuste
                                })
                            )
                    })
                )
        };
    }

    /**
     * Limpa somente o histórico.
     *
     * Os pesos atuais permanecem intactos.
     */
    public limparHistorico(): void {
        this.estado.historico = [];
    }

    /**
     * Validação dos pesos.
     */
    private validarPesos(
        pesos: AdaptiveLearningWeights
    ): void {

        if (
            !pesos ||
            typeof pesos !== 'object' ||
            Array.isArray(pesos)
        ) {
            throw new Error(
                'AdaptiveLearningState: pesos inválidos.'
            );
        }

        const nomes =
            Object.keys(pesos);

        if (nomes.length === 0) {
            throw new Error(
                'AdaptiveLearningState: nenhum peso fornecido.'
            );
        }

        nomes.forEach(nome => {

            const peso =
                pesos[nome];

            if (
                typeof nome !== 'string' ||
                nome.trim().length === 0
            ) {
                throw new Error(
                    'AdaptiveLearningState: nome de fator inválido.'
                );
            }

            if (
                typeof peso !== 'number' ||
                !Number.isFinite(peso) ||
                peso <= 0
            ) {
                throw new Error(
                    `AdaptiveLearningState: peso inválido para "${nome}".`
                );
            }
        });
    }

    /**
     * Validação do resultado do aprendizado.
     */
    private validarResultado(
        resultado: AdaptiveLearningResult
    ): void {

        if (
            !resultado ||
            typeof resultado !== 'object'
        ) {
            throw new Error(
                'AdaptiveLearningState: resultado inválido.'
            );
        }

        this.validarPesos(
            resultado.pesosAnteriores
        );

        this.validarPesos(
            resultado.pesosNovos
        );

        if (
            !Number.isFinite(
                resultado.estabilidade
            ) ||
            resultado.estabilidade < 0 ||
            resultado.estabilidade > 1
        ) {
            throw new Error(
                'AdaptiveLearningState: estabilidade inválida.'
            );
        }

        if (
            !Number.isInteger(
                resultado.alteracoesAplicadas
            ) ||
            resultado.alteracoesAplicadas < 0
        ) {
            throw new Error(
                'AdaptiveLearningState: quantidade de alterações inválida.'
            );
        }

        if (!Array.isArray(resultado.ajustes)) {
            throw new Error(
                'AdaptiveLearningState: ajustes inválidos.'
            );
        }
    }

    /**
     * Validação do snapshot.
     */
    private validarSnapshot(
        snapshot: AdaptiveLearningStateData
    ): void {

        if (
            !snapshot ||
            typeof snapshot !== 'object'
        ) {
            throw new Error(
                'AdaptiveLearningState: snapshot inválido.'
            );
        }

        this.validarLoteria(
            snapshot.loteria
        );

        if (
            !Number.isInteger(
                snapshot.cicloAtual
            ) ||
            snapshot.cicloAtual < 0
        ) {
            throw new Error(
                'AdaptiveLearningState: cicloAtual inválido.'
            );
        }

        this.validarPesos(
            snapshot.pesosAtuais
        );

        this.validarPesos(
            snapshot.pesosAnteriores
        );

        if (
            !Number.isFinite(
                snapshot.estabilidade
            ) ||
            snapshot.estabilidade < 0 ||
            snapshot.estabilidade > 1
        ) {
            throw new Error(
                'AdaptiveLearningState: estabilidade inválida.'
            );
        }

        if (
            snapshot.ultimaAtualizacao !== null &&
            (
                !Number.isFinite(
                    snapshot.ultimaAtualizacao
                ) ||
                snapshot.ultimaAtualizacao < 0
            )
        ) {
            throw new Error(
                'AdaptiveLearningState: timestamp inválido.'
            );
        }

        if (!Array.isArray(snapshot.historico)) {
            throw new Error(
                'AdaptiveLearningState: histórico inválido.'
            );
        }

        snapshot.historico.forEach(
            (ciclo, indice) => {

                if (
                    !ciclo ||
                    typeof ciclo !== 'object'
                ) {
                    throw new Error(
                        `AdaptiveLearningState: ciclo inválido no índice ${indice}.`
                    );
                }

                if (
                    !Number.isInteger(ciclo.ciclo) ||
                    ciclo.ciclo < 1
                ) {
                    throw new Error(
                        `AdaptiveLearningState: número do ciclo inválido no índice ${indice}.`
                    );
                }

                if (
                    !Number.isFinite(ciclo.timestamp) ||
                    ciclo.timestamp < 0
                ) {
                    throw new Error(
                        `AdaptiveLearningState: timestamp inválido no índice ${indice}.`
                    );
                }

                if (
                    !Number.isFinite(ciclo.estabilidade) ||
                    ciclo.estabilidade < 0 ||
                    ciclo.estabilidade > 1
                ) {
                    throw new Error(
                        `AdaptiveLearningState: estabilidade inválida no índice ${indice}.`
                    );
                }

                if (
                    !Number.isInteger(
                        ciclo.alteracoesAplicadas
                    ) ||
                    ciclo.alteracoesAplicadas < 0
                ) {
                    throw new Error(
                        `AdaptiveLearningState: alterações inválidas no índice ${indice}.`
                    );
                }

                if (!Array.isArray(ciclo.ajustes)) {
                    throw new Error(
                        `AdaptiveLearningState: ajustes inválidos no ciclo ${indice}.`
                    );
                }
            }
        );
    }

    /**
     * Validação da identificação da loteria.
     */
    private validarLoteria(
        loteria: string
    ): void {

        if (
            typeof loteria !== 'string' ||
            loteria.trim().length === 0
        ) {
            throw new Error(
                'AdaptiveLearningState: loteria inválida.'
            );
        }
    }
}
