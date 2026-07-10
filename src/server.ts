//src/server.ts`

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import generateRoutes from './routes/generate';
import analyzeRoutes from './routes/analyze';
import predictRoutes from './routes/predict';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARES DE SEGURANÇA
// ============================================

app.use(helmet());

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  message: {
    success: false,
    error: 'Muitas requisições. Tente novamente mais tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// LOGS
// ============================================

app.use((req, res, next) => {
  console.log(`📝 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.method !== 'GET' && req.body) {
    console.log(`   Body:`, JSON.stringify(req.body).slice(0, 200));
  }
  next();
});

// ============================================
// ROTAS
// ============================================

app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    service: 'Loteria IA Core',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 API de IA para Loterias está rodando!',
    endpoints: {
      generate: '/api/generate',
      analyze: '/api/analyze',
      predict: '/api/predict',
      health: '/health'
    }
  });
});

app.use('/api/generate', generateRoutes);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/predict', predictRoutes);

// ============================================
// TRATAMENTO DE ERROS
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Rota não encontrada',
    path: req.path,
    availableEndpoints: ['/health', '/', '/api/generate', '/api/analyze', '/api/predict']
  });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Erro:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================
// INICIAR SERVIDOR
// ============================================

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
});
