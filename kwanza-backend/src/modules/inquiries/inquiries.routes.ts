import { Router } from 'express';
import type { RequestHandler } from 'express';
import type { AuthMiddlewares } from '../../middlewares/auth.js';
import { getQuery, validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import type { InquiriesService } from './inquiries.service.js';
import * as v from './inquiries.validators.js';

export function createInquiriesRoutes(s: InquiriesService, mw: AuthMiddlewares, sensitive: RequestHandler) {
  const r = Router();
  r.use(mw.requireAuth);
  r.post('/', mw.requireRole('STUDENT'), sensitive, validate({ body: v.createInquirySchema }), asyncHandler(async (req, res) => {
    res.status(201).json({ data: await s.create(req.user!.id, req.body) });
  }));
  r.get('/mine', mw.requireRole('STUDENT'), validate({ query: v.listInquiriesQuery }), asyncHandler(async (req, res) => {
    const { items, meta } = await s.listMine(req.user!.id, getQuery(req));
    res.json({ data: items, meta });
  }));
  r.get('/received', mw.requireRole('MENTOR'), validate({ query: v.listInquiriesQuery }), asyncHandler(async (req, res) => {
    const { items, meta } = await s.listReceived(req.user!.id, getQuery(req));
    res.json({ data: items, meta });
  }));
  r.patch('/:id/status', mw.requireRole('STUDENT', 'MENTOR'), validate({ params: v.idParams, body: v.updateInquiryStatusSchema }), asyncHandler(async (req, res) => {
    res.json({ data: await s.updateStatus(req.user!, String(req.params.id), req.body.status) });
  }));
  return r;
}
