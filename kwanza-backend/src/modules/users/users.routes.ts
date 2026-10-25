import { Router } from 'express';
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
  return r;
}
