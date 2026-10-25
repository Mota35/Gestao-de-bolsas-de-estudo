import { Router } from 'express';
import type { AuthMiddlewares } from '../../middlewares/auth.js';
import { getQuery, validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import type { CatalogKind, CatalogService } from './catalog.service.js';
import * as v from './catalog.validators.js';

/** Rotas de serviços de mentoria (/mentor-services) e cursos (/courses). */
export function createCatalogRoutes(kind: CatalogKind, s: CatalogService, mw: AuthMiddlewares) {
  const r = Router();
  const listQuery = kind === 'service' ? v.listServicesQuery : v.listCoursesQuery;
  const createSchema = kind === 'service' ? v.createServiceSchema : v.createCourseSchema;
  const updateSchema = kind === 'service' ? v.updateServiceSchema : v.updateCourseSchema;
  const mentorOnly = [mw.requireAuth, mw.requireRole('MENTOR')];

  // rotas do próprio mentor (antes de /:id)
  r.get('/mine', ...mentorOnly, validate({ query: v.mineQuery }), asyncHandler(async (req, res) => {
    const { items, meta } = await s.listMine(kind, req.user!.id, getQuery(req));
    res.json({ data: items, meta });
  }));
  r.post('/', ...mentorOnly, validate({ body: createSchema }), asyncHandler(async (req, res) => {
    res.status(201).json({ data: await s.create(kind, req.user!.id, req.body) });
  }));
  r.get('/mine/:id', ...mentorOnly, validate({ params: v.idParams }), asyncHandler(async (req, res) => {
    res.json({ data: await s.getMine(kind, req.user!.id, String(req.params.id)) });
  }));
  r.patch('/:id', ...mentorOnly, validate({ params: v.idParams, body: updateSchema }), asyncHandler(async (req, res) => {
    res.json({ data: await s.update(kind, req.user!.id, String(req.params.id), req.body) });
  }));
  r.post('/:id/status', ...mentorOnly, validate({ params: v.idParams, body: v.ownerStatusSchema }), asyncHandler(async (req, res) => {
    res.json({ data: await s.changeStatus(kind, req.user!.id, String(req.params.id), req.body.to) });
  }));

  // público
  r.get('/', validate({ query: listQuery }), asyncHandler(async (req, res) => {
    const { items, meta } = await s.listPublic(kind, getQuery(req));
    res.json({ data: items, meta });
  }));
  r.get('/:id', validate({ params: v.idParams }), asyncHandler(async (req, res) => {
    res.json({ data: await s.getPublic(kind, String(req.params.id)) });
  }));
  return r;
}
