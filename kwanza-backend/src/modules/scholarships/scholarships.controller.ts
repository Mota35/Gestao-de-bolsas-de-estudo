import { getQuery } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import type { ScholarshipsService } from './scholarships.service.js';

export function createScholarshipsController(s: ScholarshipsService) {
  return {
    list: asyncHandler(async (req, res) => {
      const { items, meta } = await s.listPublic(getQuery(req), req.user?.role === 'STUDENT' ? req.user.id : undefined);
      res.json({ data: items, meta });
    }),
    get: asyncHandler(async (req, res) => {
      const data = await s.getPublic(String(req.params.idOrSlug), req.user?.role === 'STUDENT' ? req.user.id : undefined);
      res.json({ data });
    }),

    // favoritos (estudante autenticado; o userId vem sempre da sessão)
    addFavorite: asyncHandler(async (req, res) => {
      await s.addFavorite(req.user!.id, String(req.params.id));
      res.status(204).end();
    }),
    removeFavorite: asyncHandler(async (req, res) => {
      await s.removeFavorite(req.user!.id, String(req.params.id));
      res.status(204).end();
    }),
    listFavorites: asyncHandler(async (req, res) => {
      const { items, meta } = await s.listFavorites(req.user!.id, getQuery(req));
      res.json({ data: items, meta });
    }),

    // administração
    adminList: asyncHandler(async (req, res) => {
      const { items, meta } = await s.listAdmin(getQuery(req));
      res.json({ data: items, meta });
    }),
    adminGet: asyncHandler(async (req, res) => {
      res.json({ data: await s.getAdmin(String(req.params.id)) });
    }),
    adminCreate: asyncHandler(async (req, res) => {
      res.status(201).json({ data: await s.create(req.user!.id, req.body) });
    }),
    adminUpdate: asyncHandler(async (req, res) => {
      res.json({ data: await s.update(req.user!.id, String(req.params.id), req.body) });
    }),
    adminTransition: asyncHandler(async (req, res) => {
      res.json({ data: await s.transition(req.user!.id, String(req.params.id), req.body.to) });
    }),
    adminVerify: asyncHandler(async (req, res) => {
      res.json({ data: await s.verify(req.user!.id, String(req.params.id), req.body.decision, req.body.note) });
    }),
    adminMarkChecked: asyncHandler(async (req, res) => {
      res.json({ data: await s.markChecked(req.user!.id, String(req.params.id)) });
    }),
  };
}
export type ScholarshipsController = ReturnType<typeof createScholarshipsController>;
