import { Router } from 'express';
import { z } from 'zod';
import type { AuthMiddlewares } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import type { UsersService } from './users.service.js';
import { updateMeSchema } from './users.validators.js';

export function createUsersRoutes(service: UsersService, mw: AuthMiddlewares) {
  const r = Router();
  r.use(mw.requireAuth);
  r.get('/me', asyncHandler(async (req, res) => {
    res.json({ data: await service.getMe(req.user!.id) });
  }));
  r.patch('/me', validate({ body: updateMeSchema }), asyncHandler(async (req, res) => {
    res.json({ data: await service.updateMe(req.user!.id, req.body, req.user!.role) });
  }));
  r.get('/me/preferences', mw.requireRole('STUDENT'), asyncHandler(async (req, res) => {
    res.json({ data: await service.getPreferences(req.user!.id) });
  }));
  r.put('/me/preferences', mw.requireRole('STUDENT'), validate({ body: z.object({
    language: z.enum(['pt', 'en']), notifyOpportunities: z.boolean(), notifyDeadlines: z.boolean(),
    notifyCourses: z.boolean(), notifyOptional: z.boolean(), allowSuggestions: z.boolean(),
  }).strict() }), asyncHandler(async (req, res) => {
    res.json({ data: await service.savePreferences(req.user!.id, req.body) });
  }));
  r.post('/me/data-requests', mw.requireRole('STUDENT'), validate({ body: z.object({ kind: z.enum(['copia', 'eliminacao']) }).strict() }), asyncHandler(async (req, res) => {
    res.status(201).json({ data: await service.requestData(req.user!.id, req.body.kind) });
  }));
  r.get('/me/recommendations', mw.requireRole('STUDENT'), asyncHandler(async (req, res) => {
    res.json({ data: await service.recommendations(req.user!.id) });
  }));
  return r;
}
