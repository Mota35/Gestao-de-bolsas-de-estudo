import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export function pageArgs(p: { page: number; pageSize: number }) {
  return { skip: (p.page - 1) * p.pageSize, take: p.pageSize };
}

export function pageMeta(p: { page: number; pageSize: number }, total: number) {
  return {
    page: p.page,
    pageSize: p.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / p.pageSize)),
  };
}
