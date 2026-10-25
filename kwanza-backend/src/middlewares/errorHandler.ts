import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { Logger } from 'pino';
import { AppError } from '../utils/errors.js';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Rota não encontrada.', requestId: req.id },
  });
};

export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (err, req, res, _next) => {
    if (err instanceof AppError) {
      if (err.status >= 500) logger.error({ err, requestId: req.id }, 'Erro de aplicação');
      res.status(err.status).json({
        error: { code: err.code, message: err.message, details: err.details, requestId: req.id },
      });
      return;
    }
    // body-parser / JSON malformado / payload excessivo
    const e = err as { type?: string; status?: number };
    if (e.type === 'entity.too.large') {
      res.status(413).json({
        error: { code: 'PAYLOAD_TOO_LARGE', message: 'Pedido demasiado grande.', requestId: req.id },
      });
      return;
    }
    if (e.type === 'entity.parse.failed') {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'JSON inválido.', requestId: req.id },
      });
      return;
    }
    // Erro inesperado: registar internamente, resposta genérica ao cliente.
    logger.error({ err, requestId: req.id }, 'Erro não tratado');
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Ocorreu um erro interno.', requestId: req.id },
    });
  };
}
