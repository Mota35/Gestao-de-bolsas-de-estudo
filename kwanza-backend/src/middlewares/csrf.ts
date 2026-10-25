import type { RequestHandler } from 'express';
import type { AppConfig } from '../config/index.js';
import { AppError } from '../utils/errors.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Protecção CSRF para autenticação por cookie: em pedidos que alteram estado e trazem o cookie
 * de sessão, a origem (Origin, ou Referer como alternativa) tem de pertencer à lista autorizada.
 * Complementa SameSite; não depende apenas dele nem do CORS.
 */
export function csrfOriginCheck(config: AppConfig): RequestHandler {
  const allowed = new Set(config.corsOrigins);
  return (req, _res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();
    const hasSessionCookie = Boolean(
      req.cookies?.[config.auth.accessCookie] || req.cookies?.[config.auth.refreshCookie],
    );
    if (!hasSessionCookie) return next(); // sem cookie de sessão não há CSRF possível sobre a sessão
    const origin = req.header('origin');
    let candidate = origin;
    if (!candidate) {
      const referer = req.header('referer');
      try {
        candidate = referer ? new URL(referer).origin : undefined;
      } catch {
        candidate = undefined;
      }
    }
    if (!candidate || !allowed.has(candidate)) {
      return next(new AppError(403, 'CSRF_REJECTED', 'Origem do pedido não autorizada.'));
    }
    next();
  };
}
