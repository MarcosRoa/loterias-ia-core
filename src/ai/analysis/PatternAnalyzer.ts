// ============================================
// CAMINHO: src/ai/analysis/PatternAnalyzer.ts
// ============================================
// Análise estatística de padrões: ciclos, duplas,
// intervalos, dezenas e repetições.  02/09/2026
// ============================================

export interface Pattern {
    nome: string;
    tipo: 'ciclo' | 'dupla' | 'intervalo' | 'dezenas' | 'repeticao';
    valor: any;
    confianca: number;
    ocorrencias: number;
}

interface CycleData {
    posicoes: number[];
    intervalos: number[];
}

interface PatternStats {
    count: number;
    total: number;
}

export class PatternAnalyzer {
    private dados: number[][];
    private padroes: Pattern[] = [];

    constructor(dados: number[][]) {
        if (!Array.isArray(dados) || dados.length === 0) {
            throw new Error('PatternAnalyzer: dados históricos não podem estar vazios.');
        }

        if (dados.some(jogo =>
            !Array.isArray(jogo) ||
            jogo.length === 0 ||
            jogo.some(n => !Number.isInteger(n) || n <= 0)
        )) {
            throw new Error('PatternAnalyzer: dados históricos contêm jogos inválidos.');
        }

        this.dados = dados.map(jogo => [...jogo]);
        this.detectarTodosPadroes();
    }

    private detectarTodosPadroes(): void {
        this.padroes = [];
        this.detectarCiclos();
        this.detectarDuplas();
        this.detectarIntervalos();
        this.detectarDezenas();
        this.detectarRepeticoes();
    }

    /**
     * Mede a regularidade de uma sequência de intervalos.
     * Quanto mais vezes o intervalo dominante aparece, maior a evidência.
     */
    private calcularRegularidade(intervalos: number[]): number {
        if (intervalos.length === 0) return 0;

        const frequencias = new Map<number, number>();

        for (const intervalo of intervalos) {
            frequencias.set(intervalo, (frequencias.get(intervalo) || 0) + 1);
        }

        let maior = 0;
        for (const quantidade of frequencias.values()) {
            maior = Math.max(maior, quantidade);
        }

        return maior / intervalos.length;
    }

    /**
     * Converte evidência observada em confiança.
     * Não é uma "probabilidade de acerto"; é uma medida de
     * consistência histórica do padrão observado.
     */
    private calcularConfianca(
        regularidade: number,
        ocorrencias: number,
        baseMinima: number,
        teto: number
    ): number {
        if (ocorrencias < baseMinima || regularidade <= 0) return 0;

        const evidencia = Math.min(1, ocorrencias / 20);
        const confianca = (regularidade * 70) + (evidencia * 30);

        return Math.max(0, Math.min(teto, confianca));
    }

    private detectarCiclos(): void {
        const ciclos = new Map<number, CycleData>();

        for (let i = 0; i < this.dados.length; i++) {
            for (const num of this.dados[i]) {
                if (!ciclos.has(num)) {
                    ciclos.set(num, { posicoes: [], intervalos: [] });
                }

                ciclos.get(num)!.posicoes.push(i);
            }
        }

        for (const [num, data] of ciclos) {
            if (data.posicoes.length < 3) continue;

            for (let i = 1; i < data.posicoes.length; i++) {
                data.intervalos.push(
                    data.posicoes[i] - data.posicoes[i - 1]
                );
            }

            const frequencias = new Map<number, number>();

            for (const intervalo of data.intervalos) {
                frequencias.set(
                    intervalo,
                    (frequencias.get(intervalo) || 0) + 1
                );
            }

            let intervaloPrincipal = 0;
            let maiorFrequencia = 0;

            for (const [intervalo, frequencia] of frequencias) {
                if (
                    frequencia > maiorFrequencia ||
                    (frequencia === maiorFrequencia && intervalo < intervaloPrincipal)
                ) {
                    maiorFrequencia = frequencia;
                    intervaloPrincipal = intervalo;
                }
            }

            const regularidade = this.calcularRegularidade(data.intervalos);
            const confianca = this.calcularConfianca(
                regularidade,
                data.posicoes.length,
                3,
                90
            );

            if (confianca >= 45 && intervaloPrincipal > 0) {
                this.padroes.push({
                    nome: `Ciclo do ${num}`,
                    tipo: 'ciclo',
                    valor: {
                        numero: num,
                        intervalo: intervaloPrincipal,
                        regularidade
                    },
                    confianca,
                    ocorrencias: data.posicoes.length
                });
            }
        }
    }

    private detectarDuplas(): void {
        const duplas = new Map<string, number>();

        for (const jogo of this.dados) {
            const unicos = [...new Set(jogo)].sort((a, b) => a - b);

            for (let i = 0; i < unicos.length; i++) {
                for (let j = i + 1; j < unicos.length; j++) {
                    const key = `${unicos[i]}-${unicos[j]}`;
                    duplas.set(key, (duplas.get(key) || 0) + 1);
                }
            }
        }

        const totalConcursos = this.dados.length;

        for (const [dupla, count] of duplas) {
            if (count < 3) continue;

            const frequenciaRelativa = count / totalConcursos;

            // Evidência de coocorrência: mais importante que uma
            // contagem absoluta, pois respeita o tamanho da amostra.
            const confianca = Math.min(
                90,
                (frequenciaRelativa * 100 * 0.7) +
                (Math.min(1, count / 20) * 30)
            );

            if (confianca >= 35) {
                this.padroes.push({
                    nome: `Dupla ${dupla}`,
                    tipo: 'dupla',
                    valor: dupla.split('-').map(Number),
                    confianca,
                    ocorrencias: count
                });
            }
        }
    }

    private detectarIntervalos(): void {
        /*
         * Mantemos o conceito original de intervalo entre concursos,
         * mas agora medimos a distribuição dos intervalos em toda a
         * sequência, em vez de dividir count por total do próprio grupo.
         */
        const intervalos = new Map<number, PatternStats>();
        const serie: number[] = [];

        for (const jogo of this.dados) {
            if (jogo.length > 0) {
                serie.push(jogo[0]);
            }
        }

        for (let i = 1; i < serie.length; i++) {
            const diff = Math.abs(serie[i] - serie[i - 1]);

            if (diff <= 0) continue;

            if (!intervalos.has(diff)) {
                intervalos.set(diff, { count: 0, total: 0 });
            }

            const data = intervalos.get(diff)!;
            data.count++;
            data.total++;
        }

        const totalIntervalos = serie.length - 1;

        for (const [intervalo, data] of intervalos) {
            if (data.count < 3 || totalIntervalos <= 0) continue;

            const frequenciaRelativa = data.count / totalIntervalos;

            const confianca = Math.min(
                85,
                (frequenciaRelativa * 100 * 0.7) +
                (Math.min(1, data.count / 20) * 30)
            );

            if (confianca >= 35) {
                this.padroes.push({
                    nome: `Intervalo ${intervalo}`,
                    tipo: 'intervalo',
                    valor: intervalo,
                    confianca,
                    ocorrencias: data.count
                });
            }
        }
    }

    private detectarDezenas(): void {
        const dezenas = new Map<string, number>();

        for (const jogo of this.dados) {
            const faixas = jogo
                .map(n => Math.floor((n - 1) / 10) + 1)
                .sort((a, b) => a - b);

            const key = faixas.join('-');
            dezenas.set(key, (dezenas.get(key) || 0) + 1);
        }

        const totalConcursos = this.dados.length;

        for (const [padrao, count] of dezenas) {
            if (count < 2) continue;

            const frequenciaRelativa = count / totalConcursos;

            const confianca = Math.min(
                80,
                (frequenciaRelativa * 100 * 0.7) +
                (Math.min(1, count / 20) * 30)
            );

            if (confianca >= 30) {
                this.padroes.push({
                    nome: `Dezenas ${padrao}`,
                    tipo: 'dezenas',
                    valor: padrao.split('-').map(Number),
                    confianca,
                    ocorrencias: count
                });
            }
        }
    }

    private detectarRepeticoes(): void {
        const repeticoes = new Map<number, number>();
        const repeticoesRecentes = new Map<number, number>();

        for (let i = 0; i < this.dados.length; i++) {
            const jogoAtual = new Set(this.dados[i]);

            for (const num of jogoAtual) {
                repeticoes.set(num, (repeticoes.get(num) || 0) + 1);

                if (i > 0) {
                    const anterior = new Set(this.dados[i - 1]);

                    if (anterior.has(num)) {
                        repeticoesRecentes.set(
                            num,
                            (repeticoesRecentes.get(num) || 0) + 1
                        );
                    }
                }
            }
        }

        for (const [num, ocorrencias] of repeticoesRecentes) {
            if (ocorrencias < 2) continue;

            const totalOcorrencias = repeticoes.get(num) || 0;

            if (totalOcorrencias === 0) continue;

            const taxaRepeticao = ocorrencias / totalOcorrencias;

            const confianca = Math.min(
                85,
                (taxaRepeticao * 100 * 0.7) +
                (Math.min(1, ocorrencias / 10) * 30)
            );

            if (confianca >= 35) {
                this.padroes.push({
                    nome: `Repetição ${num}`,
                    tipo: 'repeticao',
                    valor: num,
                    confianca,
                    ocorrencias
                });
            }
        }
    }

    getPadroes(): Pattern[] {
        return [...this.padroes];
    }

    getMelhoresPadroes(quantidade: number): Pattern[] {
        if (!Number.isInteger(quantidade) || quantidade < 0) {
            throw new Error('PatternAnalyzer.getMelhoresPadroes: quantidade inválida.');
        }

        return [...this.padroes]
            .sort((a, b) =>
                b.confianca - a.confianca ||
                b.ocorrencias - a.ocorrencias ||
                a.nome.localeCompare(b.nome)
            )
            .slice(0, quantidade);
    }

    getPadroesPorTipo(tipo: Pattern['tipo']): Pattern[] {
        return this.padroes.filter(p => p.tipo === tipo);
    }

    /**
     * Gera números relacionados a um padrão de forma determinística.
     *
     * Observação: este método preserva a assinatura existente. Como o
     * contrato atual não recebe seed nem FrequencyAnalyzer, a seleção
     * complementar é determinística pela ordem histórica dos dados.
     * A seleção probabilística principal continua pertencendo às camadas
     * de score/strategy.
     */
    gerarNumerosPorPadrao(
        padrao: Pattern,
        quantidade: number,
        maxNumero: number
    ): number[] {
        if (!Number.isInteger(quantidade) || quantidade < 0) {
            throw new Error('PatternAnalyzer.gerarNumerosPorPadrao: quantidade inválida.');
        }

        if (!Number.isInteger(maxNumero) || maxNumero <= 0) {
            throw new Error('PatternAnalyzer.gerarNumerosPorPadrao: maxNumero inválido.');
        }

        if (quantidade === 0) return [];

        if (!padrao || !padrao.tipo) {
            throw new Error('PatternAnalyzer.gerarNumerosPorPadrao: padrão inválido.');
        }

        const numeros = new Set<number>();

        switch (padrao.tipo) {
            case 'ciclo': {
                const { numero, intervalo } = padrao.valor;

                if (
                    !Number.isInteger(numero) ||
                    !Number.isInteger(intervalo) ||
                    intervalo <= 0
                ) {
                    throw new Error('PatternAnalyzer: padrão de ciclo inválido.');
                }

                // Primeiro tenta a projeção do próprio número do ciclo.
                for (let i = 1; i <= quantidade; i++) {
                    const num = numero + (intervalo * i);

                    if (num >= 1 && num <= maxNumero) {
                        numeros.add(num);
                    }
                }

                break;
            }

            case 'dupla': {
                const [n1, n2] = padrao.valor;

                if (
                    !Number.isInteger(n1) ||
                    !Number.isInteger(n2) ||
                    n1 < 1 ||
                    n2 < 1 ||
                    n1 > maxNumero ||
                    n2 > maxNumero
                ) {
                    throw new Error('PatternAnalyzer: padrão de dupla inválido.');
                }

                numeros.add(n1);
                numeros.add(n2);
                break;
            }

            case 'intervalo': {
                if (
                    !Number.isInteger(padrao.valor) ||
                    padrao.valor <= 0
                ) {
                    throw new Error('PatternAnalyzer: padrão de intervalo inválido.');
                }

                const ultimo = this.dados[this.dados.length - 1][0];

                for (let i = 1; i <= quantidade; i++) {
                    const num = ultimo + (padrao.valor * i);

                    if (num >= 1 && num <= maxNumero) {
                        numeros.add(num);
                    }
                }

                break;
            }

            case 'repeticao': {
                if (
                    !Number.isInteger(padrao.valor) ||
                    padrao.valor < 1 ||
                    padrao.valor > maxNumero
                ) {
                    throw new Error('PatternAnalyzer: padrão de repetição inválido.');
                }

                numeros.add(padrao.valor);
                break;
            }

            case 'dezenas': {
                const faixas = padrao.valor;

                if (!Array.isArray(faixas) || faixas.length === 0) {
                    throw new Error('PatternAnalyzer: padrão de dezenas inválido.');
                }

                // Escolha determinística: procura nos dados históricos, da
                // observação mais recente para a mais antiga, o primeiro
                // número disponível em cada faixa.
                for (const faixa of faixas) {
                    if (!Number.isInteger(faixa) || faixa <= 0) {
                        throw new Error('PatternAnalyzer: faixa de dezena inválida.');
                    }

                    const min = (faixa - 1) * 10 + 1;
                    const max = Math.min(faixa * 10, maxNumero);

                    let encontrado = 0;

                    for (let i = this.dados.length - 1; i >= 0 && !encontrado; i--) {
                        for (const num of this.dados[i]) {
                            if (num >= min && num <= max) {
                                encontrado = num;
                                break;
                            }
                        }
                    }

                    if (encontrado > 0) {
                        numeros.add(encontrado);
                    }
                }

                break;
            }

            default:
                throw new Error(
                    `PatternAnalyzer: tipo de padrão não suportado: ${String((padrao as any).tipo)}`
                );
        }

        if (numeros.size > quantidade) {
            return Array.from(numeros)
                .sort((a, b) => a - b)
                .slice(0, quantidade);
        }

        /*
         * Não usamos Math.random() para preencher.
         * A complementação segue uma sequência determinística baseada
         * no histórico, sem mascarar falhas.
         */
        if (numeros.size < quantidade) {
            const candidatos: number[] = [];

            for (let i = this.dados.length - 1; i >= 0; i--) {
                for (const num of this.dados[i]) {
                    if (
                        num >= 1 &&
                        num <= maxNumero &&
                        !numeros.has(num) &&
                        !candidatos.includes(num)
                    ) {
                        candidatos.push(num);
                    }
                }
            }

            for (const num of candidatos) {
                if (numeros.size >= quantidade) break;
                numeros.add(num);
            }
        }

        if (numeros.size < quantidade) {
            for (let num = 1; num <= maxNumero && numeros.size < quantidade; num++) {
                if (!numeros.has(num)) {
                    numeros.add(num);
                }
            }
        }

        if (numeros.size < quantidade) {
            throw new Error(
                `PatternAnalyzer: não foi possível gerar ${quantidade} números únicos até ${maxNumero}.`
            );
        }

        return Array.from(numeros).sort((a, b) => a - b);
    }
}
