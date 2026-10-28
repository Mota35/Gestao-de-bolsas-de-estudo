import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../../db/prisma.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const messageSchema = z.object({
  name: z.string().trim().min(2).max(120), email: z.email(), category: z.string().trim().min(2).max(80),
  subject: z.string().trim().min(3).max(180), message: z.string().trim().min(10).max(4000), consent: z.literal(true),
}).strict();

export function createSupportRoutes(db: Db) {
  const r = Router();
  r.post('/', validate({ body: messageSchema }), asyncHandler(async (req, res) => {
    const { id, createdAt } = await db.supportMessage.create({ data: req.body, select: { id: true, createdAt: true } });
    res.status(201).json({ data: { id, createdAt, message: 'Pedido recebido.' } });
  }));
  return r;
}
