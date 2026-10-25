import { Router } from 'express';
import type { RequestHandler } from 'express';
import type { AuthMiddlewares } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import type { ReportsService } from './reports.service.js';
import { createReportSchema } from './reports.validators.js';

/** Qualquer utilizador autenticado (com email confirmado) pode denunciar. */
export function createReportsRoutes(s: ReportsService, mw: AuthMiddlewares, sensitive: RequestHandler) {
  const r = Router();
  r.post('/', mw.requireAuth, mw.requireVerifiedEmail, sensitive, validate({ body: createReportSchema }), asyncHandler(async (req, res) => {
    res.status(201).json({ data: await s.create(req.user!.id, req.body) });
  }));
  return r;
}
