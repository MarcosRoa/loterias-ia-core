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
