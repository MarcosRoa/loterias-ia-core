// ============================================
// CAMINHO: src/ai/analysis/PatternAnalyzer.ts
// ============================================
// Análise de padrões: ciclos, duplas, intervalos, etc.
// ============================================

export interface Pattern {
    nome: string;
    tipo: 'ciclo' | 'dupla' | 'intervalo' | 'dezenas' | 'repeticao';
    valor: any;
    confianca: number;
    ocorrencias: number;
}

export class PatternAnalyzer {
    private dados: number[][];
    private padroes: Pattern[] = [];

    constructor(dados: number[][]) {
        this.dados = dados;
        this.detectarTodosPadroes();
    }

    private detectarTodosPadroes(): void {
        this.detectarCiclos();
        this.detectarDuplas();
        this.detectarIntervalos();
        this.detectarDezenas();
        this.detectarRepeticoes();
    }

    private detectarCiclos(): void {
        const ciclos = new Map<number, { posicoes: number[], intervalos: number[] }>();

        for (let i = 0; i < this.dados.length; i++) {
            for (const num of this.dados[i]) {
                if (!ciclos.has(num)) {
                    ciclos.set(num, { posicoes: [], intervalos: [] });
                }
                ciclos.get(num)!.posicoes.push(i);
            }
        }

        for (const [num, data] of ciclos) {
            if (data.posicoes.length > 2) {
                const intervalos: number[] = [];
                for (let i = 1; i < data.posicoes.length; i++) {
                    intervalos.push(data.posicoes[i] - data.posicoes[i-1]);
                }

                const freq = new Map<number, number>();
                for (const intervalo of intervalos) {
                    freq.set(intervalo, (freq.get(intervalo) || 0) + 1);
                }

                let maxFreq = 0;
                let intervaloPrincipal = 0;
                for (const [intervalo, f] of freq) {
                    if (f > maxFreq) {
                        maxFreq = f;
                        intervaloPrincipal = intervalo;
                    }
                }

                const confianca = Math.min(75, 40 + (data.posicoes.length * 5));
                if (confianca > 50) {
                    this.padroes.push({
                        nome: `Ciclo do ${num}`,
                        tipo: 'ciclo',
                        valor: { numero: num, intervalo: intervaloPrincipal },
                        confianca: confianca,
                        ocorrencias: data.posicoes.length
                    });
                }
            }
        }
    }

    private detectarDuplas(): void {
        const duplas = new Map<string, number>();

        for (const jogo of this.dados) {
            for (let i = 0; i < jogo.length; i++) {
                for (let j = i + 1; j < jogo.length; j++) {
                    const key = `${Math.min(jogo[i], jogo[j])}-${Math.max(jogo[i], jogo[j])}`;
                    duplas.set(key, (duplas.get(key) || 0) + 1);
                }
            }
        }

        for (const [dupla, count] of duplas) {
            if (count > 2) {
                const confianca = Math.min(65, 30 + (count * 3));
                this.padroes.push({
                    nome: `Dupla ${dupla}`,
                    tipo: 'dupla',
                    valor: dupla.split('-').map(Number),
                    confianca: confianca,
                    ocorrencias: count
                });
            }
        }
    }

    private detectarIntervalos(): void {
        const intervalos = new Map<number, { count: number, total: number }>();

        for (let i = 1; i < this.dados.length; i++) {
            const diff = Math.abs(this.dados[i][0] - this.dados[i-1][0]);
            if (diff > 0) {
                if (!intervalos.has(diff)) {
                    intervalos.set(diff, { count: 0, total: 0 });
                }
                const data = intervalos.get(diff)!;
                data.count++;
                data.total++;
            }
        }

        for (const [intervalo, data] of intervalos) {
            const confianca = Math.min(70, (data.count / data.total) * 100);
            if (confianca > 50) {
                this.padroes.push({
                    nome: `Intervalo ${intervalo}`,
                    tipo: 'intervalo',
                    valor: intervalo,
                    confianca: confianca,
                    ocorrencias: data.count
                });
            }
        }
    }

    private detectarDezenas(): void {
        const dezenas = new Map<string, number>();

        for (const jogo of this.dados) {
            const faixas = jogo.map(n => Math.floor((n - 1) / 10) + 1);
            const key = faixas.sort().join('-');
            dezenas.set(key, (dezenas.get(key) || 0) + 1);
        }

        for (const [padrao, count] of dezenas) {
            if (count > 1) {
                const confianca = Math.min(60, 20 + (count * 5));
                if (confianca > 40) {
                    this.padroes.push({
                        nome: `Dezenas ${padrao}`,
                        tipo: 'dezenas',
                        valor: padrao.split('-').map(Number),
                        confianca: confianca,
                        ocorrencias: count
                    });
                }
            }
        }
    }

    private detectarRepeticoes(): void {
        const repeticoes = new Map<number, { count: number, ultimaVez: number }>();

        for (let i = 0; i < this.dados.length; i++) {
            for (const num of this.dados[i]) {
                if (!repeticoes.has(num)) {
                    repeticoes.set(num, { count: 0, ultimaVez: -1 });
                }
                const data = repeticoes.get(num)!;
                data.count++;
                if (data.ultimaVez !== -1 && i - data.ultimaVez < 3) {
                    const confianca = Math.min(70, 40 + (data.count * 2));
                    if (confianca > 50) {
                        this.padroes.push({
                            nome: `Repetição ${num}`,
                            tipo: 'repeticao',
                            valor: num,
                            confianca: confianca,
                            ocorrencias: data.count
                        });
                    }
                }
                data.ultimaVez = i;
            }
        }
    }

    getPadroes(): Pattern[] {
        return [...this.padroes];
    }

    getMelhoresPadroes(quantidade: number): Pattern[] {
        return this.padroes
            .sort((a, b) => b.confianca - a.confianca)
            .slice(0, quantidade);
    }

    getPadroesPorTipo(tipo: Pattern['tipo']): Pattern[] {
        return this.padroes.filter(p => p.tipo === tipo);
    }

    gerarNumerosPorPadrao(padrao: Pattern, quantidade: number, maxNumero: number): number[] {
        const numeros = new Set<number>();

        switch (padrao.tipo) {
            case 'ciclo': {
                const { numero, intervalo } = padrao.valor;
                const ultimo = this.dados[this.dados.length - 1][0];
                for (let i = 0; i < quantidade; i++) {
                    const num = ultimo + (intervalo * (i + 1));
                    if (num <= maxNumero) {
                        numeros.add(num);
                    }
                }
                break;
            }
            case 'dupla': {
                const [n1, n2] = padrao.valor;
                numeros.add(n1);
                numeros.add(n2);
                break;
            }
            case 'intervalo': {
                const ultimo = this.dados[this.dados.length - 1][0];
                for (let i = 0; i < quantidade; i++) {
                    const num = ultimo + (padrao.valor * (i + 1));
                    if (num <= maxNumero) {
                        numeros.add(num);
                    }
                }
                break;
            }
            case 'repeticao': {
                numeros.add(padrao.valor);
                break;
            }
            case 'dezenas': {
                const faixas = padrao.valor;
                for (const faixa of faixas) {
                    const min = (faixa - 1) * 10 + 1;
                    const max = Math.min(faixa * 10, maxNumero);
                    const num = Math.floor(Math.random() * (max - min + 1)) + min;
                    numeros.add(num);
                }
                break;
            }
        }

        while (numeros.size < quantidade) {
            const num = Math.floor(Math.random() * maxNumero) + 1;
            numeros.add(num);
        }

        return Array.from(numeros).sort((a, b) => a - b);
    }
}
