import { Router } from 'express';
import type { RequestHandler } from 'express';
import type { AuthMiddlewares } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import type { IntegrationsService } from './integrations.service.js';
import * as v from './integrations.validators.js';

/** Todas as rotas de integrações e fontes exigem ADMIN. */
export function createIntegrationsRoutes(s: IntegrationsService, mw: AuthMiddlewares, sensitive: RequestHandler) {
  const r = Router();
  r.use(mw.requireAuth, mw.requireRole('ADMIN'));

  r.get('/sources', asyncHandler(async (_req, res) => res.json({ data: await s.listSources() })));
  r.post('/sources', validate({ body: v.createSourceSchema }), asyncHandler(async (req, res) => {
    res.status(201).json({ data: await s.createSource(req.user!.id, req.body) });
  }));
  r.patch('/sources/:id', validate({ params: v.idParams, body: v.updateSourceSchema }), asyncHandler(async (req, res) => {
    res.json({ data: await s.updateSource(req.user!.id, String(req.params.id), req.body) });
  }));

  r.get('/integrations', asyncHandler(async (_req, res) => res.json({ data: await s.listConnectors() })));
  r.post('/integrations/:key/import', sensitive, validate({ params: v.keyParams }), asyncHandler(async (req, res) => {
    res.json({ data: await s.runImport(req.user!.id, String(req.params.key)) });
  }));
  r.post('/integrations/:key/manual', validate({ params: v.keyParams, body: v.manualEntrySchema }), asyncHandler(async (req, res) => {
    res.status(201).json({ data: await s.manualEntry(req.user!.id, String(req.params.key), req.body) });
  }));

  // revisão de alterações externas pendentes
  r.get('/scholarships/:id/source-changes', validate({ params: v.idParams }), asyncHandler(async (req, res) => {
    res.json({ data: await s.listPendingChanges(String(req.params.id)) });
  }));
  r.post('/scholarships/:id/source-changes/:linkId/apply', validate({ params: v.pendingParams }), asyncHandler(async (req, res) => {
    res.json({ data: await s.applyPendingChanges(req.user!.id, String(req.params.id), String(req.params.linkId)) });
  }));
  r.post('/scholarships/:id/source-changes/:linkId/dismiss', validate({ params: v.pendingParams }), asyncHandler(async (req, res) => {
    await s.dismissPendingChanges(req.user!.id, String(req.params.id), String(req.params.linkId));
    res.status(204).end();
  }));
  return r;
}
