// ======================
// src/middleware/auth.ts
// ======================

import { Request, Response, NextFunction } from 'express';

export function validateApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  
  if (!apiKey || apiKey !== process.env.API_SECRET_KEY) {
    return res.status(401).json({
      success: false,
      error: 'API Key inválida ou não fornecida'
    });
  }
  
  next();
}

export function validateLotteryType(req: Request, res: Response, next: NextFunction) {
  const { lotteryType } = req.body;
  const validLotteries = [
    'megasena', 'quina', 'lotofacil', 'lotomania', 
    'duplasena', 'timemania', 'milionaria', 
    'diadesorte', 'supersete'
  ];
  
  if (!lotteryType || !validLotteries.includes(lotteryType)) {
    return res.status(400).json({
      success: false,
      error: `Loteria inválida. Use: ${validLotteries.join(', ')}`
    });
  }
  
  next();
}

export function validateCount(req: Request, res: Response, next: NextFunction) {
  const { count = 1 } = req.body;
  
  if (count < 1 || count > 50) {
    return res.status(400).json({
      success: false,
      error: 'Quantidade deve ser entre 1 e 50'
    });
  }
  
  next();
}
