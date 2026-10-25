import { Router } from 'express';
import { z } from 'zod';
import type { AuthMiddlewares } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { paginationSchema } from '../../utils/pagination.js';
import type { ScholarshipsController } from './scholarships.controller.js';
import * as v from './scholarships.validators.js';

export function createScholarshipsRoutes(c: ScholarshipsController, mw: AuthMiddlewares) {
  const r = Router();
  r.get('/', mw.optionalAuth, validate({ query: v.listScholarshipsQuery }), c.list);
  r.get('/:idOrSlug', mw.optionalAuth, validate({ params: v.idOrSlugParams }), c.get);
  return r;
}

/** Montado em /me/favorites — apenas estudantes. */
export function createFavoritesRoutes(c: ScholarshipsController, mw: AuthMiddlewares) {
  const r = Router();
  r.use(mw.requireAuth, mw.requireRole('STUDENT'));
  r.get('/', validate({ query: paginationSchema }), c.listFavorites);
  const params = z.object({ id: z.uuid() });
  r.put('/:id', validate({ params }), c.addFavorite);
  r.delete('/:id', validate({ params }), c.removeFavorite);
  return r;
}

/** Montado em /admin/scholarships — apenas administradores. */
export function createAdminScholarshipsRoutes(c: ScholarshipsController, mw: AuthMiddlewares) {
  const r = Router();
  r.use(mw.requireAuth, mw.requireRole('ADMIN'));
  const id = { params: v.idParams };
  r.get('/', validate({ query: v.adminListScholarshipsQuery }), c.adminList);
  r.post('/', validate({ body: v.createScholarshipSchema }), c.adminCreate);
  r.get('/:id', validate(id), c.adminGet);
  r.patch('/:id', validate({ ...id, body: v.updateScholarshipSchema }), c.adminUpdate);
  r.post('/:id/transition', validate({ ...id, body: v.transitionSchema }), c.adminTransition);
  r.post('/:id/verify', validate({ ...id, body: v.verifySchema }), c.adminVerify);
  r.post('/:id/mark-checked', validate(id), c.adminMarkChecked);
  return r;
}
