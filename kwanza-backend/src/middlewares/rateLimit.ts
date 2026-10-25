import rateLimit from 'express-rate-limit';
import type { RequestHandler } from 'express';
import type { AppConfig } from '../config/index.js';

const passthrough: RequestHandler = (_req, _res, next) => next();

function limiter(max: number, windowMs: number): RequestHandler {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Demasiados pedidos. Tente novamente mais tarde.',
          requestId: req.id,
        },
      });
    },
  });
}

export function createRateLimiters(config: AppConfig) {
  if (!config.rateLimit.enabled) {
    return { global: passthrough, auth: passthrough, sensitive: passthrough };
  }
  return {
    global: limiter(config.rateLimit.globalMax, config.rateLimit.globalWindowMs),
    // login, registo e recuperação de senha
    auth: limiter(config.rateLimit.authMax, config.rateLimit.authWindowMs),
    // acções sensíveis autenticadas (denúncias, alteração de senha, etc.)
    sensitive: limiter(Math.max(config.rateLimit.authMax * 2, 20), config.rateLimit.authWindowMs),
  };
}
