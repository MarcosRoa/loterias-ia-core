// ============================================
// CAMINHO: src/server.ts
// ============================================
// SERVIDOR PRINCIPAL - COM ROTA DE ESTATÍSTICAS
// ============================================

import express from 'express';
import cors from 'cors';
import { handleStatistics } from './routes/statistics';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ============================================
// ROTAS
// ============================================

// Health Check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'OK',
        service: 'Loteria IA Core + Statistics',
        timestamp: new Date().toISOString()
    });
});

// Estatísticas (NOVO)
app.get('/api/statistics', handleStatistics);

// Geração de jogos (já existe)
// app.post('/api/generate', handleGenerate);

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📊 /api/statistics disponível`);
});

// ============================================
// ENDPOINT PARA SERVIRE CSVs
// ============================================
app.get('/api/csv/:lottery', async (req, res) => {
    try {
        const { lottery } = req.params;
        const fs = require('fs');
        const path = require('path');
        
        // Caminho para o CSV no Railway (public/csv/)
        const csvPath = path.join(__dirname, '..', 'public', 'csv', `${lottery}.csv`);
        
        // Verificar se o arquivo existe
        if (!fs.existsSync(csvPath)) {
            return res.status(404).json({
                success: false,
                error: `CSV não encontrado: ${lottery}`
            });
        }
        
        // Ler o arquivo
        const content = fs.readFileSync(csvPath, 'utf8');
        
        // Processar CSV para JSON
        const linhas = content.split('\n').filter(l => l.trim());
        if (linhas.length < 2) {
            return res.status(400).json({
                success: false,
                error: 'CSV vazio ou inválido'
            });
        }
        
        const cabecalho = linhas[0].split(';');
        const dados = [];
        
        for (let i = 1; i < linhas.length; i++) {
            const colunas = linhas[i].split(';');
            const registro = {};
            cabecalho.forEach((key, index) => {
                registro[key.trim()] = colunas[index]?.trim() || '';
            });
            dados.push(registro);
        }
        
        res.json({
            success: true,
            lottery,
            total: dados.length,
            dados,
            cabecalho
        });
        
    } catch (error) {
        console.error('❌ Erro ao servir CSV:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Erro ao ler CSV'
        });
    }
});
