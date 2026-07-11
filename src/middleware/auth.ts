// ============================================
// CAMINHO: src/middleware/auth.ts
// ============================================
// MIDDLEWARE DE AUTENTICAÇÃO - CORRIGIDO
// AGORA ACEITA 'lottery' E 'quantity' (nomes do frontend)
// ============================================

import { Request, Response, NextFunction } from 'express';

// ============================================
// VALIDAR API KEY
// ============================================
export function validateApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  
  if (!apiKey || apiKey !== process.env.API_SECRET_KEY) {
    console.warn('⚠️ API Key inválida ou não fornecida');
    return res.status(401).json({
      success: false,
      error: 'API Key inválida ou não fornecida'
    });
  }
  
  next();
}

// ============================================
// VALIDAR LOTERIA - CORRIGIDO
// ============================================
export function validateLotteryType(req: Request, res: Response, next: NextFunction) {
  // 🔥 ACEITAR 'lottery' (frontend) ou 'lotteryType' (fallback)
  const lottery = req.body.lottery || req.body.lotteryType;
  
  const validLotteries = [
    'megasena', 
    'quina', 
    'lotofacil', 
    'lotomania', 
    'duplasena', 
    'timemania', 
    'milionaria', 
    'diadesorte', 
    'supersete',
    'loteca'  // ← ADICIONADO
  ];
  
  if (!lottery) {
    return res.status(400).json({
      success: false,
      error: 'Loteria não informada. Use: lottery (ex: megasena)'
    });
  }
  
  if (!validLotteries.includes(lottery)) {
    return res.status(400).json({
      success: false,
      error: `Loteria inválida. Use: ${validLotteries.join(', ')}`
    });
  }
  
  // 🔥 SALVAR NO BODY PARA USO POSTERIOR
  req.body.lotteryType = lottery;
  
  next();
}

// ============================================
// VALIDAR QUANTIDADE - CORRIGIDO
// ============================================
export function validateCount(req: Request, res: Response, next: NextFunction) {
  // 🔥 ACEITAR 'quantity' (frontend) ou 'count' (fallback)
  const quantity = req.body.quantity || req.body.count || 1;
  
  if (quantity < 1 || quantity > 50) {
    return res.status(400).json({
      success: false,
      error: 'Quantidade deve ser entre 1 e 50'
    });
  }
  
  // 🔥 SALVAR NO BODY PARA USO POSTERIOR
  req.body.count = quantity;
  
  next();
}

// ============================================
// VALIDAR MÉTODO - CORRIGIDO
// ============================================
export function validateMethod(req: Request, res: Response, next: NextFunction) {
  const method = req.body.mode || req.body.method || 'hybrid';
  
  const validMethods = [
    'hybrid',
    'statistical',
    'specialist',
    'smartrandom',
    'probability',
    'predictive'
  ];
  
  if (!validMethods.includes(method)) {
    return res.status(400).json({
      success: false,
      error: `Método inválido. Use: ${validMethods.join(', ')}`
    });
  }
  
  req.body.method = method;
  
  next();
}
