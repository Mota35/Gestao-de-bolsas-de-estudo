import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

export const requestId: RequestHandler = (req, res, next) => {
  // Nunca confiamos num ID vindo do cliente sem validar formato.
  const incoming = req.header('x-request-id');
  req.id = incoming && /^[A-Za-z0-9-]{8,64}$/.test(incoming) ? incoming : randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
};
