// ============================================
// CAMINHO: src/ai/evaluation/ConfidenceCalculator.ts
// ============================================
// Calculadora de confiança para motores.  02/09/2026
// A confiança representa a qualidade da evidência
// estatística disponível, e NÃO uma garantia de acerto.
// ============================================

export interface ConfidenceFactors {
    quantidadeConcursos: number;
    qualidadeEstatistica: number;
    quantidadeFiltros: number;
    estabilidade: number;
}

interface AnalysisValue {
    nome: string;
    valor: number;
}

export class ConfidenceCalculator {
    /**
     * Combina os fatores de confiança.
     *
     * Os pesos continuam compatíveis com a arquitetura atual.
     * O que muda é a origem dos fatores: calcularCompleta()
     * não utiliza mais valores estatísticos arbitrários.
     */
    calcular(factors: ConfidenceFactors): number {
        this.validarFator(factors.quantidadeConcursos, 'quantidadeConcursos');
        this.validarFator(factors.qualidadeEstatistica, 'qualidadeEstatistica');
        this.validarFator(factors.quantidadeFiltros, 'quantidadeFiltros');
        this.validarFator(factors.estabilidade, 'estabilidade');

        const pesos = {
            quantidadeConcursos: 0.30,
            qualidadeEstatistica: 0.30,
            quantidadeFiltros: 0.20,
            estabilidade: 0.20
        };

        return this.limitar(
            factors.quantidadeConcursos * pesos.quantidadeConcursos +
            factors.qualidadeEstatistica * pesos.qualidadeEstatistica +
            factors.quantidadeFiltros * pesos.quantidadeFiltros +
            factors.estabilidade * pesos.estabilidade
        );
    }

    /**
     * Quanto maior a amostra histórica, maior a confiabilidade
     * da estimativa estatística.
     *
     * A função é contínua, evitando saltos artificiais entre
     * faixas fixas de quantidade de concursos.
     */
    calcularPorQuantidade(totalConcursos: number): number {
        if (!Number.isFinite(totalConcursos) || totalConcursos < 0) {
            throw new Error(
                'ConfidenceCalculator.calcularPorQuantidade: totalConcursos inválido.'
            );
        }

        if (totalConcursos === 0) return 0;

        // Crescimento assintótico:
        // 50 concursos -> ~37
        // 100 -> ~50
        // 200 -> ~63
        // 500 -> ~80
        // 1000 -> ~91
        const escala = 100;
        const fator = totalConcursos / (totalConcursos + escala);

        return this.limitar(fator * 100);
    }

    /**
     * Calcula a qualidade média de análises que já tenham
     * produzido valores normalizados em 0..100.
     */
    calcularPorQualidade(analises: AnalysisValue[]): number {
        if (!Array.isArray(analises) || analises.length === 0) {
            throw new Error(
                'ConfidenceCalculator.calcularPorQualidade: nenhuma análise fornecida.'
            );
        }

        for (const analise of analises) {
            if (
                !analise ||
                typeof analise.nome !== 'string' ||
                !Number.isFinite(analise.valor)
            ) {
                throw new Error(
                    'ConfidenceCalculator.calcularPorQualidade: análise inválida.'
                );
            }

            this.validarFator(analise.valor, `qualidade:${analise.nome}`);
        }

        const total = analises.reduce((acc, analise) => acc + analise.valor, 0);

        return this.limitar(total / analises.length);
    }

    /**
     * Quantidade de evidências/filtros utilizados pelo motor.
     *
     * Mantém a assinatura pública existente para compatibilidade.
     */
    calcularPorFiltros(quantidade: number, maximo: number = 10): number {
        if (!Number.isInteger(quantidade) || quantidade < 0) {
            throw new Error(
                'ConfidenceCalculator.calcularPorFiltros: quantidade inválida.'
            );
        }

        if (!Number.isInteger(maximo) || maximo <= 0) {
            throw new Error(
                'ConfidenceCalculator.calcularPorFiltros: maximo inválido.'
            );
        }

        return this.limitar((Math.min(quantidade, maximo) / maximo) * 100);
    }

    /**
     * Mede estabilidade da distribuição histórica.
     *
     * A versão anterior utilizava apenas o desvio-padrão das
     * frequências globais. Isso mistura "estabilidade" com
     * concentração da distribuição.
     *
     * Aqui usamos estabilidade temporal: dividimos o histórico
     * em janelas e verificamos quanto as frequências das janelas
     * se aproximam da distribuição global.
     */
    calcularEstabilidade(dados: number[][]): number {
        this.validarDados(dados);

        if (dados.length < 2) {
            return 0;
        }

        const global = this.contarFrequencias(dados);
        const numeros = Array.from(global.keys());

        if (numeros.length === 0) {
            return 0;
        }

        const quantidadeJanelas = Math.min(
            5,
            Math.max(2, Math.floor(dados.length / 20))
        );

        const tamanhoJanela = Math.floor(dados.length / quantidadeJanelas);

        if (tamanhoJanela < 1) {
            return 0;
        }

        const totalGlobal = dados.length;
        const globalTaxas = new Map<number, number>();

        for (const numero of numeros) {
            globalTaxas.set(
                numero,
                (global.get(numero) || 0) / totalGlobal
            );
        }

        const divergencias: number[] = [];

        for (let janela = 0; janela < quantidadeJanelas; janela++) {
            const inicio = janela * tamanhoJanela;
            const fim =
                janela === quantidadeJanelas - 1
                    ? dados.length
                    : Math.min(dados.length, inicio + tamanhoJanela);

            if (fim <= inicio) continue;

            const recorte = dados.slice(inicio, fim);
            const local = this.contarFrequencias(recorte);

            let divergencia = 0;

            for (const numero of numeros) {
                const taxaGlobal = globalTaxas.get(numero) || 0;
                const taxaLocal = (local.get(numero) || 0) / recorte.length;

                divergencia += Math.abs(taxaLocal - taxaGlobal);
            }

            // A soma das diferenças absolutas pode ultrapassar 1.
            // Normalizamos pela escala máxima observável da métrica.
            divergencias.push(Math.min(1, divergencia));
        }

        if (divergencias.length === 0) {
            return 0;
        }

        const divergenciaMedia =
            divergencias.reduce((a, b) => a + b, 0) / divergencias.length;

        return this.limitar((1 - divergenciaMedia) * 100);
    }

    /**
     * Avalia a qualidade estrutural dos dados históricos.
     *
     * Não tenta afirmar que um número é mais provável de sair.
     * Mede somente se a base fornecida é adequada para análise:
     * - concursos válidos;
     * - quantidade de números consistente;
     * - ausência de duplicatas dentro do concurso;
     * - cobertura razoável da faixa observada.
     */
    calcularQualidadeDosDados(dados: number[][]): number {
        this.validarDados(dados);

        if (dados.length === 0) {
            return 0;
        }

        const tamanhos = dados.map(jogo => jogo.length);
        const tamanhoReferencia = tamanhos[0];

        const consistenciaTamanho =
            tamanhos.filter(t => t === tamanhoReferencia).length /
            tamanhos.length;

        let concursosSemDuplicatas = 0;

        for (const jogo of dados) {
            if (new Set(jogo).size === jogo.length) {
                concursosSemDuplicatas++;
            }
        }

        const consistenciaUnicidade =
            concursosSemDuplicatas / dados.length;

        const numeros = new Set<number>();

        for (const jogo of dados) {
            for (const numero of jogo) {
                numeros.add(numero);
            }
        }

        // Quanto mais elementos distintos houver, maior a cobertura
        // observável. A métrica é deliberadamente limitada para não
        // transformar bases enormes em confiança artificialmente alta.
        const cobertura = Math.min(1, numeros.size / 100);

        return this.limitar(
            (
                consistenciaTamanho * 0.40 +
                consistenciaUnicidade * 0.40 +
                cobertura * 0.20
            ) * 100
        );
    }

    /**
     * Mantém a API usada pelos motores existentes.
     *
     * IMPORTANTE:
     * - Não há mais valores fixos como frequência=80,
     *   atraso=70 e dispersão=75.
     * - Os filtros informam apenas quantas fontes de evidência
     *   o motor declarou utilizar.
     * - A qualidade estatística é derivada dos dados reais.
     *
     * O aprendizado preditivo/backtesting ficará em camada própria;
     * esta classe não inventa desempenho histórico que não recebeu.
     */
    calcularCompleta(
        dados: number[][],
        filtrosAplicados: string[]
    ): { confianca: number; fatores: ConfidenceFactors } {
        this.validarDados(dados);

        if (!Array.isArray(filtrosAplicados)) {
            throw new Error(
                'ConfidenceCalculator.calcularCompleta: filtrosAplicados inválido.'
            );
        }

        const filtrosValidos = filtrosAplicados.filter(
            filtro => typeof filtro === 'string' && filtro.trim().length > 0
        );

        if (filtrosValidos.length !== filtrosAplicados.length) {
            throw new Error(
                'ConfidenceCalculator.calcularCompleta: filtrosAplicados contém valores inválidos.'
            );
        }

        const qualidadeDados = this.calcularQualidadeDosDados(dados);
        const estabilidade = this.calcularEstabilidade(dados);

        /*
         * Sem backtesting disponível nesta classe, a qualidade estatística
         * representa somente a qualidade estrutural/estabilidade da base.
         * Ela NÃO representa taxa histórica de acerto.
         */
        const qualidadeEstatistica = this.calcularPorQualidade([
            { nome: 'qualidadeDados', valor: qualidadeDados },
            { nome: 'estabilidade', valor: estabilidade }
        ]);

        const fatores: ConfidenceFactors = {
            quantidadeConcursos: this.calcularPorQuantidade(dados.length),
            qualidadeEstatistica,
            quantidadeFiltros: this.calcularPorFiltros(filtrosValidos.length),
            estabilidade
        };

        return {
            confianca: this.calcular(fatores),
            fatores
        };
    }

    explicarConfianca(confianca: number): string {
        if (!Number.isFinite(confianca)) {
            throw new Error(
                'ConfidenceCalculator.explicarConfianca: confiança inválida.'
            );
        }

        const valor = this.limitar(confianca);

        if (valor >= 90) return '⭐ Excelente';
        if (valor >= 75) return '👍 Muito boa';
        if (valor >= 60) return '📊 Boa';
        if (valor >= 45) return '📈 Razoável';
        if (valor >= 30) return '📉 Baixa';
        return '⚠️ Muito baixa';
    }

    private validarFator(valor: number, nome: string): void {
        if (!Number.isFinite(valor)) {
            throw new Error(
                `ConfidenceCalculator: fator "${nome}" não é numérico.`
            );
        }

        if (valor < 0 || valor > 100) {
            throw new Error(
                `ConfidenceCalculator: fator "${nome}" deve estar entre 0 e 100.`
            );
        }
    }

    private validarDados(dados: number[][]): void {
        if (!Array.isArray(dados) || dados.length === 0) {
            throw new Error(
                'ConfidenceCalculator: dados históricos não podem estar vazios.'
            );
        }

        if (dados.some(jogo =>
            !Array.isArray(jogo) ||
            jogo.length === 0 ||
            jogo.some(
                numero =>
                    !Number.isInteger(numero) ||
                    numero < 0
            )
        )) {
            throw new Error(
                'ConfidenceCalculator: dados históricos contêm jogos inválidos.'
            );
        }
    }

    private contarFrequencias(dados: number[][]): Map<number, number> {
        const frequencias = new Map<number, number>();

        for (const jogo of dados) {
            for (const numero of new Set(jogo)) {
                frequencias.set(
                    numero,
                    (frequencias.get(numero) || 0) + 1
                );
            }
        }

        return frequencias;
    }

    private limitar(valor: number): number {
        return Math.max(0, Math.min(100, valor));
    }
}
