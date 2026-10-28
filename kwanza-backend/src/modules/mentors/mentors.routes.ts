import { Router } from 'express';
import type { AuthMiddlewares } from '../../middlewares/auth.js';
import { getQuery, validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import type { MentorsService } from './mentors.service.js';
import * as v from './mentors.validators.js';

export function createMentorsRoutes(s: MentorsService, mw: AuthMiddlewares) {
  const r = Router();

  // Perfil do próprio mentor (declarado antes de /:id)
  r.get('/me', mw.requireAuth, mw.requireRole('MENTOR'), asyncHandler(async (req, res) => {
    res.json({ data: await s.getOwn(req.user!.id) });
  }));
  r.patch('/me', mw.requireAuth, mw.requireRole('MENTOR'), validate({ body: v.updateMentorProfileSchema }), asyncHandler(async (req, res) => {
    res.json({ data: await s.updateOwn(req.user!.id, req.body) });
  }));
  r.post('/me/submit', mw.requireAuth, mw.requireRole('MENTOR'), asyncHandler(async (req, res) => {
    res.json({ data: await s.submitForVerification(req.user!.id) });
  }));
  r.put('/me/availability', mw.requireAuth, mw.requireRole('MENTOR'), validate({ body: v.availabilitySchema }), asyncHandler(async (req, res) => {
    res.json({ data: await s.saveAvailability(req.user!.id, req.body.period, req.body.schedule) });
  }));
  r.post('/me/photo', mw.requireAuth, mw.requireRole('MENTOR'), validate({ body: v.photoSchema }), asyncHandler(async (req, res) => {
    const profile = await s.savePhoto(req.user!.id, req.body.photoData);
    res.json({ data: { photo: profile.photo } });
  }));

  // Público: apenas mentores verificados
  r.get('/', validate({ query: v.listMentorsQuery }), asyncHandler(async (req, res) => {
    const { items, meta } = await s.listPublic(getQuery(req));
    res.json({ data: items, meta });
  }));
  r.get('/:id', validate({ params: v.idParams }), asyncHandler(async (req, res) => {
    res.json({ data: await s.getPublic(String(req.params.id)) });
  }));
  return r;
}

export function createAdminMentorsRoutes(s: MentorsService, mw: AuthMiddlewares) {
  const r = Router();
  r.use(mw.requireAuth, mw.requireRole('ADMIN'));
  r.get('/', validate({ query: v.adminListMentorsQuery }), asyncHandler(async (req, res) => {
    const { items, meta } = await s.listAdmin(getQuery(req));
    res.json({ data: items, meta });
  }));
  r.get('/:id', validate({ params: v.idParams }), asyncHandler(async (req, res) => {
    res.json({ data: await s.getAdmin(String(req.params.id)) });
  }));
  r.post('/:id/review', validate({ params: v.idParams, body: v.reviewMentorSchema }), asyncHandler(async (req, res) => {
    res.json({ data: await s.review(req.user!.id, String(req.params.id), req.body) });
  }));
  return r;
}
